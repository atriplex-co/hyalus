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
import {
  axios,
  callCheckStreams,
  callUpdatePersist,
  getWorkerUrl,
} from "./helpers";
import { Socket } from "./socket";
import { CallStreamData, CallStreamDecoderConfig } from "./messages";

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

    const sendPayload = (val: unknown) => {
      const jsonRaw = JSON.stringify(val);
      const json = JSON.parse(jsonRaw) as ICallRTCData;
      console.debug("c_rtc/tx: %o", {
        ...json,
        mt: CallRTCDataType[json.mt],
        st: CallStreamType[json.st],
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

      sendPayload({
        mt: CallRTCDataType.RemoteTrackICECandidate,
        st: stream.type,
        d: JSON.stringify(candidate),
      });
    });

    pc.addEventListener("connectionstatechange", () => {
      console.debug(`c_rtc/peer: ${pc.connectionState}`);
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
    });

    await pc.setLocalDescription(await pc.createOffer());

    sendPayload({
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
  }): Promise<void> {
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
          noiseSuppression: false,
          autoGainControl: false,
          echoCancellation: true,
          echoCancellationType: "software",
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

    const stream: ICallLocalStream = {
      type: opts.type,
      track: opts.track,
      peers: [],
      config: opts.config,
    };

    store.state.value.call.localStreams.push(stream);

    opts.track.addEventListener("ended", async () => {
      await this.callRemoveLocalStream({
        type: stream.type,
      });
    });

    const channel = store.state.value.channels.find(
      (channel) => channel.id === store.state.value.call?.channelId
    );

    if (!channel) {
      return;
    }

    for (const user of channel.users.filter((user) => user.inCall)) {
      await this.callSendLocalStream(stream, user.id);
    }

    if (!opts.silent) {
      try {
        const el = document.createElement("audio");
        el.src = SoundNavigateForward;
        el.volume = 0.2;
        el.play();
      } catch {
        // prevents sound from playing twice.
      }
    }

    await callUpdatePersist();

    (async () => {
      const track = opts.track as MediaStreamTrack;
      const settings = track.getSettings() as {
        width: number;
        height: number;
        sampleRate: number;
        channelCount: number;
      };

      let lastDecoderConfig: Uint8Array;

      const encoderInit = {
        output(chunk: EncodedMediaChunk, info: MediaEncoderOutputInfo) {
          if (info.decoderConfig) {
            lastDecoderConfig = CallStreamDecoderConfig.encode({
              codec: info.decoderConfig.codec,
              description:
                info.decoderConfig.description &&
                new Uint8Array(info.decoderConfig.description),
              sampleRate: info.decoderConfig.sampleRate,
              numberOfChannels: info.decoderConfig.numberOfChannels,
            }).finish();
          }

          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);

          const msg = CallStreamData.encode({
            data,
            type: chunk.type,
            timestamp: chunk.timestamp,
            duration: chunk.duration,
            decoderConfig: lastDecoderConfig,
            decoderConfigUpdate: !!info.decoderConfig,
          }).finish();

          for (const peer of stream.peers) {
            if (peer.dc.readyState !== "open") {
              continue;
            }

            for (let i = 0; i < msg.length; i += RTCMaxMessageSize) {
              peer.dc.send(msg.slice(i).slice(0, RTCMaxMessageSize));
            }

            peer.dc.send(""); // EOF
          }
        },
        error() {
          //
        },
      };

      let encoder!: MediaEncoder;

      if (track.kind === "audio") {
        encoder = new AudioEncoder(encoderInit);
        encoder.configure({
          codec: "opus",
          bitrate: 256e3,
          sampleRate: settings.sampleRate,
          numberOfChannels: settings.channelCount,
        });
      }

      if (track.kind === "video") {
        encoder = new VideoEncoder(encoderInit);

        const encoderConfig = {
          codec: "avc1.42001e",
          hardwareAcceleration: "prefer-hardware",
          latencyMode: "realtime",
          bitrate: {
            ["480p30"]: 1500e3,
            ["480p60"]: 1500e3,
            ["720p30"]: 3000e3,
            ["720p60"]: 4000e3,
            ["1080p30"]: 4000e3,
            ["1080p60"]: 5000e3,
          }[this.state.value.config.videoMode],
        };

        let lastSettings = "";

        const updateEncoderConfig = () => {
          {
            const settings = opts.track?.getSettings() as {
              width: number;
              height: number;
            };

            if (lastSettings === JSON.stringify(settings)) {
              return;
            }

            encoder.configure({
              ...encoderConfig,
              width: Math.ceil(settings.width / 2) * 2,
              height: Math.ceil(settings.height / 2) * 2,
            });

            lastSettings = JSON.stringify(settings);
          }
        };

        setInterval(updateEncoderConfig, 1000);
        updateEncoderConfig();
      }

      const reader = new MediaStreamTrackProcessor({
        track,
      }).readable.getReader();

      for (;;) {
        const { value } = await reader.read();

        if (!value) {
          break;
        }

        if (!encoder.encodeQueueSize) {
          encoder.encode(
            value,
            stream.config.requestKeyFrame
              ? {
                  keyFrame: true,
                }
              : {} // lets the encoder decide whether to insert an I-frame.
          );
        }

        value.close();

        if (stream.config.requestKeyFrame) {
          stream.config.requestKeyFrame = false;
        }
      }
    })();
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

    for (const { pc } of stream.peers) {
      pc.close();
    }

    if (!opts.silent) {
      try {
        const el = document.createElement("audio");
        el.src = SoundNavigateBackward;
        el.volume = 0.2;
        el.play();
      } catch {
        //
      }
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
      updatePersistInterval: +setInterval(callUpdatePersist, 1000 * 30),
      checkStreamsInterval: +setInterval(callCheckStreams, 1000 * 1),
    };

    store.state.value.socket?.send({
      t: SocketMessageType.CCallStart,
      d: {
        channelId,
      },
    });

    try {
      const el = document.createElement("audio");
      el.src = SoundStateUp;
      el.volume = 0.2;
      el.play();
    } catch {
      //
    }

    await callUpdatePersist();
  },
  async callReset(): Promise<void> {
    if (!store.state.value.call) {
      return;
    }

    for (const stream of store.state.value.call.localStreams) {
      stream.track.stop();

      for (const { pc: peer } of stream.peers) {
        peer.close();
      }
    }

    for (const stream of store.state.value.call.remoteStreams) {
      stream.pc.close();
    }

    clearInterval(store.state.value.call.updatePersistInterval);
    clearInterval(store.state.value.call.checkStreamsInterval);

    delete store.state.value.call;

    try {
      const el = document.createElement("audio");
      el.src = SoundStateDown;
      el.volume = 0.2;
      el.play();
    } catch {
      //
    }

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

    try {
      const el = document.createElement("audio");
      el.src = val ? SoundNavigateBackwardMin : SoundNavigateForwardMin;
      el.volume = 0.2;
      el.play();
    } catch {
      //
    }
  },
};
