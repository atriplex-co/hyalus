<template>
  <ModalBase
    :show="show"
    title="Edit message"
    submit-text="Edit"
    @submit="messageBoxSubmit"
    @close="$emit('close')"
  >
    <template #icon>
      <PencilIcon />
    </template>
    <template #main>
      <ModalError v-if="error" :error="error" />
      <p>Users can see if a message is edited.</p>
      <textarea
        ref="messageBox"
        v-model="messageBoxText"
        rows="1"
        placeholder="Send a message"
        class="max-h-32 w-full resize-none rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-gray-300 outline-none transition focus:border-gray-500 focus:outline-none"
        @input="messageBoxInput"
        @keydown="messageBoxKeydown"
      />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalError from "./ModalError.vue";
import { ref, PropType, Ref, watch } from "vue";
import { prettyError } from "../global/helpers";
import { IMessage, IChannel } from "../global/types";
import sodium from "libsodium-wrappers";
import PencilIcon from "../icons/PencilIcon.vue";
import axios from "axios";
import { useStore } from "../global/store";

const store = useStore();

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
  show: {
    type: Boolean,
  },
});

const emit = defineEmits(["close"]);

const messageBox: Ref<HTMLTextAreaElement | null> = ref(null);
const messageBoxText = ref("");
const error = ref("");

const messageBoxSubmit = async () => {
  const data = messageBoxText.value.trim();

  try {
    if (data) {
      if (!store.user || !store.config.publicKey || !store.config.privateKey) {
        return;
      }

      const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

      const keys = [];

      for (const user of props.channel.users.filter((u) => !u.hidden)) {
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
                store.config.privateKey
              ),
            ])
          ),
        });
      }

      const selfKeyNonce = sodium.randombytes_buf(
        sodium.crypto_secretbox_NONCEBYTES
      );

      keys.push({
        userId: store.user.id,
        data: sodium.to_base64(
          new Uint8Array([
            ...selfKeyNonce,
            ...sodium.crypto_box_easy(
              key,
              selfKeyNonce,
              store.config.publicKey,
              store.config.privateKey
            ),
          ])
        ),
      });

      await axios.post(
        `/api/channels/${props.channel.id}/messages/${props.message.id}/data`,
        {
          data: sodium.to_base64(
            new Uint8Array([
              ...nonce,
              ...sodium.crypto_secretbox_easy(data, nonce, key),
            ])
          ),
          keys,
        }
      );
    } else {
      await axios.delete(
        `/api/channels/${props.channel.id}/messages/${props.message.id}`
      );
    }
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  emit("close");
};

const messageBoxInput = () => {
  if (!messageBox.value) {
    return;
  }

  messageBox.value.focus();
  messageBox.value.style.height = "auto";
  messageBox.value.style.height = `${messageBox.value.scrollHeight + 2}px`; // +2px for border
};

const messageBoxKeydown = (e: KeyboardEvent) => {
  if (e.code === "Enter" && !e.shiftKey) {
    e.preventDefault();
    messageBoxSubmit();
  }
};

watch(
  () => props.show,
  () => {
    error.value = "";
    messageBoxText.value = props.message.dataString || "";

    setTimeout(() => {
      messageBoxInput();
    }, 10);
  }
);
</script>
