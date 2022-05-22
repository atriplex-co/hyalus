import {
  CallRTCDataType,
  CallStreamType,
  ChannelType,
  ColorTheme,
  MessageType,
  SocketMessageType,
  Status,
} from "common";
import JMuxer from "jmuxer";
import { Socket } from "./socket";

export interface IState {
  ready: boolean;
  away: boolean;
  config: IConfig;
  socket?: Socket;
  updateAvailable: boolean;
  updateRequired: boolean;
  user?: IUser;
  sessions: ISession[];
  friends: IFriend[];
  channels: IChannel[];
  call?: ICall;
  expectedEvent?: SocketMessageType;
  invite?: string;
  sideBarOpen: boolean;
  sideBarContent: SideBarContent;
}

export type IConfig = _IConfig & Record<string, unknown>;

export interface _IConfig {
  colorTheme: ColorTheme;
  fontScale: number;
  grayscale: boolean;
  adaptiveLayout: boolean;
  audioOutput: string;
  audioInput: string;
  videoInput: string;
  videoMode: string;
  audioOutputGain: number;
  audioInputGain: number;
  audioInputTrigger: number;
  voiceRtcEcho: boolean;
  voiceRtcGain: boolean;
  voiceRtcNoise: boolean;
  voiceRnnoise: boolean;
  notifySound: boolean;
  notifySystem: boolean;
  betaBanner: boolean;
  token?: Uint8Array;
  salt?: Uint8Array;
  publicKey?: Uint8Array;
  privateKey?: Uint8Array;
  callPersist?: string;
  searchKeys: string;
  openAppKeys: string;
  toggleMuteKeys: string;
  toggleDeafenKeys: string;
  joinCallKeys: string;
  leaveCallKeys: string;
  openCurrentCallKeys: string;
  uploadFileKeys: string;
}

export interface ICall {
  channelId: string;
  localStreams: ICallLocalStream[];
  remoteStreams: ICallRemoteStream[];
  start: Date;
  deaf: boolean;
  updatePersistInterval: number;
}

export interface ICallPersist {
  updated: number;
  channelId: string;
  localStreams: CallStreamType[];
}

export interface ICallLocalStream {
  type: CallStreamType;
  track: MediaStreamTrack;
  peers: ICallLocalStreamPeer[];
  encoder: MediaEncoder;
  proc(
    data: MediaData,
    writer?: WritableStreamDefaultWriter<MediaData>
  ): Promise<void>;
  context?: AudioContext;
  gainInput?: GainNode;
  gainProc?: GainNode;
  requestKeyFrame?: boolean;
  speaking?: boolean;
}

export interface ICallLocalStreamPeer {
  userId: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
}

export interface ICallRemoteStream {
  userId: string;
  type: CallStreamType;
  pc: RTCPeerConnection;
  element: IHTMLMediaElement; // TS won't let us put IHTMLAudioElement in an interface for whatever fucking reason.
  context?: AudioContext;
  decoder?: MediaDecoder;
  writer?: WritableStreamDefaultWriter; // allows us to close the MediaStreamTrackGenerator.
  muxer?: JMuxer;
  gainOutput?: GainNode;
  gainUserGain?: GainNode;
  gainUserMuted?: GainNode;
  speaking?: boolean;
}

export interface ICallTile {
  user: IChannelUser | IUser;
  localStream?: ICallLocalStream;
  remoteStream?: ICallRemoteStream;
}

export interface ICallRTCData {
  mt: CallRTCDataType;
  st: CallStreamType;
  d: string;
}

export interface IVoicePeer {
  userId: string;
  peer: RTCPeerConnection;
  tracks: IVoiceTrack[];
}

export interface IVoiceTrack {
  type: string;
  track: MediaStreamTrack;
}

export interface IUser {
  id: string;
  name: string;
  username: string;
  avatarId?: string;
  created: Date;
  authKeyUpdated: Date;
  typingEvents: boolean;
  wantStatus: Status;
  totpEnabled: boolean;
}

export interface ISession {
  id: string;
  self: boolean;
  ip: string;
  agent: string;
  created: Date;
  lastStart: Date;
}

export interface IFriend {
  id: string;
  username: string;
  name: string;
  avatarId?: string;
  publicKey: Uint8Array;
  status: Status;
  accepted: boolean;
  acceptable: boolean;
}

export interface IChannel {
  id: string;
  type: ChannelType;
  created: Date;
  name?: string;
  avatarId?: string;
  owner: boolean;
  users: IChannelUser[];
  messages: IMessage[];
}

export interface IChannelUser {
  id: string;
  username: string;
  name: string;
  avatarId?: string;
  publicKey: Uint8Array;
  status: Status;
  hidden: boolean;
  lastTyping: Date;
  inCall: boolean;
}

export interface IMessage {
  id: string;
  userId: string;
  type: MessageType;
  created: Date;
  updated?: Date;
  data?: Uint8Array;
  dataString?: string;
  dataFormatted?: string;
  key?: Uint8Array;
}

export interface ISocketMessage {
  t: SocketMessageType;
  d?: unknown;
}

export interface ISocketHook {
  ttl: number;
  ttlTimeout?: number;
  type: SocketMessageType;
  hook(msg: ISocketMessage): void;
}

export interface IHTMLMediaElement extends HTMLMediaElement {
  setSinkId(sinkId: string): void;
}

export enum SideBarContent {
  NONE,
  CHANNELS_PRIVATE,
  CHANNELS_GROUP,
  FRIENDS,
  SETTINGS,
}
