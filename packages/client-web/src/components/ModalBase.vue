<template>
  <div>
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" class="fixed inset-0 z-40 bg-black bg-opacity-75" />
    </transition>
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center"
      @mousedown="$emit('close')"
    >
      <transition
        enter-active-class="transition transform ease-out duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition transform ease-in duration-100"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="show2"
          class="overflow-hidden rounded-md bg-gray-700 shadow-2xl"
          @mousedown.stop
        >
          <slot v-if="empty" />
          <div v-else class="w-96 overflow-hidden opacity-100">
            <div class="space-y-4 p-4">
              <div class="flex items-center space-x-2">
                <div
                  class="h-8 w-8 rounded-full border border-gray-500 bg-gray-600 p-2 text-gray-200"
                >
                  <slot name="icon" />
                </div>
                <p class="text-xl font-bold text-gray-200">
                  {{ title }}
                </p>
              </div>
              <form
                class="flex flex-col items-start space-y-4 pb-2 text-sm text-gray-300"
                @submit.prevent="$emit('submit')"
              >
                <slot name="main" />
              </form>
            </div>
            <div
              class="flex items-center justify-end space-x-2 bg-gray-800 p-4 text-sm"
            >
              <p
                class="cursor-pointer px-4 py-2 text-gray-400"
                @click="$emit('close')"
              >
                Cancel
              </p>
              <p
                class="bg-primary-500 cursor-pointer rounded-md px-4 py-2 text-white shadow-sm"
                @click="$emit('submit')"
              >
                {{ submitText }}
              </p>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";

const show2 = ref(false);

const emit = defineEmits(["close", "submit"]);

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  submitText: {
    type: String,
    default: "Submit",
  },
  empty: {
    type: Boolean,
    default: false,
  },
  show: {
    type: Boolean,
    default: false,
  },
});

const keydownHandler = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    emit("close");
  }
};

watch(
  () => props.show,
  () => {
    setTimeout(() => {
      show2.value = props.show;
    });

    if (props.show) {
      addEventListener("keydown", keydownHandler);
    } else {
      removeEventListener("keydown", keydownHandler);
    }
  }
);
</script>
