import { ref } from "vue";
import { idbGet, idbSet } from "./idb";
import { iceServers, RTCMaxMessageSize } from "./config";
import sodium from "libsodium-wrappers";
import {
  CallRTCDataType,
  CallStreamType,
  ColorTheme,
  SocketMessageType,
} from "common";
import RnnoiseWasm from "@hyalusapp/rnnoise/rnnoise.wasm?url";
import RnnoiseWorker from "../shared/rnnoiseWorker?worker";
import SoundStateUp from "../assets/sounds/state-change_confirm-up.ogg";
import SoundStateDown from "../assets/sounds/state-change_confirm-down.ogg";
import SoundNavigateBackward from "../assets/sounds/navigation_backward-selection.ogg";
import SoundNavigateBackwardMin from "../assets/sounds/navigation_backward-selection-minimal.ogg";
import SoundNavigateForward from "../assets/sounds/navigation_forward-selection.ogg";
import SoundNavigateForwardMin from "../assets/sounds/navigation_forward-selection-minimal.ogg";
import {
  ICallLocalStream,
  ICallLocalStreamConfig,
  ICallLocalStreamPeer,
  ICallRTCData,
  IConfig,
  IHTMLAudioElement,
  IState,
  SideBarContent,
} from "./types";
import { axios, callUpdatePersist, getWorkerUrl, playSound } from "./helpers";
import { Socket } from "./socket";

export const store = {
  state: ref<IState>({
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
      startMinimized: true,
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
  }),
  async start(): Promise<void> {
    this.state.value.config = {
      ...this.state.value.config,
      ...((await idbGet("config")) as IConfig),
    };

    await this.updateIcon();

    if (
      this.state.value.config.startMinimized &&
      window.HyalusDesktop &&
      window.HyalusDesktop.getWasOpenedAtLogin &&
      (await window.HyalusDesktop.getWasOpenedAtLogin())
    ) {
      window.HyalusDesktop.minimize();
    }

    if (!this.state.value.config.token) {
      return;
    }

    await sodium.ready;

    (
      axios.defaults.headers as {
        authorization?: string;
      }
    )["authorization"] = sodium.to_base64(this.state.value.config.token);

    this.state.value.socket = new Socket();
  },
  async writeConfig(k: string, v: unknown): Promise<unknown> {
    this.state.value.config = (await idbSet("config", {
      ...this.state.value.config,
      [k]: v,
    })) as IConfig;

    if (k === "colorTheme") {
      await this.updateIcon();
    }

    if (k === "audioOutput" && this.state.value.call) {
      for (const stream of this.state.value.call.remoteStreams) {
        if (stream.config?.el) {
          (stream.config.el as IHTMLAudioElement).setSinkId(
            this.state.value.config.audioOutput
          );
        }
      }
    }

    if (k === "audioOutputGain" && this.state.value.call) {
      for (const stream of this.state.value.call.remoteStreams) {
        if (stream.config?.gain) {
          stream.config.gain.gain.value =
            this.state.value.config.audioOutputGain / 100;
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
      ].indexOf(k) !== -1 &&
      this.state.value.call &&
      this.state.value.call.localStreams.find(
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
      this.state.value.call &&
      this.state.value.call.localStreams.find(
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
  async updateIcon(): Promise<void> {
    (document.querySelector("link[rel='icon']") as HTMLLinkElement).href = (
      await import(
        `../assets/images/icon-standalone-${ColorTheme[
          this.state.value.config.colorTheme
        ].toLowerCase()}.png`
      )
    ).default;
  },
  async callSendLocalStream(
    stream: ICallLocalStream,
    userId: string
  ): Promise<void> {
    const channel = store.state.value.channels.find(
      (channel) => channel.id === store.state.value.call?.channelId
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

      this.state.value.socket?.send({
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
                store.state.value.config.privateKey as unknown as Uint8Array
              ),
            ])
          ),
        },
      });
    };

    const reset = async () => {
      if (
        store.state.value.ready &&
        store.state.value.call &&
        stream.track.readyState === "live" &&
        store.state.value.channels
          .find((channel) => channel.id === store.state.value.call?.channelId)
          ?.users.find((user) => user.id === userId)?.inCall &&
        !stream.peers.find((peer2) => peer2.userId === peer.userId)
      ) {
        await this.callSendLocalStream(stream, userId);
      }
    };

    const pc = new RTCPeerConnection({ iceServers });
    const dc = pc.createDataChannel("", {
      // maxRetransmits: 0,
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
      stream.config.requestKeyFrame = true;
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
    config?: ICallLocalStreamConfig;
    procOverride?: boolean;
  }): Promise<ICallLocalStream | undefined> {
    if (!store.state.value.call) {
      console.warn("callAddLocalStream missing call");
      return;
    }

    if (!opts.config) {
      opts.config = {};
    }

    if (!opts.track && opts.type === CallStreamType.Audio) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: {
            ideal: this.state.value.config.audioInput,
          },
          autoGainControl: this.state.value.config.voiceRtcGain,
          noiseSuppression:
            !this.state.value.config.voiceRnnoise &&
            this.state.value.config.voiceRtcNoise,
          echoCancellation:
            !this.state.value.config.voiceRnnoise &&
            this.state.value.config.voiceRtcEcho,
        }, // TS is stupid here and complains.
      });

      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const dest = ctx.createMediaStreamDestination();
      const gain = ctx.createGain();
      const gain2 = ctx.createGain();
      const analyser = ctx.createAnalyser();
      const analyserData = new Uint8Array(analyser.frequencyBinCount);
      let closeTimeout: number;

      await ctx.audioWorklet.addModule(getWorkerUrl(RnnoiseWorker));
      const worklet = new AudioWorkletNode(ctx, "rnnoise-processor", {
        processorOptions: {
          wasm: this.state.value.config.voiceRnnoise
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
          analyserData.reduce((a, b) => a + b) / analyserData.length >
          this.state.value.config.audioInputTrigger / 10
        ) {
          gain2.gain.value = 1;

          if (closeTimeout) {
            clearTimeout(closeTimeout);
          }

          closeTimeout = +setTimeout(() => {
            gain2.gain.value = 0;
          }, 200);
        }

        gain.gain.value = this.state.value.config.audioInputGain / 100;
      };

      gain2.gain.value = 0;

      src.connect(gain);
      gain.connect(worklet);
      worklet.connect(analyser);
      worklet.connect(gain2);
      gain2.connect(dest);

      opts.track = dest.stream.getTracks()[0];

      const _stop = opts.track.stop.bind(opts.track);
      opts.track.stop = () => {
        _stop();
        stream.getTracks()[0].stop();
        ctx.close();
      };

      opts.config = {
        gain,
      };
    }

    if (!opts.track && opts.type === CallStreamType.Video) {
      const [height, frameRate] = this.state.value.config.videoMode.split("p");

      opts.track = (
        await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: this.state.value.config.videoInput,
            height: +height,
            frameRate: +frameRate,
          },
        })
      ).getTracks()[0];
    }

    if (!opts.track && opts.type === CallStreamType.DisplayVideo) {
      const [height, frameRate] = this.state.value.config.videoMode.split("p");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          height: +height,
          frameRate: +frameRate,
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

    const channel = store.state.value.channels.find(
      (channel) => channel.id === store.state.value.call?.channelId
    );

    if (!channel) {
      return;
    }

    if (!opts.silent) {
      playSound(SoundNavigateForward);
    }

    await callUpdatePersist();

    const track = opts.track as MediaStreamTrack;

    const txBuffer = new Uint8Array(2 * 1024 * 1024);
    let decoderConfig = "";

    const encoderInit = {
      output(chunk: EncodedMediaChunk, info: MediaEncoderOutputInfo) {
        if (info.decoderConfig) {
          decoderConfig = JSON.stringify({
            ...info.decoderConfig,
            description:
              info.decoderConfig.description &&
              sodium.to_base64(new Uint8Array(info.decoderConfig.description)),
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
              })
            );
          } catch {
            console.log("fuck 2");
            //
          }
        }
      },
      error() {
        //
      },
    };

    let encoder!: MediaEncoder;

    if (track.kind === "audio") {
      encoder = new AudioEncoder(encoderInit);
    }

    if (track.kind === "video") {
      encoder = new VideoEncoder(encoderInit);
    }

    let lastWidth = 0;
    let lastHeight = 0;

    const proc = async (
      data: MediaData,
      writer?: WritableStreamDefaultWriter<MediaData>
    ) => {
      if (encoder.encodeQueueSize > 2) {
        data.close();
        return;
      }

      if (data instanceof AudioData && encoder.state === "unconfigured") {
        encoder.configure({
          codec: "opus",
          bitrate: 256e3,
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
        const maxScaledHeight =
          +store.state.value.config.videoMode.split("p")[0];
        const maxScaledWidth =
          {
            360: 640,
            480: 854,
            720: 1280,
            1080: 1920,
          }[maxScaledHeight] || maxScaledHeight;
        const maxFps = +store.state.value.config.videoMode.split("p")[1];

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
          codec: "avc1.42e01f",
          width: Math.floor(scaledWidth / 2) * 2,
          height: Math.floor(scaledHeight / 2) * 2,
          framerate: 1,
          latencyMode: "realtime",
          hardwareAcceleration: "prefer-hardware",
          bitrate:
            ({
              ["480p30"]: 1500e3,
              ["480p60"]: 1500e3,
              ["720p30"]: 3000e3,
              ["720p60"]: 4000e3,
              ["1080p30"]: 4000e3,
              ["1080p60"]: 5000e3,
            }[this.state.value.config.videoMode] || 5000e3) / maxFps,
        });

        lastWidth = data.codedWidth;
        lastHeight = data.codedHeight;
      }

      encoder.encode(
        data,
        stream.config.requestKeyFrame
          ? {
              keyFrame: true,
            }
          : {} // lets the encoder decide whether to insert an I-frame.
      );

      if (writer) {
        await writer.write(data);
      }

      data.close();

      if (stream.config.requestKeyFrame) {
        stream.config.requestKeyFrame = false;
      }
    };

    const stream: ICallLocalStream = {
      type: opts.type,
      track: opts.track,
      peers: [],
      config: opts.config,
      encoder,
      proc,
    };

    store.state.value.call.localStreams.push(stream);

    for (const user of channel.users.filter((user) => user.inCall)) {
      await this.callSendLocalStream(stream, user.id);
    }

    opts.track.addEventListener("ended", async () => {
      await this.callRemoveLocalStream({
        type: stream.type,
      });
    });

    if (!opts.procOverride) {
      // allows us to return and throw this somewhere else on the event loop.
      (async () => {
        const reader = new MediaStreamTrackProcessor({
          track,
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
    if (!store.state.value.call) {
      console.warn("callRemoveLocalStream missing call");
      return;
    }

    const stream = store.state.value.call.localStreams.find(
      (stream) => stream.type === opts.type
    );

    if (!stream) {
      console.warn("callRemoveLocalStream missing stream");
      return;
    }

    store.state.value.call.localStreams =
      store.state.value.call.localStreams.filter(
        (stream2) => stream2 !== stream
      );

    stream.track.stop();
    stream.encoder.close();

    for (const { pc } of stream.peers) {
      pc.close();
    }

    if (!opts.silent) {
      playSound(SoundNavigateBackward);
    }

    await callUpdatePersist();

    if (
      opts.type === CallStreamType.DisplayVideo &&
      this.state.value.call?.localStreams.find(
        (stream) => stream.type === CallStreamType.DisplayAudio
      )
    ) {
      await this.callRemoveLocalStream({
        type: CallStreamType.DisplayAudio,
      });
    }
  },
  async callStart(channelId: string): Promise<void> {
    store.state.value.call = {
      channelId,
      localStreams: [],
      remoteStreams: [],
      start: new Date(),
      deaf: false,
    };

    store.state.value.socket?.send({
      t: SocketMessageType.CCallStart,
      d: {
        channelId,
      },
    });

    playSound(SoundStateUp);

    await callUpdatePersist();
  },
  async callReset(): Promise<void> {
    if (!store.state.value.call) {
      return;
    }

    for (const stream of store.state.value.call.localStreams) {
      stream.track.stop();

      for (const peer of stream.peers) {
        peer.pc.close();
      }
    }

    for (const stream of store.state.value.call.remoteStreams) {
      stream.pc.close();
    }

    delete store.state.value.call;

    playSound(SoundStateDown);

    await callUpdatePersist();
  },
  async callSetDeaf(val: boolean) {
    if (!store.state.value.call) {
      return;
    }

    for (const stream of store.state.value.call.remoteStreams) {
      if (stream.config?.el) {
        (stream.config.el as IHTMLAudioElement).volume = val ? 0 : 1;
      }
    }

    store.state.value.call.deaf = val;

    playSound(val ? SoundNavigateBackwardMin : SoundNavigateForwardMin);
  },
};
