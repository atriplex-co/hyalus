<template>
  <transition
    enter-active-class="transition transform origin-top-left ease-out duration-100"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition transform origin-top-left ease-in duration-75"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="show"
      class="absolute z-10 my-2 w-32 select-none rounded-md border border-gray-600 bg-gray-800 text-sm shadow-md"
    >
      <div
        class="flex items-center space-x-3 py-2 px-3 transition hover:bg-gray-700"
        @click="submit(Status.Online)"
      >
        <div class="rounded-full bg-green-500 p-2" />
        <p>Online</p>
      </div>
      <div
        class="flex items-center space-x-3 py-2 px-3 transition hover:bg-gray-700"
        @click="submit(Status.Away)"
      >
        <div class="rounded-full bg-amber-500 p-2" />
        <p>Away</p>
      </div>
      <div
        class="flex items-center space-x-3 py-2 px-3 transition hover:bg-gray-700"
        @click="submit(Status.Busy)"
      >
        <div class="rounded-full bg-rose-500 p-2" />
        <p>Busy</p>
      </div>
      <div
        class="flex items-center space-x-3 py-2 px-3 transition hover:bg-gray-700"
        @click="submit(Status.Offline)"
      >
        <div class="rounded-full bg-gray-400 p-2" />
        <p>Invisible</p>
      </div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { watch } from "vue";
import { Status } from "common";
import axios from "axios";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const submit = async (wantStatus: Status) => {
  emit("close");

  await axios.post("/api/self", {
    wantStatus,
  });
};

watch(
  () => props.show,
  async () => {
    if (!props.show) {
      return;
    }

    const close = () => {
      removeEventListener("mouseup", close);
      emit("close");
    };

    addEventListener("mouseup", close);
  }
);
</script>
