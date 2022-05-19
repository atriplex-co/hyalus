import { idbGet, idbKeys } from "../global/idb";
import { iceServers, RTCMaxMessageSize } from "../global/config";
import sodium from "libsodium-wrappers";
import { router } from "../router";
import {
  CallRTCDataType,
  CallStreamType,
  ChannelType,
  ColorTheme,
  FileChunkRTCType,
  MessageType,
  PushProtocol,
  SocketMessageType,
  SocketProtocol,
  Status,
} from "common";
import {
  ICallPersist,
  ICallRemoteStream,
  ICallRTCData,
  IChannel,
  IChannelUser,
  IFriend,
  IHTMLAudioElement,
  ISocketHook,
  ISocketMessage,
} from "./types";
import {
  isDesktop,
  isMobile,
  notifyGetAvatarUrl,
  notifySend,
  playSound,
  processMessage,
} from "./helpers";
import SoundStateUp from "../assets/sounds/state-change_confirm-up.ogg";
import SoundStateDown from "../assets/sounds/state-change_confirm-down.ogg";
import { store } from "../global/store";
import axios from "axios";

let updateCheck: string;
let awayController: AbortController;

export class Socket {
  ws = new WebSocket(`${location.origin.replace("http", "ws")}/api/ws`);
  hooks: ISocketHook[] = [];
  preventReconnect = false;
  meta: {
    proto?: number;
    type?: string;
    vapidPublic?: string;
  } = {};

  constructor() {
    this.ws.addEventListener("open", async () => {
      if (!store.config.token) {
        this.close();
        return;
      }

      this.send({
        t: SocketMessageType.CStart,
        d: {
          proto: SocketProtocol,
          token: sodium.to_base64(store.config.token),
          away: store.away,
          fileChunks: (await idbKeys())
            .filter((key) => key.startsWith("file:"))
            .map((key) => key.slice("file:".length)),
        },
      });
    });

    this.ws.addEventListener("message", async ({ data: _data }) => {
      const msg = JSON.parse(_data) as ISocketMessage;
      console.debug("rx: %o", {
        t: SocketMessageType[msg.t],
        d: msg.d,
      });

      for (const hook of this.hooks) {
        if (msg.t !== hook.type) {
          continue;
        }

        clearTimeout(hook.ttlTimeout);
        hook.ttlTimeout = +setTimeout(() => {
          this.hooks = this.hooks.filter((h) => h !== hook);
        }, hook.ttl);

        hook.hook(msg);
      }

      if (msg.t === SocketMessageType.SReady) {
        const data = msg.d as {
          user: {
            id: string;
            name: string;
            username: string;
            avatarId?: string;
            created: number;
            authKeyUpdated: number;
            typingEvents: boolean;
            wantStatus: Status;
            totpEnabled: boolean;
            colorTheme: ColorTheme;
          };
          sessions: {
            id: string;
            self: boolean;
            ip: string;
            agent: string;
            created: number;
            lastStart: number;
          }[];
          friends: {
            id: string;
            username: string;
            name: string;
            avatarId?: string;
            publicKey: string;
            status: Status;
            accepted: boolean;
            acceptable: boolean;
          }[];
          channels: {
            id: string;
            type: ChannelType;
            created: number;
            name?: string;
            avatarId?: string;
            owner: boolean;
            users: {
              id: string;
              name: string;
              username: string;
              avatarId?: string;
              publicKey: string;
              status: Status;
              hidden: boolean;
              lastTyping: number;
              inCall: boolean;
            }[];
            lastMessage: {
              id: string;
              userId: string;
              type: MessageType;
              created: number;
              updated?: number;
              data?: string;
              key?: string;
            };
          }[];
          meta: {
            proto: number;
            type: string;
            vapidPublic: string;
          };
        };

        this.meta = data.meta;

        store.user = {
          id: data.user.id,
          name: data.user.name,
          username: data.user.username,
          avatarId: data.user.avatarId,
          created: new Date(data.user.created),
          authKeyUpdated: new Date(data.user.authKeyUpdated),
          typingEvents: data.user.typingEvents,
          wantStatus: data.user.wantStatus,
          totpEnabled: data.user.totpEnabled,
        };

        store.sessions = [];
        store.friends = [];
        store.channels = [];

        for (const session of data.sessions) {
          store.sessions.push({
            id: session.id,
            self: session.self,
            ip: session.ip,
            agent: session.agent,
            created: new Date(session.created),
            lastStart: new Date(session.lastStart),
          });
        }

        for (const friend of data.friends) {
          store.friends.push({
            id: friend.id,
            username: friend.username,
            name: friend.name,
            avatarId: friend.avatarId,
            publicKey: sodium.from_base64(friend.publicKey),
            status: friend.status,
            accepted: friend.accepted,
            acceptable: friend.acceptable,
          });
        }

        for (const channel of data.channels) {
          const users: IChannelUser[] = [];

          for (const user of channel.users) {
            users.push({
              id: user.id,
              username: user.username,
              name: user.name,
              avatarId: user.avatarId,
              publicKey: sodium.from_base64(user.publicKey),
              status: user.status,
              hidden: user.hidden,
              lastTyping: new Date(user.lastTyping),
              inCall: user.inCall,
            });
          }

          const out: IChannel = {
            id: channel.id,
            type: channel.type,
            created: new Date(channel.created),
            name: channel.name,
            avatarId: channel.avatarId,
            owner: channel.owner,
            users,
            messages: [],
          };

          const lastMessage = processMessage({
            ...channel.lastMessage,
            channel: out,
          });

          if (lastMessage) {
            out.messages.push(lastMessage);
          }

          store.channels.push(out);
        }

        store.channels.sort((a, b) =>
          (a.messages.at(-1)?.created || a.created) <
          (b.messages.at(-1)?.created || b.created)
            ? 1
            : -1
        );

        store.ready = true;

        if (store.call) {
          this.send({
            t: SocketMessageType.CCallStart,
            d: {
              channelId: store.call.channelId,
            },
          });

          const channel = store.channels.find(
            (channel) => channel.id === store.call?.channelId
          );

          if (!channel) {
            return;
          }

          for (const user of channel.users.filter((user) => user.inCall)) {
            for (const stream of store.call.localStreams) {
              await store.callSendLocalStream(stream, user.id);
            }
          }
        }

        await store.writeConfig("colorTheme", data.user.colorTheme);

        try {
          const { data } = await axios.get("/", {
            headers: {
              accept: "*/*",
            },
          });

          if (updateCheck && updateCheck !== data) {
            store.updateAvailable = true;
          }

          updateCheck = data;
        } catch {
          //
        }

        const initPermissions = async () => {
          removeEventListener("mousedown", initPermissions);

          try {
            if (!isDesktop) {
              await Notification.requestPermission();
            }

            if ((isMobile || window.dev.enabled) && this.meta.vapidPublic) {
              const { pushManager } = (
                await navigator.serviceWorker.getRegistrations()
              )[0];

              let sub = await pushManager.getSubscription();

              if (sub?.options.applicationServerKey) {
                let subOk = true;

                const localKey = new Uint8Array(
                  sub.options.applicationServerKey
                );
                const remoteKey = sodium.from_base64(this.meta.vapidPublic);

                if (localKey.length !== remoteKey.length) {
                  subOk = false;
                } else {
                  for (let i = 0; i < localKey.length; ++i) {
                    if (localKey[i] !== remoteKey[i]) {
                      subOk = false;
                      break;
                    }
                  }
                }

                if (!subOk) {
                  await sub.unsubscribe();
                  sub = null;
                }
              }

              if (!sub) {
                sub = await pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: this.meta.vapidPublic,
                });
              }

              const subJson = JSON.parse(JSON.stringify(sub)); // i forget why we do this.

              this.send({
                t: SocketMessageType.CSetPushSubscription,
                d: {
                  endpoint: subJson.endpoint,
                  p256dh: subJson.keys.p256dh,
                  auth: subJson.keys.auth,
                  proto: PushProtocol,
                },
              });
            }
          } catch (e) {
            console.warn(e);
          }

          try {
            if (!window.IdleDetector) {
              return;
            }

            if (!isDesktop) {
              await window.IdleDetector.requestPermission();
            }

            const awayDetector = new window.IdleDetector();
            awayController = new AbortController();

            awayDetector.addEventListener("change", () => {
              const away = !(
                awayDetector.userState === "active" &&
                awayDetector.screenState === "unlocked"
              );

              if (store.away === away) {
                return;
              }

              store.away = away;

              if (store.ready) {
                store.socket?.send({
                  t: SocketMessageType.CSetAway,
                  d: {
                    away,
                  },
                });
              }
            });

            await awayDetector.start({
              threshold: 1000 * 60 * 10,
              signal: awayController.signal,
            });
          } catch (e) {
            console.warn(e);
          }
        };

        if (!isDesktop) {
          addEventListener("mousedown", initPermissions);
        } else {
          await initPermissions();
        }

        if (isDesktop && store.config.callPersist && !store.call) {
          const callPersist = JSON.parse(
            store.config.callPersist
          ) as ICallPersist;

          if (
            +new Date() - callPersist.updated > 1000 * 60 * 5 ||
            !store.channels.find(
              (channel) => channel.id === callPersist.channelId
            )
          ) {
            return;
          }

          await store.callStart(callPersist.channelId);

          for (const stream of callPersist.localStreams) {
            if (![CallStreamType.Audio].includes(stream)) {
              continue;
            }

            await store.callAddLocalStream({
              type: CallStreamType.Audio,
              silent: true,
            });
          }
        }
      }

      if (msg.t === SocketMessageType.SReset) {
        const data = msg.d as {
          error?: string;
          updateRequired?: boolean;
        };

        if (data && data.updateRequired) {
          store.updateAvailable = true;
          store.updateRequired = true;
          this.close();
          return;
        }

        await store.writeConfig("token", null);
        await router.push("/auth");
      }

      if (msg.t === SocketMessageType.SSelfUpdate) {
        const data = msg.d as {
          username?: string;
          name?: string;
          avatarId?: string;
          colorTheme?: ColorTheme;
          wantStatus?: Status;
          typingEvents?: boolean;
          totpEnabled?: boolean;
        };

        if (!store.user) {
          return;
        }

        store.user = {
          ...store.user,
          ...data,
        };

        if (data.colorTheme !== undefined) {
          await store.writeConfig("colorTheme", data.colorTheme);
        }
      }

      if (msg.t === SocketMessageType.SSessionCreate) {
        const data = msg.d as {
          id: string;
          ip: string;
          agent: string;
          created: number;
        };

        store.sessions.push({
          id: data.id,
          ip: data.ip,
          agent: data.agent,
          created: new Date(data.created),
          lastStart: new Date(data.created),
          self: false,
        });
      }

      if (msg.t === SocketMessageType.SSessionUpdate) {
        const data = msg.d as {
          id: string;
          lastStart?: number;
        };

        const session = store.sessions.find(
          (session) => session.id === data.id
        );

        if (!session) {
          console.warn(`SSessionUpdate for invalid session: ${data.id}`);
          return;
        }

        if (data.lastStart !== undefined) {
          session.lastStart = new Date(data.lastStart);
        }
      }

      if (msg.t === SocketMessageType.SSessionDelete) {
        const data = msg.d as {
          id: string;
        };

        store.sessions = store.sessions.filter(
          (session) => session.id !== data.id
        );
      }

      if (msg.t === SocketMessageType.SFriendCreate) {
        const data = msg.d as {
          id: string;
          username: string;
          name: string;
          avatarId?: string;
          publicKey: string;
          status: Status;
          acceptable: boolean;
        };

        store.friends.push({
          id: data.id,
          username: data.username,
          name: data.name,
          avatarId: data.avatarId,
          publicKey: sodium.from_base64(data.publicKey),
          status: data.status,
          accepted: false,
          acceptable: data.acceptable,
        });

        if (data.acceptable) {
          notifySend({
            icon: await notifyGetAvatarUrl(data.avatarId),
            title: data.name,
            body: `${data.name} sent a friend request`,
          });
        }
      }

      if (msg.t === SocketMessageType.SFriendUpdate) {
        const data = msg.d as {
          id: string;
          accepted?: boolean;
          acceptable?: boolean;
          status?: Status;
        };

        const friend = store.friends.find((friend) => friend.id === data.id);

        if (!friend) {
          console.warn(`SFriendUpdate for invalid ID: ${data.id}`);
          return;
        }

        if (data.accepted !== undefined) {
          friend.accepted = data.accepted;
        }

        if (data.acceptable !== undefined) {
          friend.acceptable = data.acceptable;
        }

        if (data.status !== undefined) {
          friend.status = data.status;

          for (const channel of store.channels) {
            const user = channel.users.find((user) => user.id === data.id);

            if (user) {
              user.status = data.status;
            }
          }
        }
      }

      if (msg.t === SocketMessageType.SFriendDelete) {
        const data = msg.d as {
          id: string;
        };

        store.friends = store.friends.filter((friend) => friend.id !== data.id);

        for (const channel of store.channels) {
          const user = channel.users.find((user) => user.id === data.id);

          if (user) {
            user.status = Status.Offline;
          }
        }
      }

      if (msg.t === SocketMessageType.SChannelCreate) {
        const data = msg.d as {
          id: string;
          type: ChannelType;
          created: string;
          name?: string;
          avatarId?: string;
          owner: boolean;
          users: {
            id: string;
            name: string;
            username: string;
            avatarId?: string;
            publicKey: string;
            status: Status;
            hidden: boolean;
            inCall: boolean;
          }[];
          lastMessage: {
            id: string;
            userId: string;
            type: MessageType;
            created: number;
            updated?: number;
            data?: string;
            key?: string;
          };
        };

        const users: IChannelUser[] = [];

        for (const user of data.users) {
          users.push({
            id: user.id,
            name: user.name,
            username: user.username,
            avatarId: user.avatarId,
            publicKey: sodium.from_base64(user.publicKey),
            status: user.status,
            hidden: user.hidden,
            lastTyping: new Date(0),
            inCall: user.inCall,
          });
        }

        const channel: IChannel = {
          id: data.id,
          type: data.type,
          created: new Date(data.created),
          name: data.name,
          avatarId: data.avatarId,
          owner: data.owner,
          users,
          messages: [],
        };

        const lastMessage = processMessage({
          ...data.lastMessage,
          channel,
        });

        if (lastMessage) {
          channel.messages.push(lastMessage);
        }

        store.channels.push(channel);

        store.channels.sort((a, b) =>
          (a.messages.at(-1)?.created || a.created) <
          (b.messages.at(-1)?.created || b.created)
            ? 1
            : -1
        );

        if (msg.t === store.expectedEvent) {
          await router.push(`/channels/${data.id}`);
        }
      }

      if (msg.t === SocketMessageType.SChannelUpdate) {
        const data = msg.d as {
          id: string;
          name?: string;
          avatarId?: string;
          owner?: boolean;
        };

        const channel = store.channels.find(
          (channel) => channel.id === data.id
        );

        if (!channel) {
          console.warn(`SChannelUpdate for invalid channel: ${data.id}`);
          return;
        }

        if (data.name) {
          channel.name = data.name;
        }

        if (data.avatarId) {
          channel.avatarId = data.avatarId;
        }

        if (data.owner !== undefined) {
          channel.owner = data.owner;
        }
      }

      if (msg.t === SocketMessageType.SChannelDelete) {
        const data = msg.d as {
          id: string;
        };

        store.channels = store.channels.filter(
          (channel) => channel.id !== data.id
        );
      }

      if (msg.t === SocketMessageType.SChannelUserCreate) {
        const data = msg.d as {
          id: string;
          channelId: string;
          username: string;
          name: string;
          avatarId?: string;
          status: Status;
          publicKey: string;
          hidden: boolean;
          lastTyping: number;
          inCall: boolean;
        };

        const channel = store.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(
            `channelUserCreate for invalid channel: ${data.channelId}`
          );
          return;
        }

        channel.users.push({
          id: data.id,
          username: data.username,
          name: data.name,
          avatarId: data.avatarId,
          status: data.status,
          publicKey: sodium.from_base64(data.publicKey),
          hidden: data.hidden,
          lastTyping: new Date(data.lastTyping),
          inCall: data.inCall,
        });
      }

      if (msg.t === SocketMessageType.SChannelUserUpdate) {
        const data = msg.d as {
          id: string;
          channelId: string;
          hidden?: boolean;
          lastTyping?: boolean;
          inCall?: boolean;
        };

        const channel = store.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(
            `channelUserUpdate for invalid channel: ${data.channelId}`
          );
          return;
        }

        const user = channel.users.find((user) => user.id === data.id);

        if (!user) {
          console.warn(`SChannelUserUpdate for invalid user: ${data.id}`);
          return;
        }

        if (data.hidden !== undefined) {
          user.hidden = data.hidden;
        }

        if (data.lastTyping) {
          user.lastTyping = new Date();
        }

        if (data.inCall !== undefined) {
          user.inCall = data.inCall;

          if (store.call && store.call.channelId === data.channelId) {
            for (const stream of store.call.localStreams) {
              for (const peer of stream.peers.filter(
                (peer) => peer.userId === data.id
              )) {
                peer.pc.close();

                stream.peers = stream.peers.filter((peer2) => peer2 !== peer);
              }
            }

            for (const stream of store.call.remoteStreams.filter(
              (stream) => stream.userId === data.id
            )) {
              stream.pc.close();

              store.call.remoteStreams = store.call.remoteStreams.filter(
                (stream2) => stream2.pc !== stream.pc
              );
            }

            if (data.inCall) {
              for (const stream of store.call.localStreams) {
                await store.callSendLocalStream(stream, data.id);
              }
            }

            playSound(data.inCall ? SoundStateUp : SoundStateDown);
          }
        }
      }

      if (msg.t === SocketMessageType.SForeignUserUpdate) {
        const data = msg.d as {
          id: string;
          name?: string;
          username?: string;
          avatarId?: string;
          status?: Status;
        };

        const targets: (IFriend | IChannelUser)[] = [];

        const friend = store.friends.find((friend) => friend.id === data.id);

        if (friend) {
          targets.push(friend);
        }

        for (const channel of store.channels) {
          const user = channel.users.find((user) => user.id === data.id);

          if (user) {
            targets.push(user);
          }
        }

        for (const target of targets) {
          if (data.name) {
            target.name = data.name;
          }

          if (data.username) {
            target.username = data.username;
          }

          if (data.avatarId) {
            target.avatarId = data.avatarId;
          }

          if (data.status !== undefined) {
            target.status = data.status;
          }
        }
      }

      if (msg.t === SocketMessageType.SMessageCreate) {
        const data = msg.d as {
          id: string;
          channelId: string;
          userId: string;
          type: MessageType;
          created: number;
          updated?: number;
          data?: string;
          key?: string;
        };

        const channel = store.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(`SMessageCreate for invalid channel: ${data.channelId}`);
          return;
        }

        const message = processMessage({
          ...data,
          channel,
        });

        if (!message) {
          return;
        }

        channel.messages.push(message);
        channel.messages.sort((a, b) => (a.created > b.created ? 1 : -1));

        store.channels.sort((a, b) =>
          (a.messages.at(-1)?.created || a.created) <
          (b.messages.at(-1)?.created || b.created)
            ? 1
            : -1
        );

        if (msg.t === store.expectedEvent) {
          await router.push(`/channels/${data.channelId}`);
        }

        const user = channel.users.find((user) => user.id === data.userId);

        if (!user) {
          return; // also prevents us from getting notifs from ourselves, unlike some apps...
        }

        if (
          !(
            document.visibilityState === "visible" &&
            router.currentRoute.value.path === `/channels/${channel.id}`
          )
        ) {
          let title = user.name;
          let body = "";

          if (channel.name) {
            title += ` (${channel.name})`;
          }

          if (message && message.dataString) {
            body = message.dataString;
          }

          if (data.type === MessageType.Attachment) {
            try {
              body = JSON.parse(body).name;
            } catch {
              //
            }
          }

          if (!body) {
            return;
          }

          notifySend({
            icon: await notifyGetAvatarUrl(user.avatarId),
            title,
            body,
          });
        }
      }

      if (msg.t === SocketMessageType.SMessageDelete) {
        const data = msg.d as {
          id: string;
          channelId: string;
          lastMessage: {
            id: string;
            userId: string;
            type: MessageType;
            created: number;
            updated?: number;
            data?: string;
            key?: string;
          };
        };

        const channel = store.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(`SMessageDelete for invalid channel: ${data.channelId}`);
          return;
        }

        channel.messages = channel.messages.filter(
          (message) => message.id !== data.id
        );

        if (data.lastMessage) {
          const lastMessage = processMessage({
            ...data.lastMessage,
            channel,
          });

          if (!lastMessage) {
            return;
          }

          channel.messages = channel.messages.filter(
            (message) => message.id !== data.lastMessage?.id
          );

          channel.messages.push(lastMessage);

          channel.messages.sort((a, b) => (a.created > b.created ? 1 : -1));
        }

        store.channels.sort((a, b) =>
          (a.messages.at(-1)?.created || a.created) <
          (b.messages.at(-1)?.created || b.created)
            ? 1
            : -1
        );
      }

      if (msg.t === SocketMessageType.SMessageUpdate) {
        const data = msg.d as {
          id: string;
          channelId: string;
          updated: number;
          data: string;
          key: string;
        };

        const channel = store.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(
            `messageVerionCreate for invalid channel: ${data.channelId}`
          );
          return;
        }

        const message = channel.messages.find(
          (message) => message.id === data.id
        );

        if (!message) {
          return;
        }

        const message2 = processMessage({
          ...message,
          ...data,
          channel,
        });

        if (!message2) {
          return;
        }

        channel.messages[channel.messages.indexOf(message)] = message2;
      }

      if (msg.t === SocketMessageType.SFileChunkRequest) {
        const data = msg.d as {
          hash: string;
          tag: string;
          userId: string;
          channelId: string;
        };

        const chunk = (await idbGet(`file:${data.hash}`)) as Uint8Array;

        if (!chunk) {
          console.warn(`SFileChunkRequest for invalid hash: ${data.hash}`);
          return;
        }

        const channel = store.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(
            `fileChunkRequest for invalid channel: ${data.channelId}`
          );
          return;
        }

        let publicKey: Uint8Array | undefined;

        if (store.user && store.user.id === data.userId) {
          publicKey = store.config.publicKey;
        } else {
          publicKey = channel.users.find(
            (user) => user.id === data.userId
          )?.publicKey;
        }

        if (!publicKey) {
          console.warn(`SFileChunkRequest for invalid user: ${data.userId}`);
          return;
        }

        const pc = new RTCPeerConnection({ iceServers });
        const dc = pc.createDataChannel("");

        const send = (val: unknown) => {
          const json = JSON.stringify(val);
          console.debug("f_rtc/tx: %o", JSON.parse(json)); // yes, there's a reason for this.
          const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

          this.send({
            t: SocketMessageType.CFileChunkRTC,
            d: {
              hash: data.hash,
              tag: data.tag,
              data: sodium.to_base64(
                new Uint8Array([
                  ...nonce,
                  ...sodium.crypto_box_easy(
                    JSON.stringify(val),
                    nonce,
                    publicKey as unknown as Uint8Array,
                    store.config.privateKey as unknown as Uint8Array
                  ),
                ])
              ),
            },
          });
        };

        this.registerHook({
          ttl: 1000 * 10,
          type: SocketMessageType.SFileChunkRTC,
          async hook(msg: ISocketMessage) {
            const data2 = msg.d as {
              hash: string;
              tag: string;
              data: string;
            };

            if (data2.hash !== data.hash || data2.tag !== data.tag) {
              return;
            }

            const dataBytes = sodium.from_base64(data2.data);
            const dataDecrypted = JSON.parse(
              sodium.to_string(
                sodium.crypto_box_open_easy(
                  new Uint8Array(
                    dataBytes.buffer,
                    sodium.crypto_box_NONCEBYTES
                  ),
                  new Uint8Array(
                    dataBytes.buffer,
                    0,
                    sodium.crypto_box_NONCEBYTES
                  ),
                  publicKey as unknown as Uint8Array,
                  store.config.privateKey as unknown as Uint8Array
                )
              )
            );

            console.debug("f_rtc/rx: %o", dataDecrypted);

            if (dataDecrypted.t === FileChunkRTCType.SDP) {
              await pc.setRemoteDescription(
                new RTCSessionDescription({
                  type: "answer",
                  sdp: dataDecrypted.d,
                })
              );
            }

            if (dataDecrypted.t === FileChunkRTCType.ICECandidate) {
              await pc.addIceCandidate(
                new RTCIceCandidate(JSON.parse(dataDecrypted.d))
              );
            }
          },
        });

        pc.addEventListener("icecandidate", ({ candidate }) => {
          if (!candidate) {
            return;
          }

          send({
            t: FileChunkRTCType.ICECandidate,
            d: JSON.stringify(candidate),
          });
        });

        pc.addEventListener("connectionstatechange", () => {
          console.debug(`f_rtc/peer: ${pc.connectionState}`);
        });

        dc.addEventListener("open", () => {
          console.debug("f_rtc/dc: open");

          for (let i = 0; i < chunk.length; i += RTCMaxMessageSize) {
            dc.send(
              new Uint8Array(
                chunk.buffer,
                i,
                Math.min(RTCMaxMessageSize, chunk.length - i)
              )
            );
          }

          dc.send(""); // EOF

          setTimeout(() => {
            pc.close();
          }, 1000 * 10);
        });

        dc.addEventListener("close", () => {
          pc.close();
          console.debug("f_rtc/dc: close");
        });

        await pc.setLocalDescription(await pc.createOffer());

        send({
          t: FileChunkRTCType.SDP,
          d: pc.localDescription?.sdp,
        });
      }

      if (msg.t === SocketMessageType.SCallRTC) {
        const data = msg.d as {
          userId: string;
          data: string;
        };

        if (!store.call) {
          return;
        }

        const channel = store.channels.find(
          (channel) => channel.id === store.call?.channelId
        );

        if (!channel) {
          return;
        }

        const user = channel.users.find((user) => user.id === data.userId);

        if (!user || !store.config.privateKey) {
          return;
        }

        const dataBytes = sodium.from_base64(data.data);
        const dataDecrypted: ICallRTCData = JSON.parse(
          sodium.to_string(
            sodium.crypto_box_open_easy(
              new Uint8Array(dataBytes.buffer, sodium.crypto_box_NONCEBYTES),
              new Uint8Array(dataBytes.buffer, 0, sodium.crypto_box_NONCEBYTES),
              user.publicKey,
              store.config.privateKey
            )
          )
        );

        console.debug("c_rtc/rx: %o", {
          ...dataDecrypted,
          mt: CallRTCDataType[dataDecrypted.mt],
          st: CallStreamType[dataDecrypted.st],
          userId: user.id,
        });

        if (dataDecrypted.mt === CallRTCDataType.RemoteTrackOffer) {
          const pc = new RTCPeerConnection({ iceServers });
          let ctx: AudioContext;

          if (
            [CallStreamType.Audio, CallStreamType.DisplayAudio].includes(
              dataDecrypted.st
            )
          ) {
            ctx = new AudioContext();
          }

          const send = (val: unknown) => {
            const jsonRaw = JSON.stringify(val);
            const json = JSON.parse(jsonRaw);
            console.debug("c_rtc/tx: %o", {
              ...json,
              mt: CallRTCDataType[json.mt],
              st: CallStreamType[json.st],
              userId: user.id,
            }); // yes, there's a reason for this.
            const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

            this.send({
              t: SocketMessageType.CCallRTC,
              d: {
                userId: data.userId,
                data: sodium.to_base64(
                  new Uint8Array([
                    ...nonce,
                    ...sodium.crypto_box_easy(
                      JSON.stringify(val),
                      nonce,
                      user.publicKey,
                      store.config.privateKey as unknown as Uint8Array
                    ),
                  ])
                ),
              },
            });
          };

          const track = new MediaStreamTrackGenerator({
            kind: {
              [CallStreamType.Audio]: "audio",
              [CallStreamType.Video]: "video",
              [CallStreamType.DisplayVideo]: "video",
              [CallStreamType.DisplayAudio]: "audio",
            }[dataDecrypted.st],
          });

          const writer = track.writable.getWriter();

          const fps = 60; // TODO: dynamically adjust this.
          const frames: MediaData[] = [];

          if (track.kind === "video") {
            const render = async () => {
              if (track.readyState === "ended") {
                for (const frame of frames) {
                  frame.close();
                }

                return;
              }

              // setTimeout(
              //   render,
              //   frames.length >= 2
              //     ? (frames[1].timestamp - frames[0].timestamp) / 1000
              //     : 1000 / fps
              // );

              requestAnimationFrame(render);

              while (frames.length > fps / 10) {
                frames.shift()?.close();
              }

              const frame = frames.shift();

              if (!frame) {
                return;
              }

              if (document.visibilityState === "visible") {
                writer.write(frame);
              } else {
                frame.close();
              }
            };

            render();
          }

          const decoderInit = {
            output(frame: MediaData) {
              if (track.kind === "audio") {
                writer.write(frame);
              }

              if (track.kind === "video") {
                frames.push(frame);
              }
            },
            error() {
              //
            },
          };

          let decoder!: MediaDecoder;

          if (track.kind === "video") {
            decoder = new VideoDecoder(decoderInit);
          }

          if (track.kind === "audio") {
            decoder = new AudioDecoder(decoderInit);
          }

          pc.addEventListener("icecandidate", ({ candidate }) => {
            if (!candidate) {
              return;
            }

            send({
              mt: CallRTCDataType.LocalTrackICECandidate,
              st: dataDecrypted.st,
              d: JSON.stringify(candidate),
            });
          });

          pc.addEventListener("datachannel", ({ channel: dc }) => {
            const rxBuffer = new Uint8Array(2 * 1024 * 1024);
            let rxBufferPos = 0;
            let decoderConfig = "";

            dc.addEventListener("message", async ({ data }) => {
              if (typeof data === "string") {
                const meta = JSON.parse(data);

                if (decoder.state === "closed") {
                  pc.close();
                  return;
                }

                if (
                  decoderConfig !== meta.decoderConfig ||
                  decoder.state === "unconfigured"
                ) {
                  decoderConfig = meta.decoderConfig;
                  const parsedDecoderConfig = JSON.parse(decoderConfig);

                  decoder.configure({
                    ...parsedDecoderConfig,
                    hardwareAcceleration: "prefer-hardware",
                    description:
                      parsedDecoderConfig.description &&
                      sodium.from_base64(parsedDecoderConfig.description),
                    optimizeForLatency: true,
                  });
                }

                const chunkInit: EncodedMediaChunkInit = {
                  data: new Uint8Array(rxBuffer.buffer, 0, rxBufferPos),
                  type: meta.type,
                  timestamp: meta.timestamp,
                  duration: meta.duration,
                };

                let chunk!: EncodedMediaChunk;

                if (track.kind === "audio") {
                  chunk = new EncodedAudioChunk(chunkInit);
                }

                if (track.kind === "video") {
                  chunk = new EncodedVideoChunk(chunkInit);
                }

                try {
                  decoder.decode(chunk);
                } catch (e) {
                  dc.send("");
                }

                rxBufferPos = 0;
                return;
              }

              if (rxBufferPos + data.byteLength > rxBuffer.length) {
                rxBufferPos = 0;
                return;
              }

              rxBuffer.set(new Uint8Array(data), rxBufferPos);
              rxBufferPos += data.byteLength;
            });

            dc.addEventListener("close", () => {
              console.debug("c_rtc/dc: remoteStream close");
              pc.close();

              if (ctx) {
                ctx.close();
              }

              if (stream.decoder.state !== "closed") {
                stream.decoder.close();
                stream.writer.close();
              }

              if (!store.call) {
                return;
              }

              store.call.remoteStreams = store.call.remoteStreams.filter(
                (stream) => stream.pc !== pc
              );
            });

            if (ctx) {
              const el2 = document.createElement("audio");

              el2.onloadedmetadata = () => {
                const gain = ctx.createGain();
                const dest = ctx.createMediaStreamDestination();
                const el = document.createElement("audio") as IHTMLAudioElement;

                ctx
                  .createMediaStreamSource(el2.srcObject as MediaStream)
                  .connect(gain);
                gain.connect(dest);
                gain.gain.value = store.config.audioOutputGain / 100;
                el.srcObject = dest.stream;
                el.volume = !store.call?.deaf ? 1 : 0;

                try {
                  el.setSinkId(store.config.audioOutput);
                } catch {
                  //
                }

                el.play();

                stream.config.el = el;
                stream.config.gain = gain;
              };

              el2.srcObject = new MediaStream([track]);
              el2.volume = 0;
              el2.play();
            }
          });

          pc.addEventListener("connectionstatechange", () => {
            console.debug(`c_rtc/peer: ${pc.connectionState}`);
          });

          const stream: ICallRemoteStream = {
            userId: data.userId,
            type: dataDecrypted.st,
            pc,
            track,
            config: {},
            decoder,
            writer,
          };

          store.call.remoteStreams.push(stream);

          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: "offer",
              sdp: dataDecrypted.d,
            })
          );
          await pc.setLocalDescription(await pc.createAnswer());

          send({
            mt: CallRTCDataType.LocalTrackAnswer,
            st: dataDecrypted.st,
            d: pc.localDescription?.sdp,
          });
        }

        if (dataDecrypted.mt === CallRTCDataType.RemoteTrackICECandidate) {
          let stream: ICallRemoteStream | undefined;

          for (let i = 0; i < 10; ++i) {
            stream = store.call.remoteStreams.find(
              (stream) =>
                stream.userId === data.userId &&
                stream.type === dataDecrypted.st
            );

            if (stream) {
              break;
            } else {
              await new Promise((resolve) => {
                setTimeout(resolve, 100);
              });
            }
          }

          if (!stream) {
            console.warn("SCallRTC + RemoteTrackICECandidate missing stream");
            return;
          }

          await stream.pc.addIceCandidate(
            new RTCIceCandidate(JSON.parse(dataDecrypted.d))
          );
        }

        if (
          [
            CallRTCDataType.LocalTrackAnswer,
            CallRTCDataType.LocalTrackICECandidate,
          ].includes(dataDecrypted.mt)
        ) {
          const stream = store.call.localStreams.find(
            (stream) => stream.type === dataDecrypted.st
          );

          if (!stream) {
            console.warn("SCallRTC missing stream");
            return;
          }

          const peer = stream.peers.find(
            (peer) => peer.userId === data.userId
          )?.pc;

          if (!peer) {
            console.warn("SCallRTC missing peer");
            return;
          }

          if (dataDecrypted.mt === CallRTCDataType.LocalTrackAnswer) {
            await peer.setRemoteDescription(
              new RTCSessionDescription({
                type: "answer",
                sdp: dataDecrypted.d,
              })
            );
          }

          if (dataDecrypted.mt === CallRTCDataType.LocalTrackICECandidate) {
            await peer.addIceCandidate(
              new RTCIceCandidate(JSON.parse(dataDecrypted.d))
            );
          }
        }
      }

      if (msg.t === SocketMessageType.SCallReset) {
        await store.callReset();
      }
    });

    this.ws.addEventListener("close", () => {
      store.ready = false;

      if (store.call) {
        for (const stream of store.call.localStreams) {
          for (const peer of stream.peers) {
            peer.pc.close();
          }
        }

        for (const stream of store.call.remoteStreams) {
          stream.pc.close();
        }
      }

      if (!this.preventReconnect) {
        setTimeout(() => {
          store.socket = new Socket();
        }, 1000);
      }
    });
  }

  send(msg: ISocketMessage): void {
    console.debug("tx: %o", {
      t: SocketMessageType[msg.t],
      d: msg.d,
    });

    this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    this.preventReconnect = true;
    this.ws.close();
  }

  registerHook(hook: ISocketHook): void {
    this.hooks.push(hook);

    hook.ttlTimeout = +setTimeout(() => {
      this.hooks = this.hooks.filter((h) => h !== hook);
    }, hook.ttl);
  }
}
