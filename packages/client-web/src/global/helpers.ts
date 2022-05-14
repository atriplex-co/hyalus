import { AxiosError } from "axios";
import { computed } from "vue";
import sodium from "libsodium-wrappers";
import { AvatarType, ColorTheme, MessageType, Status } from "common";
import SoundNotification from "../assets/sounds/notification_simple-01.ogg";
import ImageIcon from "../assets/images/icon-background.png";
import {
  ICallPersist,
  IChannel,
  IChannelUser,
  IHTMLAudioElement,
  IMessage,
  IUser,
} from "./types";
import { messageFormatter } from "./config";
import { store } from "./store";

export const prettyError = (e: unknown): string => {
  return (
    (
      (e as AxiosError).response?.data as {
        error?: string;
      }
    )?.error || (e as Error).message
  );
};

export const configToComputed = <T>(k: string) => {
  return computed({
    get() {
      return (store.config as Record<string, unknown>)[k] as T;
    },
    async set(v: T) {
      await store.writeConfig(k, v);
    },
  });
};

export const getWorkerUrl = (val: new () => Worker) => {
  return String(val).split('("')[1].split('"')[0].replace("?worker_file", "");
};

export const processMessage = (opts: {
  channel: IChannel;
  id: string;
  userId: string;
  type: MessageType;
  created: number | Date;
  updated?: number | Date;
  data?: string;
  key?: string;
}): IMessage | undefined => {
  let sender: IUser | IChannelUser | undefined;
  let publicKey: Uint8Array | undefined;
  let dataString: string | undefined;
  let dataFormatted: string | undefined;

  const data = opts.data ? sodium.from_base64(opts.data) : undefined;
  const key = opts.key ? sodium.from_base64(opts.key) : undefined;

  if (store.user && store.config.publicKey && opts.userId === store.user?.id) {
    sender = store.user;
    publicKey = store.config.publicKey;
  } else {
    sender = opts.channel.users.find((user) => user.id === opts.userId);
    publicKey = sender?.publicKey;
  }

  if (!sender || !publicKey) {
    console.warn(`processMessageVersions for invalid sender: ${opts.userId}`);
    return;
  }

  if (opts.data) {
    if (data && key && store.config.privateKey) {
      try {
        dataString = sodium.to_string(
          sodium.crypto_secretbox_open_easy(
            new Uint8Array(data.buffer, sodium.crypto_secretbox_NONCEBYTES),
            new Uint8Array(data.buffer, 0, sodium.crypto_secretbox_NONCEBYTES),
            sodium.crypto_box_open_easy(
              new Uint8Array(key.buffer, sodium.crypto_box_NONCEBYTES),
              new Uint8Array(key.buffer, 0, sodium.crypto_box_NONCEBYTES),
              publicKey,
              store.config.privateKey
            )
          )
        );
      } catch (e) {
        console.warn(`failed to decrypt message: ${opts.id}`);
      }
    }

    if (data && !key) {
      try {
        dataString = sodium.to_string(data);
      } catch {
        //
      }
    }

    if (opts.type === MessageType.Text && dataString) {
      dataFormatted = messageFormatter.render(dataString).trim();
    }

    if (opts.type === MessageType.GroupName && dataString) {
      dataString = `${sender.name} set the group name to "${dataString}"`;
    }

    if (
      [MessageType.GroupAdd, MessageType.GroupRemove].indexOf(opts.type) !==
        -1 &&
      opts.data
    ) {
      let target: IChannelUser | IUser | undefined;

      if (store.user && opts.data === store.user?.id) {
        target = store.user;
      } else {
        target = opts.channel.users.find((user) => user.id === opts.data);
      }

      if (!target) {
        console.warn(`processMessageVersions for invalid target: ${opts.data}`);
        return;
      }

      if (opts.type === MessageType.GroupAdd) {
        dataString = `${sender.name} added ${target.name}`;
      }

      if (opts.type === MessageType.GroupRemove) {
        dataString = `${sender.name} removed ${target.name}`;
      }
    }
  } else {
    if (opts.type === MessageType.GroupCreate) {
      dataString = `${sender.name} created a group`;
    }

    if (opts.type === MessageType.FriendAccept) {
      if (sender === store.user) {
        dataString = `You accepted ${opts.channel.users[0].name}'s friend request`;
      } else {
        dataString = `${opts.channel.users[0].name} accepted your friend request`;
      }
    }

    if (opts.type === MessageType.GroupAvatar) {
      dataString = `${sender.name} set the group avatar`;
    }

    if (opts.type === MessageType.GroupLeave) {
      dataString = `${sender.name} left the group`;
    }
  }

  return {
    id: opts.id,
    userId: opts.userId,
    type: opts.type,
    created: new Date(opts.created),
    updated: opts.updated ? new Date(opts.updated) : undefined,
    data,
    dataString,
    dataFormatted,
    key,
  };
};

export const notifySend = (opts: {
  icon: string;
  title: string;
  body: string;
}) => {
  if (store.user?.wantStatus === Status.Busy) {
    return;
  }

  if (store.config.notifySound) {
    playSound(SoundNotification);
  }

  if (store.config.notifySystem) {
    try {
      new Notification(opts.title, {
        icon: opts.icon,
        body: opts.body,
        silent: true,
      });
    } catch {
      //
    }
  }
};

export const notifyGetAvatarUrl = async (
  avatarId: string | undefined
): Promise<string> => {
  if (!avatarId) {
    return ImageIcon;
  }

  return `/api/avatars/${avatarId}/${AvatarType.WEBP}`;
};

export const callUpdatePersist = async () => {
  await store.writeConfig(
    "callPersist",
    store.call &&
      JSON.stringify({
        // idk why we JSON'd it but otherwise, IDB will shit itself.
        updated: +new Date(),
        channelId: store.call.channelId,
        localStreams: store.call.localStreams.map((stream) => stream.type),
      } as ICallPersist)
  );
};

export const isDesktop = !!window.HyalusDesktop;
export const isMobile = navigator.userAgent.includes("Mobile");

export const playSound = (url: string) => {
  try {
    const el = document.createElement("audio") as IHTMLAudioElement;
    el.src = url;
    el.volume = 0.5;
    el.setSinkId(store.config.audioOutput);
    el.play();
  } catch {
    //
  }
};

export const updateIcon = async () => {
  (document.querySelector("link[rel='icon']") as HTMLLinkElement).href = (
    await import(
      `../assets/images/icon-standalone-${ColorTheme[
        store.config.colorTheme
      ].toLowerCase()}.png`
    )
  ).default;
};
