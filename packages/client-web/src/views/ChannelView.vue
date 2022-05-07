<template>
  <div
    v-if="channel"
    class="flex h-full w-full flex-1 flex-col overflow-auto"
    @paste="processFiles($event.clipboardData)"
    @drop.prevent="processFiles($event.dataTransfer)"
    @dragover.prevent
    @dragstart.prevent
    @dragsend.prevent
  >
    <div class="z-10 border-b border-gray-700 shadow-xl">
      <div class="flex h-16 justify-between">
        <div class="flex min-w-0 items-center">
          <router-link
            v-if="isMobile"
            class="ml-2 h-8 w-8 rounded-full bg-gray-600 p-1.5 text-gray-300 transition hover:bg-gray-500"
            to="/app"
          >
            <ArrowLeftIcon />
          </router-link>
          <div
            class="flex h-16 w-16 items-center justify-center"
            :class="{ 'cursor-pointer': channel.owner }"
            @click="setAvatar"
          >
            <UserAvatar
              v-if="avatarId || channel.type === ChannelType.Private"
              :id="avatarId"
              :status="
                channel.type === ChannelType.Private
                  ? channel.users[0].status
                  : undefined
              "
              class="h-10 w-10 rounded-full"
            />
            <EmptyAvatar v-else :name="name" class="h-10 w-10" />
          </div>
          <div class="min-w-0 flex-1">
            <p
              class="truncate text-lg font-bold"
              :class="{ 'cursor-pointer': channel.owner }"
              @click="setName"
            >
              {{ name }}
            </p>
            <p class="-mt-1 text-sm text-gray-400">{{ description }}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2 px-2 text-gray-300">
          <div v-if="voiceUsers.length" class="mr-2 flex -space-x-2">
            <UserAvatar
              v-for="user in voiceUsersShown"
              :id="user.avatarId"
              :key="user.id"
              class="h-7 w-7 rounded-full border border-gray-900"
            />
            <div
              v-if="voiceUsers.length !== voiceUsersShown.length"
              class="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full border border-gray-900 text-xs font-bold text-white"
            >
              <p>+{{ voiceUsers.length - voiceUsersShown.length }}</p>
            </div>
          </div>
          <div
            class="h-8 w-8 cursor-pointer rounded-full bg-gray-600 p-2 transition hover:bg-gray-500"
            @click="callStart"
          >
            <PhoneIcon />
          </div>
          <div
            class="h-8 w-8 cursor-pointer rounded-full bg-gray-600 p-2 transition hover:bg-gray-500"
            @click="showInfo = !showInfo"
          >
            <DotsIcon />
          </div>
        </div>
      </div>
      <transition
        enter-active-class="transition transform ease-out duration-100 origin-top"
        enter-from-class="opacity-0 scale-y-95"
        enter-to-class="opacity-100 scale-y-100"
        leave-active-class="transition transform ease-in duration-75 origin-top"
        leave-from-class="opacity-100 scale-y-100"
        leave-to-class="opacity-0 scale-y-95"
      >
        <ChannelCall v-if="inCall" />
      </transition>
      <p
        v-if="!writable"
        class="border-b border-gray-700 bg-gray-900 px-4 py-2 text-sm"
      >
        You can't send messages in this channel.
      </p>
    </div>
    <div class="relative flex min-h-0 w-full flex-1">
      <div v-if="typingStatus" class="absolute z-10 w-full p-2">
        <div
          :class="{
            'pr-80': showInfo,
          }"
        >
          <div
            class="flex w-full items-center space-x-4 rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm shadow-lg"
          >
            <PencilIcon class="h-4 w-4 text-gray-400" />
            <p>{{ typingStatus }}</p>
          </div>
        </div>
      </div>
      <div
        id="messageList"
        ref="messageList"
        class="flex flex-1 flex-col space-y-1 overflow-auto overflow-x-hidden"
      >
        <div ref="messageListBefore" class="flex-1 pt-2"></div>
        <MessageItem
          v-for="message in channel.messages"
          :key="message.id"
          :message="message"
          :channel="channel"
        />
        <div id="messageListAfter" ref="messageListAfter" class="pb-2"></div>
      </div>
      <ChannelInfo
        v-if="showInfo"
        class="absolute top-0 right-0"
        :channel="channel"
        @close="showInfo = false"
      />
    </div>
    <div
      v-if="writable"
      class="flex items-center space-x-4 border-t border-gray-700 px-4 py-3"
    >
      <textarea
        ref="messageBox"
        v-model="messageBoxText"
        rows="1"
        placeholder="Send a message"
        class="max-h-32 flex-1 resize-none border-transparent bg-transparent outline-none focus:border-transparent"
        @input="messageBoxInput"
        @keydown="messageBoxKeydown"
      />
      <div class="flex space-x-2 text-gray-300">
        <div @click="attachFile">
          <PaperclipIcon
            class="h-8 w-8 cursor-pointer rounded-full bg-gray-600 p-2 transition hover:bg-gray-500"
          />
        </div>
        <div @click="messageBoxSubmit">
          <AirplaneIcon
            class="h-8 w-8 cursor-pointer rounded-full bg-gray-600 p-2 transition hover:bg-gray-500"
          />
        </div>
      </div>
    </div>
    <GroupNameModal
      :show="groupNameModal"
      :channel="channel"
      @close="groupNameModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from "../components/UserAvatar.vue";
import EmptyAvatar from "../components/EmptyAvatar.vue";
import PhoneIcon from "../icons/PhoneIcon.vue";
import DotsIcon from "../icons/DotsIcon.vue";
import PaperclipIcon from "../icons/PaperclipIcon.vue";
import AirplaneIcon from "../icons/AirplaneIcon.vue";
import MessageItem from "../components/MessageItem.vue";
import GroupNameModal from "../components/GroupNameModal.vue";
import PencilIcon from "../icons/PencilIcon.vue";
import ChannelInfo from "../components/ChannelInfo.vue";
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  Ref,
  nextTick,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { axios, processMessage, isMobile } from "../global/helpers";
import { store } from "../global/store";
import { idbSet } from "../global/idb";
import {
  CallStreamType,
  ChannelType,
  MessageType,
  SocketMessageType,
} from "common";
import sodium from "libsodium-wrappers";
import ChannelCall from "../components/ChannelCall.vue";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import { MaxFileSize, MaxFileChunkSize } from "../global/config";

const route = useRoute();
const router = useRouter();
const messageBoxText = ref("");
const groupNameModal = ref(false);
const showInfo = ref(false);
const messageBox: Ref<HTMLTextAreaElement | null> = ref(null);
const messageList: Ref<HTMLDivElement | null> = ref(null);
const messageListBefore: Ref<HTMLDivElement | null> = ref(null);
const messageListAfter: Ref<HTMLDivElement | null> = ref(null);
const typingStatus = ref("");
let lastTyping = 0;
let updateInterval: number;
let scrollUpdated = false; // make sure chat is scrolled down when initially loaded.

const channel = computed(() => {
  return store.state.value.channels.find(
    (channel) => channel.id === route.params.channelId
  );
});

const name = computed(() => {
  if (!channel.value) {
    return "Unknown";
  }

  if (channel.value.type === ChannelType.Private) {
    return channel.value.users[0].name;
  }

  return channel.value.name;
});

const avatarId = computed(() => {
  if (!channel.value) {
    return "Unknown";
  }

  if (channel.value.type === ChannelType.Private) {
    return channel.value.users[0].avatarId;
  }

  return channel.value.avatarId;
});

const description = computed(() => {
  if (!channel.value) {
    return "Unknown";
  }

  if (channel.value.type === ChannelType.Private) {
    return `@${channel.value.users[0].username}`;
  }

  if (channel.value.type === ChannelType.Group) {
    const users = channel.value.users.filter((user) => !user.hidden);

    return `${users.length + 1} member${users.length ? "s" : ""}`;
  }

  return "";
});

const voiceUsers = computed(() => {
  if (!channel.value) {
    return [];
  }

  return channel.value.users.filter((user) => user.inCall);
});

const voiceUsersShown = computed(() =>
  voiceUsers.value.slice(0, voiceUsers.value.length > 4 ? 3 : 4)
);

const writable = computed(() => {
  if (!channel.value) {
    return false;
  }

  if (channel.value.type === ChannelType.Private) {
    const friendId = channel.value.users[0].id;

    return store.state.value.friends.find((friend) => friend.id === friendId)
      ?.accepted;
  }

  return true;
});

const inCall = computed(() => {
  return (
    store.state.value.call &&
    store.state.value.call.channelId === channel.value?.id
  );
});

const getMessages = async (method: "before" | "after") => {
  // dereference ref->state to prevent change during HTTP request.
  const channelObj = store.state.value.channels.find(
    (channel2) => channel2.id === channel.value?.id
  );

  if (!channelObj) {
    return;
  }

  const {
    data: messages,
  }: {
    data: {
      id: string;
      userId: string;
      type: MessageType;
      created: number;
      updated?: number;
      data?: string;
      key?: string;
    }[];
  } = await axios.get(
    `/api/channels/${channelObj.id}/messages?${
      method === "before" ? `before=${+channelObj.messages[0].created}` : ""
    }${
      method === "after"
        ? `after=${+(
            channelObj.messages.at(-1)?.created || channelObj.created
          )}`
        : ""
    }`
  );

  for (const _message of messages) {
    const message = processMessage({
      ..._message,
      channel: channelObj,
    });

    if (!message) {
      return;
    }

    channelObj.messages = channelObj.messages.filter(
      (message2) => message2.id !== message.id
    );

    channelObj.messages.push(message);
  }

  channelObj.messages.sort((a, b) => (a.created > b.created ? 1 : -1));

  store.state.value.channels.sort((a, b) =>
    (a.messages.at(-1)?.created || a.created) <
    (b.messages.at(-1)?.created || b.created)
      ? 1
      : -1
  );
};

const sendMessage = async (type: MessageType, data: string) => {
  if (
    !channel.value ||
    !store.state.value.user ||
    !store.state.value.config.publicKey ||
    !store.state.value.config.privateKey
  ) {
    return;
  }

  const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

  const keys = [];

  for (const user of channel.value.users.filter((u) => !u.hidden)) {
    const userKeyNonce = sodium.randombytes_buf(
      sodium.crypto_secretbox_NONCEBYTES
    );

    keys.push({
      userId: user.id,
      data: sodium.to_base64(
        new Uint8Array([
          ...userKeyNonce,
          ...sodium.crypto_box_easy(
            key,
            userKeyNonce,
            user.publicKey,
            store.state.value.config.privateKey
          ),
        ])
      ),
    });
  }

  const selfKeyNonce = sodium.randombytes_buf(
    sodium.crypto_secretbox_NONCEBYTES
  );

  keys.push({
    userId: store.state.value.user.id,
    data: sodium.to_base64(
      new Uint8Array([
        ...selfKeyNonce,
        ...sodium.crypto_box_easy(
          key,
          selfKeyNonce,
          store.state.value.config.publicKey,
          store.state.value.config.privateKey
        ),
      ])
    ),
  });

  await axios.post(`/api/channels/${channel.value.id}/messages`, {
    type,
    data: sodium.to_base64(
      new Uint8Array([
        ...nonce,
        ...sodium.crypto_secretbox_easy(data, nonce, key),
      ])
    ),
    keys,
  });
};

const messageBoxSubmit = async () => {
  const data = messageBoxText.value.trim();
  messageBoxText.value = "";
  await nextTick();
  messageBoxInput();

  if (!data) {
    return;
  }

  await sendMessage(MessageType.Text, data);
};

const messageBoxInput = async () => {
  if (!messageBox.value) {
    return;
  }

  messageBox.value.focus();
  messageBox.value.style.height = "auto";
  messageBox.value.style.height = `${messageBox.value.scrollHeight}px`;

  if (store.state.value.user?.typingEvents && +new Date() - 2000 > lastTyping) {
    lastTyping = +new Date();

    store.state.value.socket?.send({
      t: SocketMessageType.CChannelTyping,
      d: {
        id: channel.value?.id,
      },
    });
  }
};

const messageBoxKeydown = (e: KeyboardEvent) => {
  if (e.code === "Enter" && !e.shiftKey) {
    e.preventDefault();
    messageBoxSubmit();
  }
};

const setAvatar = () => {
  if (!channel.value || !channel.value.owner) {
    return;
  }

  const el = document.createElement("input");

  el.addEventListener("input", async () => {
    if (!channel.value || !channel.value.owner || !el.files) {
      return;
    }

    const form = new FormData();
    form.append("avatar", el.files[0]);

    await axios.post(`/api/channels/${channel.value.id}/avatar`, form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  });

  el.type = "file";
  el.click();
};

const setName = () => {
  if (channel.value && channel.value.owner) {
    groupNameModal.value = true;
  }
};

const callStart = async (e: MouseEvent) => {
  if (!channel.value) {
    return;
  }

  if (store.state.value.call) {
    await store.callReset();

    store.state.value.socket?.send({
      t: SocketMessageType.CCallStop,
    });
  }

  await store.callStart(channel.value.id);

  if (!e.shiftKey) {
    await store.callAddLocalStream({
      type: CallStreamType.Audio,
      silent: true,
    });
  }
};

const uploadFile = async (file: File) => {
  if (file.size > MaxFileSize) {
    console.warn(`file too large: ${file.size} > ${MaxFileChunkSize}`);
    return;
  }

  const key = sodium.crypto_secretstream_xchacha20poly1305_keygen();
  const { state, header } =
    sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
  const chunks = [];
  const reader = new FileReader();

  for (let i = 0; i < Math.ceil(file.size / MaxFileChunkSize); i++) {
    const data = sodium.crypto_secretstream_xchacha20poly1305_push(
      state,
      await new Promise((cb) => {
        reader.onload = () => cb(new Uint8Array(reader.result as ArrayBuffer));
        reader.readAsArrayBuffer(
          file.slice(
            i * MaxFileChunkSize,
            i * MaxFileChunkSize + MaxFileChunkSize
          )
        );
      }),
      "",
      sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE
    );

    const hash = sodium.to_base64(sodium.crypto_hash(data));
    chunks.push(hash);

    await idbSet(`file:${hash}`, data);

    store.state.value.socket?.send({
      t: SocketMessageType.CFileChunkOwned,
      d: {
        hash,
      },
    });
  }

  await sendMessage(
    MessageType.Attachment,
    JSON.stringify({
      name: file.name,
      type: file.type,
      size: file.size,
      header: sodium.to_base64(header),
      key: sodium.to_base64(key),
      chunks,
    })
  );
};

const processFiles = async (data: DataTransfer | null) => {
  if (!data) {
    return;
  }

  const files = [...(data.items as unknown as DataTransferItem[])]
    .filter((i) => i.kind === "file")
    .map((i) => i.getAsFile());

  for (const file of files) {
    if (!file) {
      return;
    }

    await uploadFile(file);
  }
};

const attachFile = async () => {
  const el = document.createElement("input");

  el.addEventListener("input", async () => {
    if (!el.files) {
      return;
    }

    for (const file of [...(el.files as unknown as File[])]) {
      await uploadFile(file);
    }
  });

  el.type = "file";
  el.multiple = true;
  el.click();
};

const update = async () => {
  if (!channel.value) {
    await router.push("/app");
    return;
  }

  document.title = `Hyalus \u2022 ${name.value}`;

  const typingUsers = channel.value.users
    .filter((u) => !u.hidden && +u.lastTyping > +new Date() - 1000 * 3)
    .map((u) => u.name);

  typingStatus.value =
    typingUsers.length < 4
      ? [
          "",
          `${typingUsers[0]} is typing...`,
          `${typingUsers[0]}, and ${typingUsers[1]} are typing...`,
          `${typingUsers[0]}, ${typingUsers[1]}, and ${typingUsers[2]} are typing...`,
        ][typingUsers.length]
      : "Many users are typing...";
};

onMounted(async () => {
  if (!channel.value) {
    return;
  }

  await update();
  updateInterval = +setInterval(update, 100);

  if (
    !messageBox.value ||
    !messageList.value ||
    !messageListBefore.value ||
    !messageListAfter.value
  ) {
    return;
  }

  new MutationObserver(async () => {
    await update();

    if (!messageList.value) {
      return;
    }

    if (!scrollUpdated) {
      scrollUpdated = true;
      messageList.value.scrollTop = messageList.value.scrollHeight;
    }
  }).observe(messageList.value, {
    childList: true,
  });

  new IntersectionObserver(() => getMessages("before")).observe(
    messageListBefore.value
  );

  new IntersectionObserver(() => getMessages("after")).observe(
    messageListAfter.value
  );

  messageBox.value.focus();
  messageList.value.scrollTop = messageList.value.scrollHeight;
});

onUnmounted(() => {
  clearInterval(updateInterval);
});

watch(
  () => channel.value,
  () => {
    if (!channel.value) {
      return;
    }

    channel.value.messages = channel.value.messages.slice(-100);
  }
);

store.state.value.sideBarOpen = false;
</script>

<style scoped>
#messageList * {
  overflow-anchor: none;
}

#messageListAfter {
  overflow-anchor: auto;
}
</style>
