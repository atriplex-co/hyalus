import { idbGet, idbSet } from "./idb";
import { iceServers, RTCMaxMessageSize } from "./config";
import sodium from "libsodium-wrappers";
import {
  CallRTCDataType,
  CallStreamType,
  ColorTheme,
  SocketMessageType,
} from "common";
import RnnoiseWasm from "@atriplex-co/hyalus-rnnoise/dist/rnnoise.wasm?url";
import RnnoiseWorker from "../shared/rnnoiseWorker?worker";
import SoundStateUp from "../assets/sounds/state-change_confirm-up.ogg";
import SoundStateDown from "../assets/sounds/state-change_confirm-down.ogg";
import SoundNavigateBackward from "../assets/sounds/navigation_backward-selection.ogg";
import SoundNavigateBackwardMin from "../assets/sounds/navigation_backward-selection-minimal.ogg";
import SoundNavigateForward from "../assets/sounds/navigation_forward-selection.ogg";
import SoundNavigateForwardMin from "../assets/sounds/navigation_forward-selection-minimal.ogg";
import {
  ICallLocalStream,
  ICallLocalStreamPeer,
  ICallRTCData,
  IConfig,
  IState,
  SideBarContent,
} from "./types";
import {
  callUpdatePersist,
  getWorkerUrl,
  playSound,
  updateIcon,
} from "./helpers";
import { Socket } from "./socket";
import { createPinia, defineStore } from "pinia";
import axios from "axios";

export const useStore = defineStore("main", {
  state(): IState {
    return {
      ready: false,
      away: false,
      config: {
        colorTheme: ColorTheme.Green,
        fontScale: 100,
        grayscale: false,
        adaptiveLayout: false,
        audioOutput: "default",
        audioInput: "default",
        videoInput: "default",
        videoMode: "720p60",
        audioOutputGain: 100,
        audioInputGain: 100,
        audioInputTrigger: 60,
        voiceRtcEcho: true,
        voiceRtcGain: true,
        voiceRtcNoise: true,
        voiceRnnoise: true,
        notifySound: true,
        notifySystem: true,
        betaBanner: true,
        searchKeys: "",
        openAppKeys: "",
        toggleMuteKeys: "",
        toggleDeafenKeys: "",
        joinCallKeys: "",
        leaveCallKeys: "",
        openCurrentCallKeys: "",
        uploadFileKeys: "",
      },
      updateAvailable: false,
      updateRequired: false,
      sessions: [],
      friends: [],
      channels: [],
      sideBarOpen: true,
      sideBarContent: SideBarContent.NONE,
    };
  },
  actions: {
    async start(): Promise<void> {
      this.config = {
        ...this.config,
        ...((await idbGet("config")) as IConfig),
      };

      await updateIcon();

      if (!this.config.token) {
        return;
      }

      await sodium.ready;

      (
        axios.defaults.headers as {
          authorization?: string;
        }
      )["authorization"] = sodium.to_base64(this.config.token);

      this.socket = new Socket();
    },
    async writeConfig(k: string, v: unknown): Promise<unknown> {
      this.config = (await idbSet("config", {
        ...this.config,
        [k]: v,
      })) as IConfig;

      if (k === "colorTheme") {
        await updateIcon();
      }

      if (k === "audioOutput" && this.call) {
        for (const stream of this.call.remoteStreams) {
          stream.element.setSinkId(this.config.audioOutput);
        }
      }

      if (k === "audioOutputGain" && this.call) {
        for (const stream of this.call.remoteStreams) {
          if (stream.gain) {
            stream.gain.gain.value = this.config.audioOutputGain / 100;
          }
        }
      }

      if (
        [
          "audioInput",
          "voiceRtcEcho",
          "voiceRtcGain",
          "voiceRtcNoise",
          "voiceRnnoise",
        ].includes(k) &&
        this.call &&
        this.call.localStreams.find(
          (stream) => stream.type === CallStreamType.Audio
        )
      ) {
        await this.callRemoveLocalStream({
          type: CallStreamType.Audio,
          silent: true,
        });
        await this.callAddLocalStream({
          type: CallStreamType.Audio,
          silent: true,
        });
      }

      if (
        k === "videoInput" &&
        this.call &&
        this.call.localStreams.find(
          (stream) => stream.type === CallStreamType.Audio
        )
      ) {
        await this.callRemoveLocalStream({
          type: CallStreamType.Video,
          silent: true,
        });
        await this.callAddLocalStream({
          type: CallStreamType.Video,
          silent: true,
        });
      }

      return v;
    },
    async callSendLocalStream(
      stream: ICallLocalStream,
      userId: string
    ): Promise<void> {
      const channel = this.channels.find(
        (channel) => channel.id === this.call?.channelId
      );

      if (!channel) {
        console.warn("callSendLocalStream missing channel");
        return;
      }

      const user = channel.users.find((user) => user.id === userId);

      if (!user) {
        console.warn("callSendLocalStream missing user");
        return;
      }

      if (stream.peers.find((peer) => peer.userId === userId)) {
        console.warn("callSendLocalStream already has localStream peer");
        return;
      }

      const send = (val: unknown) => {
        const jsonRaw = JSON.stringify(val);
        const json = JSON.parse(jsonRaw) as ICallRTCData;
        console.debug("c_rtc/tx: %o", {
          ...json,
          mt: CallRTCDataType[json.mt],
          st: CallStreamType[json.st],
          userId,
        }); // yes, there's a reason for this.
        const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

        this.socket?.send({
          t: SocketMessageType.CCallRTC,
          d: {
            userId,
            data: sodium.to_base64(
              new Uint8Array([
                ...nonce,
                ...sodium.crypto_box_easy(
                  JSON.stringify(val),
                  nonce,
                  user.publicKey,
                  this.config.privateKey as unknown as Uint8Array
                ),
              ])
            ),
          },
        });
      };

      const reset = async () => {
        if (
          this.ready &&
          this.call &&
          stream.track.readyState === "live" &&
          this.channels
            .find((channel) => channel.id === this.call?.channelId)
            ?.users.find((user) => user.id === userId)?.inCall &&
          !stream.peers.find((peer2) => peer2.userId === peer.userId)
        ) {
          await this.callSendLocalStream(stream, userId);
        }
      };

      const pc = new RTCPeerConnection({ iceServers });
      const dc = pc.createDataChannel("", {
        // maxRetransmits: -1,
        // ordered: false,
      });
      const peer: ICallLocalStreamPeer = {
        userId,
        pc,
        dc,
      };

      stream.peers.push(peer);

      pc.addEventListener("icecandidate", ({ candidate }) => {
        if (!candidate) {
          return;
        }

        send({
          mt: CallRTCDataType.RemoteTrackICECandidate,
          st: stream.type,
          d: JSON.stringify(candidate),
        });
      });

      pc.addEventListener("connectionstatechange", async () => {
        console.debug(`c_rtc/peer: ${pc.connectionState}`);

        if (pc.connectionState === "failed") {
          await reset();
        }
      });

      dc.addEventListener("open", () => {
        stream.requestKeyFrame = true;
      });

      dc.addEventListener("message", () => {
        stream.requestKeyFrame = true;
      });

      dc.addEventListener("close", async () => {
        console.debug("c_rtc/dc: localStream close");
        pc.close();

        stream.peers = stream.peers.filter((peer2) => peer2.pc !== peer.pc);

        await new Promise((resolve) => {
          setTimeout(resolve, 1000); //idk why but this works.
        });

        await reset();
      });

      await pc.setLocalDescription(await pc.createOffer());

      send({
        mt: CallRTCDataType.RemoteTrackOffer,
        st: stream.type,
        d: pc.localDescription?.sdp,
      });
    },
    async callAddLocalStream(opts: {
      type: CallStreamType;
      track?: MediaStreamTrack;
      silent?: boolean;
      procOverride?: boolean;
    }): Promise<ICallLocalStream | undefined> {
      if (!this.call) {
        console.warn("callAddLocalStream missing call");
        return;
      }

      let stream: ICallLocalStream | undefined = undefined;
      let context: AudioContext | undefined = undefined;
      let gain: GainNode | undefined = undefined;
      let gain2: GainNode | undefined = undefined;

      if (!opts.track && opts.type === CallStreamType.Audio) {
        const _stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: {
              ideal: this.config.audioInput,
            },
            autoGainControl: this.config.voiceRtcGain,
            noiseSuppression:
              !this.config.voiceRnnoise && this.config.voiceRtcNoise,
            echoCancellation:
              !this.config.voiceRnnoise && this.config.voiceRtcEcho,
          }, // TS is stupid here and complains.
        });

        context = new AudioContext();
        gain = context.createGain();
        gain2 = context.createGain();
        const src = context.createMediaStreamSource(_stream);
        const dest = context.createMediaStreamDestination();
        const analyser = context.createAnalyser();
        const analyserData = new Uint8Array(analyser.frequencyBinCount);
        let closeTimeout: number;

        await context.audioWorklet.addModule(getWorkerUrl(RnnoiseWorker));
        const worklet = new AudioWorkletNode(context, "rnnoise-processor", {
          processorOptions: {
            wasm: this.config.voiceRnnoise
              ? new Uint8Array(
                  (
                    await axios.get(RnnoiseWasm, {
                      responseType: "arraybuffer",
                    })
                  ).data
                )
              : undefined,
          },
        });

        worklet.port.onmessage = () => {
          analyser.getByteFrequencyData(analyserData);

          if (
            stream &&
            gain2 &&
            analyserData.reduce((a, b) => a + b) / analyserData.length >
              this.config.audioInputTrigger / 10
          ) {
            gain2.gain.value = 1;
            stream.speaking = true;

            clearTimeout(closeTimeout);
            closeTimeout = +setTimeout(() => {
              if (stream && gain2) {
                gain2.gain.value = 0;
                stream.speaking = false;
              } // this is irritating.
            }, 200);
          }
        };

        gain.gain.value = this.config.audioInputGain / 100;
        gain2.gain.value = 0;

        src.connect(gain);
        gain.connect(worklet);
        worklet.connect(analyser);
        worklet.connect(gain2);
        gain2.connect(dest);

        opts.track = dest.stream.getTracks()[0];
      }

      if (!opts.track && opts.type === CallStreamType.Video) {
        const [height, frameRate] = this.config.videoMode.split("p");

        opts.track = (
          await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: this.config.videoInput,
              height: +height,
              frameRate: +frameRate,
            },
          })
        ).getTracks()[0];
      }

      if (!opts.track && opts.type === CallStreamType.DisplayVideo) {
        const height = +this.config.videoMode.split("p")[0];
        const fps = +this.config.videoMode.split("p")[1];
        const width = {
          360: 640,
          480: 854,
          720: 1280,
          900: 1600,
          1080: 1920,
        }[height];

        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width,
            height,
            frameRate: fps,
          },
          audio: {
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
          } as unknown as MediaTrackConstraints, // TS is stupid here and complains.
        });

        for (const track of stream.getTracks()) {
          await this.callAddLocalStream({
            type:
              track.kind === "video"
                ? CallStreamType.DisplayVideo
                : CallStreamType.DisplayAudio,
            track,
            silent: track.kind !== "video",
          });
        }
      }

      if (!opts.track) {
        console.warn("callAddLocalStream missing track");
        return;
      }

      const channel = this.channels.find(
        (channel) => channel.id === this.call?.channelId
      );

      if (!channel) {
        return;
      }

      const txBuffer = new Uint8Array(2 * 1024 * 1024);
      let decoderConfig = "";

      const encoderInit = {
        output(chunk: EncodedMediaChunk, info: MediaEncoderOutputInfo) {
          if (!stream) {
            return;
          }

          if (info.decoderConfig) {
            decoderConfig = JSON.stringify({
              ...info.decoderConfig,
              description:
                info.decoderConfig.description &&
                sodium.to_base64(
                  new Uint8Array(info.decoderConfig.description)
                ),
            });
          }

          chunk.copyTo(txBuffer);

          for (const peer of stream.peers) {
            if (peer.dc.readyState !== "open") {
              continue;
            }

            try {
              for (let i = 0; i < chunk.byteLength; i += RTCMaxMessageSize) {
                peer.dc.send(
                  new Uint8Array(
                    txBuffer.buffer,
                    i,
                    Math.min(RTCMaxMessageSize, chunk.byteLength - i)
                  )
                );
              }

              peer.dc.send(
                JSON.stringify({
                  type: chunk.type,
                  timestamp: chunk.timestamp,
                  duration: chunk.duration,
                  decoderConfig,
                  speaking: gain2 && !!gain2.gain.value,
                })
              );
            } catch {
              //
            }
          }
        },
        error() {
          //
        },
      };

      let encoder!: MediaEncoder;

      if (opts.track.kind === "audio") {
        encoder = new AudioEncoder(encoderInit);
      }

      if (opts.track.kind === "video") {
        encoder = new VideoEncoder(encoderInit);
      }

      let lastWidth = 0;
      let lastHeight = 0;

      const proc = async (
        data: MediaData,
        writer?: WritableStreamDefaultWriter<MediaData>
      ) => {
        if (!stream) {
          return;
        }

        if (encoder.encodeQueueSize > 32) {
          console.log("dropping frame @ encoder");
          data.close();
          return;
        }

        if (data instanceof AudioData && encoder.state === "unconfigured") {
          encoder.configure({
            codec: "opus",
            bitrate: 128e3,
            sampleRate: 48000,
            numberOfChannels: 2,
          });
        }

        if (
          data instanceof VideoFrame &&
          (encoder.state === "unconfigured" ||
            lastWidth !== data.codedWidth ||
            lastHeight !== data.codedHeight)
        ) {
          const maxScaledHeight = +this.config.videoMode.split("p")[0];
          const maxScaledWidth =
            {
              360: 640,
              480: 854,
              720: 1280,
              1080: 1920,
            }[maxScaledHeight] || maxScaledHeight;
          const maxFps = +this.config.videoMode.split("p")[1];

          let scaledWidth = data.codedWidth;
          let scaledHeight = data.codedHeight;

          if (scaledWidth > maxScaledWidth) {
            scaledHeight = Math.floor(
              scaledHeight * (maxScaledWidth / scaledWidth)
            );
            scaledWidth = maxScaledWidth;
          }

          if (scaledHeight > maxScaledHeight) {
            scaledWidth = Math.floor(
              scaledWidth * (maxScaledHeight / scaledHeight)
            );
            scaledHeight = maxScaledHeight;
          }

          encoder.configure({
            // codec: "avc1.42e01f",
            // codec: "avc1.42001f",
            codec: "avc1.4d001f",
            // codec: "avc1.64001f",
            // codec: "vp8",
            // codec: "vp09.00.41.08",
            width: Math.floor(scaledWidth / 2) * 2,
            height: Math.floor(scaledHeight / 2) * 2,
            framerate: 1,
            latencyMode: "realtime",
            hardwareAcceleration: "prefer-hardware",
            bitrate:
              ({
                ["480p30"]: 3000000,
                ["480p60"]: 3000000,
                ["720p30"]: 3000000,
                ["720p60"]: 4500000,
                ["1080p30"]: 4500000,
                ["1080p60"]: 6000000,
                // ["480p30"]: 2500000,
                // ["480p60"]: 4000000,
                // ["720p30"]: 5000000,
                // ["720p60"]: 7500000,
                // ["1080p30"]: 8000000,
                // ["1080p60"]: 12000000,
                // ["480p30"]: 3000000,
                // ["480p60"]: 3500000,
                // ["720p30"]: 4000000,
                // ["720p60"]: 6000000,
                // ["1080p30"]: 6000000,
                // ["1080p60"]: 8000000,
              }[this.config.videoMode] || 3000000) / maxFps,
            avc: {
              format: "annexb",
            },
          });

          lastWidth = data.codedWidth;
          lastHeight = data.codedHeight;
        }

        try {
          encoder.encode(data, {
            keyFrame: stream.requestKeyFrame,
          });

          stream.requestKeyFrame = false;
        } catch (e) {
          console.log(e);
        }

        if (writer && document.visibilityState === "visible") {
          writer.write(data);
        } else {
          data.close();
        }
      };

      stream =
        this.call.localStreams[
          this.call.localStreams.push({
            type: opts.type,
            track: opts.track,
            peers: [],
            encoder,
            proc,
            context,
            gain,
            gain2,
            speaking: false,
          }) - 1
        ]; // keeps things reactive.

      if (!opts.silent) {
        playSound(SoundNavigateForward);
      }

      await callUpdatePersist();

      for (const user of channel.users.filter((user) => user.inCall)) {
        await this.callSendLocalStream(stream, user.id);
      }

      opts.track.addEventListener("ended", async () => {
        if (!stream) {
          return;
        }

        await this.callRemoveLocalStream({
          type: stream.type,
        });
      });

      if (!opts.procOverride) {
        // allows us to return and throw this somewhere else on the event loop.
        (async () => {
          const reader = new MediaStreamTrackProcessor({
            track: opts.track as MediaStreamTrack,
          }).readable.getReader();

          for (;;) {
            const { value } = await reader.read();

            if (!value) {
              break;
            }

            await proc(value);
          }
        })();
      }

      return stream;
    },
    async callRemoveLocalStream(opts: {
      type: CallStreamType;
      silent?: boolean;
    }): Promise<void> {
      if (!this.call) {
        console.warn("callRemoveLocalStream missing call");
        return;
      }

      const stream = this.call.localStreams.find(
        (stream) => stream.type === opts.type
      );

      if (!stream) {
        console.warn("callRemoveLocalStream missing stream");
        return;
      }

      this.call.localStreams = this.call.localStreams.filter(
        (stream2) => stream2 !== stream
      );

      stream.track.stop();
      stream.encoder.close();

      if (stream.context) {
        stream.context.close();
      }

      for (const { pc } of stream.peers) {
        pc.close();
      }

      if (opts.type === CallStreamType.DisplayVideo) {
        window.HyalusDesktop?.stopWin32Capture();
      }

      if (
        opts.type === CallStreamType.DisplayVideo &&
        this.call?.localStreams.find(
          (stream) => stream.type === CallStreamType.DisplayAudio
        )
      ) {
        await this.callRemoveLocalStream({
          type: CallStreamType.DisplayAudio,
          silent: true,
        });
      }

      if (!opts.silent) {
        playSound(SoundNavigateBackward);
      }

      await callUpdatePersist();
    },
    async callStart(channelId: string): Promise<void> {
      this.call = {
        channelId,
        localStreams: [],
        remoteStreams: [],
        start: new Date(),
        deaf: false,
        updatePersistInterval: +setInterval(callUpdatePersist, 1000 * 30),
      };

      this.socket?.send({
        t: SocketMessageType.CCallStart,
        d: {
          channelId,
        },
      });

      playSound(SoundStateUp);

      await callUpdatePersist();
    },
    async callReset(): Promise<void> {
      if (!this.call) {
        return;
      }

      for (const stream of this.call.localStreams) {
        stream.track.stop();

        for (const peer of stream.peers) {
          peer.pc.close();
        }
      }

      for (const stream of this.call.remoteStreams) {
        stream.pc.close();
      }

      clearInterval(this.call.updatePersistInterval);

      delete this.call;

      playSound(SoundStateDown);

      await callUpdatePersist();
    },
    async callSetDeaf(val: boolean) {
      if (!this.call) {
        return;
      }

      for (const stream of this.call.remoteStreams) {
        stream.element.volume = val ? 0 : 1;
      }

      this.call.deaf = val;

      playSound(val ? SoundNavigateBackwardMin : SoundNavigateForwardMin);
    },
  },
});

export const pinia = createPinia();

export const store = useStore(pinia);
