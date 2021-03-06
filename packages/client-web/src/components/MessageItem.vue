<template>
  <div
    ref="root"
    class="select-text"
    :class="{
      'pt-2': firstInChunk && !showDate && !embedded,
    }"
  >
    <p
      v-if="showDate && !embedded"
      class="mt-4 mb-2 border-t border-gray-700 py-4 text-center text-sm text-gray-300"
    >
      {{ date }}
    </p>
    <div
      v-if="isEvent(message)"
      class="group flex items-center justify-between border-l-2 bg-gray-700 p-3 text-sm"
      :class="{
        'border-gray-500': !sentByMe,
        'border-primary-500': sentByMe,
      }"
    >
      <div class="flex space-x-3">
        <FriendsIcon
          v-if="message.type === MessageType.FriendAccept"
          class="h-5 w-5 text-gray-400"
        />
        <GroupIcon
          v-if="message.type === MessageType.GroupCreate"
          class="h-5 w-5 text-gray-400"
        />
        <UserAddIcon
          v-if="message.type === MessageType.GroupAdd"
          class="h-5 w-5 text-gray-400"
        />
        <UserRemoveIcon
          v-if="message.type === MessageType.GroupRemove"
          class="h-5 w-5 text-gray-400"
        />
        <LogoutIcon
          v-if="message.type === MessageType.GroupLeave"
          class="h-5 w-5 text-gray-400"
        />
        <PencilIcon
          v-if="message.type === MessageType.GroupName"
          class="h-5 w-5 text-gray-400"
        />
        <PhotographIcon
          v-if="message.type === MessageType.GroupAvatar"
          class="h-5 w-5 text-gray-400"
        />
        <p>{{ message.dataString }}</p>
      </div>
      <p class="text-gray-400 opacity-0 transition group-hover:opacity-100">
        {{ time }}
      </p>
    </div>
    <div
      v-if="!isEvent(message)"
      class="group flex items-end space-x-2 text-white"
      :class="{
        'mx-2': !embedded,
      }"
    >
      <div class="h-8 w-8">
        <UserAvatar
          v-if="lastInChunk || embedded"
          :id="user.avatarId"
          class="h-8 w-8 flex-shrink-0 rounded-full"
        />
      </div>
      <div class="flex max-w-full flex-1 flex-col items-start space-y-1">
        <p
          v-if="firstInChunk && channel.type === ChannelType.Group && !embedded"
          class="mt-1 text-xs text-gray-400"
        >
          {{ user.name }}
        </p>
        <div class="flex max-w-full flex-1 items-center space-x-3">
          <div
            class="flex flex-1 flex-col overflow-hidden break-words rounded-md text-sm"
            :class="{
              'from-primary-500 to-primary-600 bg-gradient-to-br':
                sentByMe && !previewUrl,
              'bg-gray-700': !sentByMe && !previewUrl,
            }"
          >
            <!-- eslint-disable vue/no-v-html -->
            <div
              v-if="message.type === MessageType.Text"
              class="whitespace-pre-wrap p-2"
              v-html="message.dataFormatted"
            />
            <!-- eslint-enable -->
            <div v-if="file">
              <div v-if="!previewUrl" class="flex items-center space-x-2 p-2">
                <div
                  v-if="!embedded"
                  class="bg-primary-400 h-8 w-8 rounded-full p-2"
                  :class="{
                    'cursor-pointer': !fileDownloadActive,
                  }"
                  @click="fileDownload(true)"
                >
                  <DownloadIcon v-if="!fileDownloadActive" />
                  <LoadingIcon v-if="fileDownloadActive" />
                </div>
                <div>
                  <p class="font-bold">{{ file.name }}</p>
                  <p
                    class="text-xs"
                    :class="{
                      'text-primary-200': sentByMe,
                      'text-gray-300': !sentByMe,
                    }"
                  >
                    {{ file.sizeFormatted }}
                  </p>
                </div>
              </div>
              <div v-if="previewUrl" class="flex items-center justify-center">
                <img
                  v-if="file.type.split('/')[0] === 'image'"
                  :src="previewUrl"
                  class="max-h-96 cursor-pointer rounded-md"
                  @error="delPreview"
                  @click="imageView = true"
                />
                <video
                  v-if="file.type.split('/')[0] === 'video'"
                  :src="previewUrl"
                  class="max-h-96 rounded-md"
                  controls
                  @error="delPreview"
                />
                <audio
                  v-if="file.type.split('/')[0] === 'audio'"
                  :src="previewUrl"
                  controls
                  @error="delPreview"
                />
              </div>
            </div>
          </div>
          <div
            class="flex flex-shrink-0 items-center space-x-2 text-gray-400 transition"
            :class="{
              'pr-12 opacity-0 group-hover:opacity-100': !embedded,
              'pr-2': embedded,
            }"
          >
            <template v-if="!embedded">
              <div
                v-if="sentByMe"
                class="h-4 w-4 cursor-pointer hover:text-gray-200"
                @click="del"
              >
                <TrashIcon />
              </div>
              <div
                v-if="sentByMe && message.type === MessageType.Text"
                class="h-4 w-4 cursor-pointer hover:text-gray-200"
                @click="editModal = true"
              >
                <PencilIcon />
              </div>
              <a
                v-if="previewUrl"
                class="h-4 w-4 cursor-pointer hover:text-gray-200"
                :href="previewUrl"
                :download="file?.name"
              >
                <DownloadIcon />
              </a>
            </template>
            <p class="text-xs">{{ time }}</p>
          </div>
        </div>
      </div>
    </div>
    <ImageView
      :show="!!previewUrl && imageView"
      :src="previewUrl || ''"
      @close="imageView = false"
    />
    <MessageDeleteModal
      :show="deleteModal"
      :message="message"
      :channel="channel"
      @close="deleteModal = false"
    >
      <MessageItem :channel="channel" :message="message" embedded />
    </MessageDeleteModal>
    <MessageEditModal
      :show="editModal"
      :message="message"
      :channel="channel"
      @close="editModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from "./UserAvatar.vue";
import ImageView from "./ImageView.vue";
import MessageDeleteModal from "./MessageDeleteModal.vue";
import MessageEditModal from "./MessageEditModal.vue";
import TrashIcon from "../icons/TrashIcon.vue";
import FriendsIcon from "../icons/FriendsIcon.vue";
import GroupIcon from "../icons/GroupIcon.vue";
import UserAddIcon from "../icons/UserAddIcon.vue";
import UserRemoveIcon from "../icons/UserRemoveIcon.vue";
import LogoutIcon from "../icons/LogoutIcon.vue";
import DownloadIcon from "../icons/DownloadIcon.vue";
import LoadingIcon from "../icons/LoadingIcon.vue";
import PencilIcon from "../icons/PencilIcon.vue";
import PhotographIcon from "../icons/PhotographIcon.vue";
import Day from "dayjs";
import { ref, computed, onBeforeUnmount, onMounted, PropType, Ref } from "vue";
import { IChannel, IMessage, ISocketMessage } from "../global/types";
import { idbGet, idbSet } from "../global/idb";
import { iceServers, MaxFileSize, MaxFileChunkSize } from "../global/config";
import {
  MessageType,
  ChannelType,
  SocketMessageType,
  FileChunkRTCType,
} from "common";
import {
  crypto_box_easy,
  crypto_box_NONCEBYTES,
  crypto_box_open_easy,
  crypto_hash,
  crypto_secretstream_xchacha20poly1305_init_pull,
  crypto_secretstream_xchacha20poly1305_pull,
  from_base64,
  randombytes_buf,
  to_base64,
  to_string,
} from "libsodium-wrappers";
import axios from "axios";
import { useStore } from "../global/store";

const store = useStore();

const chunkThreshold = 1000 * 60 * 5;

const props = defineProps({
  message: {
    type: Object as PropType<IMessage>,
    default() {
      //
    },
  },
  channel: {
    type: Object as PropType<IChannel>,
    default() {
      //
    },
  },
  embedded: {
    type: Boolean,
    default: false,
  },
});

const date = ref("");
const previewUrl: Ref<string | null> = ref("");
const imageView = ref(false);
const deleteModal = ref(false);
const editModal = ref(false);
const root: Ref<HTMLDivElement | null> = ref(null);
const fileDownloadActive = ref(false);

let updateDateInterval: number;

const sentByMe = computed(() => {
  if (!store.user) {
    return false; // hmr seems to cause the store to get broken here. (just reload, or fix it.)
  }

  return props.message.userId === store.user.id;
});

const user = computed(() => {
  if (store.user && sentByMe.value) {
    return store.user;
  }

  const user = props.channel.users.find(
    (user) => user.id === props.message.userId
  );

  if (user) {
    return user;
  }

  return {
    id: "",
    name: "Unknown",
    avatarId: undefined,
  };
});

const time = Day(props.message.created).format("LT");

const precedingMessage = computed(
  () =>
    props.channel.messages[props.channel.messages.indexOf(props.message) - 1]
);

const supersedingMessage = computed(
  () =>
    props.channel.messages[props.channel.messages.indexOf(props.message) + 1]
);

const firstInChunk = computed(() => {
  if (isEvent(props.message)) {
    return !precedingMessage.value || !isEvent(precedingMessage.value);
  }

  return (
    !precedingMessage.value ||
    isEvent(precedingMessage.value) ||
    props.message.userId !== precedingMessage.value.userId ||
    +props.message.created - +precedingMessage.value.created > chunkThreshold
  );
});

const lastInChunk = computed(
  () =>
    !supersedingMessage.value ||
    isEvent(supersedingMessage.value) ||
    props.message.userId !== supersedingMessage.value.userId ||
    +supersedingMessage.value.created - +props.message.created > chunkThreshold
);

const showDate = computed(
  () =>
    !precedingMessage.value ||
    precedingMessage.value.created.toDateString() !==
      props.message.created.toDateString()
);

const isEvent = (message: IMessage) =>
  [
    MessageType.FriendAccept,
    MessageType.GroupCreate,
    MessageType.GroupName,
    MessageType.GroupAvatar,
    MessageType.GroupAdd,
    MessageType.GroupRemove,
    MessageType.GroupLeave,
  ].includes(message.type);

const fileDownload = async (save: boolean) => {
  if (!file.value || fileDownloadActive.value) {
    return;
  }

  if (file.value.size > MaxFileSize) {
    console.warn(`file too large: ${props.message.id}`);
    return;
  }

  fileDownloadActive.value = true;

  const state = crypto_secretstream_xchacha20poly1305_init_pull(
    file.value.header,
    file.value.key
  );

  const data = new Uint8Array(file.value.size);
  let dataOffset = 0;

  for (const hash of file.value.chunks) {
    let chunk = (await idbGet(`file:${hash}`)) as Uint8Array | undefined;

    if (!chunk) {
      const pc = new RTCPeerConnection({ iceServers });
      const packets: Uint8Array[] = [];
      const tag = to_base64(randombytes_buf(16));
      let publicKey: Uint8Array | undefined;

      const send = (val: unknown) => {
        if (!publicKey) {
          return;
        }

        const jsonRaw = JSON.stringify(val);
        const json = JSON.parse(jsonRaw);
        console.debug("f_rtc/tx: %o", {
          ...json,
          t: FileChunkRTCType[json.t],
        }); // yes, there's a reason for this.
        const nonce = randombytes_buf(crypto_box_NONCEBYTES);

        store.socket?.send({
          t: SocketMessageType.CFileChunkRTC,
          d: {
            hash,
            tag,
            data: to_base64(
              new Uint8Array([
                ...nonce,
                ...crypto_box_easy(
                  jsonRaw,
                  nonce,
                  publicKey,
                  store.config.privateKey as unknown as Uint8Array
                ),
              ])
            ),
          },
        });
      };

      await new Promise((resolve) => {
        pc.addEventListener("icecandidate", ({ candidate }) => {
          if (!candidate) {
            return;
          }

          send({
            t: FileChunkRTCType.ICECandidate,
            d: JSON.stringify(candidate),
          });
        });

        pc.addEventListener("datachannel", ({ channel: dc }) => {
          dc.addEventListener("open", () => {
            console.debug("f_rtc/dc: open");
          });

          dc.addEventListener("close", () => {
            console.debug("f_rtc/dc: close");
          });

          dc.addEventListener("message", async ({ data }) => {
            const chunkLength =
              packets.length &&
              packets.map((p) => p.length).reduce((a, b) => a + b);

            if (
              chunkLength > MaxFileChunkSize + 4096 ||
              chunkLength + dataOffset > MaxFileSize + 4096 // should include crypto_secretstream_MACBYTES's
            ) {
              console.warn(`file chunk too large: ${hash}`);
              fileDownloadActive.value = false;
              pc.close();
              return;
            }

            if (data) {
              packets.push(new Uint8Array(data));
              return;
            }

            chunk = new Uint8Array(chunkLength);

            for (let i = 0, j = 0; i < packets.length; i++) {
              chunk.set(packets[i], j);
              j += packets[i].length;
            }

            if (hash !== to_base64(crypto_hash(chunk))) {
              console.warn(`invalid data for file chunk: ${hash}`);
              chunk = undefined;
            }

            if (chunk) {
              await idbSet(`file:${hash}`, chunk);
            }

            pc.close();
            resolve(undefined);
          });
        });

        pc.addEventListener("connectionstatechange", () => {
          console.debug(`f_rtc/peer: ${pc.connectionState}`);
        });

        store.socket?.registerHook({
          ttl: 1000 * 10,
          type: SocketMessageType.SFileChunkRTC,
          async hook(msg: ISocketMessage) {
            const data = msg.d as {
              hash: string;
              tag: string;
              data: string;
              userId: string;
              channelId: string;
            };

            if (data.hash !== hash || data.tag !== tag) {
              return;
            }

            if (data.userId === store.user?.id) {
              publicKey = store.config.publicKey;
            } else {
              publicKey = props.channel.users.find(
                (user) => user.id === data.userId
              )?.publicKey;
            }

            if (!publicKey) {
              console.warn(`fileChunkRtc for invalid user: ${data.userId}`);
              return;
            }

            const dataBytes = from_base64(data.data);
            const dataDecrypted: {
              t: FileChunkRTCType;
              d: string;
            } = JSON.parse(
              to_string(
                crypto_box_open_easy(
                  new Uint8Array(dataBytes.buffer, crypto_box_NONCEBYTES),
                  new Uint8Array(dataBytes.buffer, 0, crypto_box_NONCEBYTES),
                  publicKey,
                  store.config.privateKey as unknown as Uint8Array
                )
              )
            );

            console.debug("f_rtc/rx: %o", dataDecrypted);

            if (dataDecrypted.t === FileChunkRTCType.SDP) {
              await pc.setRemoteDescription(
                new RTCSessionDescription({
                  type: "offer",
                  sdp: dataDecrypted.d,
                })
              );
              await pc.setLocalDescription(await pc.createAnswer());

              send({
                t: FileChunkRTCType.SDP,
                d: pc.localDescription?.sdp,
              });
            }

            if (dataDecrypted.t === FileChunkRTCType.ICECandidate) {
              await pc.addIceCandidate(
                new RTCIceCandidate(JSON.parse(dataDecrypted.d))
              );
            }
          },
        });

        store.socket?.send({
          t: SocketMessageType.CFileChunkRequest,
          d: {
            hash,
            tag,
            channelId: props.channel.id,
          },
        });
      });
    }

    if (!chunk) {
      console.warn(`error getting chunk: ${hash}`);
      fileDownloadActive.value = false;
      return;
    }

    const pull = crypto_secretstream_xchacha20poly1305_pull(state, chunk);

    if (!pull) {
      console.warn(`error decrypting chunk: ${hash}`);
      fileDownloadActive.value = false;
      return;
    }

    if (pull.message.length > data.length - dataOffset) {
      console.warn(`error writing chunk: ${hash}`);
      fileDownloadActive.value = false;
      return;
    }

    data.set(pull.message, dataOffset);
    dataOffset += pull.message.length;
  }

  const url = URL.createObjectURL(
    new Blob([data], {
      type: file.value.type,
    })
  );

  if (save) {
    const el = document.createElement("a");
    el.download = file.value.name;
    el.href = url;
    el.click();
    URL.revokeObjectURL(el.href); // frees up mem on next GC cycle.
  }

  fileDownloadActive.value = false;
  return url;
};

const delPreview = () => {
  if (!previewUrl.value) {
    return;
  }

  URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
};

const updateDate = () => {
  date.value = Day(props.message.created).calendar();
};

const del = async (e: MouseEvent) => {
  if (e.shiftKey) {
    await axios.delete(
      `/api/channels/${props.channel.id}/messages/${props.message.id}`
    );
  } else {
    deleteModal.value = true;
  }
};

const file = computed(() => {
  if (props.message.type !== MessageType.Attachment) {
    return;
  }

  const json = JSON.parse(props.message.dataString || "");

  let sizeFormattedUnits = "BKMG";
  let sizeFormattedUnit = 0;
  let sizeFormattedNum = json.size;
  while (sizeFormattedNum > 1000) {
    sizeFormattedNum /= 1024;
    sizeFormattedUnit++;
  }

  return {
    ...json,
    header: from_base64(json.header),
    key: from_base64(json.key),
    sizeFormatted: `${Math.floor(sizeFormattedNum)}${
      sizeFormattedUnits[sizeFormattedUnit]
    }`,
  } as {
    name: string;
    type: string;
    header: Uint8Array;
    key: Uint8Array;
    size: number;
    sizeFormatted: string;
    chunks: string[];
  };
});

onMounted(async () => {
  updateDate();
  updateDateInterval = +setInterval(updateDate, 1000 * 60);

  if (!root.value) {
    return;
  }

  new IntersectionObserver(async () => {
    if (!root.value) {
      return;
    }

    const rect = root.value.getBoundingClientRect();

    if (!(rect.top > 0 && rect.bottom < innerHeight)) {
      return;
    }

    if (
      file.value &&
      ["audio", "video", "image"].indexOf(file.value.type.split("/")[0]) !==
        -1 &&
      file.value.size < 1024 * 1024 * 20 &&
      previewUrl.value === ""
    ) {
      previewUrl.value = (await fileDownload(false)) || "";
    }
  }).observe(root.value);
});

onBeforeUnmount(() => {
  clearInterval(updateDateInterval);

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>

<style>
/* 
pre {
  @apply -m-2 bg-gray-800 p-2;
}

pre code {
  @apply border-none p-0;
}

code {
  @apply rounded-md border border-gray-600 bg-gray-800 py-1 px-2 text-gray-200;
}
*/

pre {
  @apply border-primary-500 m-[-6px] rounded-md bg-gray-800 p-2;
}

.hljs-doctag,
.hljs-keyword,
.hljs-meta .hljs-keyword,
.hljs-template-tag,
.hljs-template-variable,
.hljs-type,
.hljs-variable.language_ {
  color: #ff7b72;
}

.hljs-title,
.hljs-title.class_,
.hljs-title.class_.inherited__,
.hljs-title.function_ {
  color: #d2a8ff;
}

.hljs-attr,
.hljs-attribute,
.hljs-literal,
.hljs-meta,
.hljs-number,
.hljs-operator,
.hljs-variable,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-id {
  color: #79c0ff;
}

.hljs-regexp,
.hljs-string,
.hljs-meta .hljs-string {
  color: #a5d6ff;
}

.hljs-built_in,
.hljs-symbol {
  color: #ffa657;
}

.hljs-comment,
.hljs-code,
.hljs-formula {
  /* color: #8b949e; */
  @apply text-white;
}

.hljs-name,
.hljs-quote,
.hljs-selector-tag,
.hljs-selector-pseudo {
  color: #7ee787;
}

.hljs-subst {
  color: #c9d1d9;
}

.hljs-section {
  color: #1f6feb;
  font-weight: bold;
}

.hljs-bullet {
  color: #f2cc60;
}

.hljs-emphasis {
  color: #c9d1d9;
  font-style: italic;
}

.hljs-strong {
  color: #c9d1d9;
  font-weight: bold;
}

.hljs-addition {
  color: #aff5b4;
  background-color: #033a16;
}

.hljs-deletion {
  color: #ffdcd7;
  background-color: #67060c;
}
</style>
