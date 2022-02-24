<template>
  <ModalBase
    :show="show"
    title="Delete message"
    submit-text="Delete"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <TrashIcon />
    </template>
    <template #main>
      <ModalError v-if="error" :error="error" />
      <div class="w-full space-y-4">
        <p>Are you sure you want to delete this message?</p>
        <div
          ref="container"
          class="max-h-48 w-full overflow-auto overflow-x-hidden rounded-md border border-gray-600 bg-gray-800 p-2"
        >
          <slot />
        </div>
      </div>
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalError from "./ModalError.vue";
import TrashIcon from "../icons/TrashIcon.vue";
import { ref, PropType, Ref, watch } from "vue";
import { axios, prettyError } from "../global/helpers";
import { IMessage, IChannel } from "../global/types";

const props = defineProps({
  show: {
    type: Boolean,
  },
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
});

const emit = defineEmits(["close"]);

const container: Ref<HTMLDivElement | null> = ref(null);
const error = ref("");

const submit = async () => {
  try {
    await axios.delete(
      `/api/channels/${props.channel.id}/messages/${props.message.id}`
    );
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  emit("close");
};

watch(
  () => props.show,
  () => {
    error.value = "";

    if (props.show) {
      setTimeout(() => {
        if (!container.value) {
          return;
        }

        new MutationObserver(() => {
          setTimeout(() => {
            if (!container.value) {
              return;
            }

            container.value.scrollTop = container.value.scrollHeight;
          });
        }).observe(container.value, {
          childList: true,
          subtree: true,
        });
      });
    }
  }
);
</script>
