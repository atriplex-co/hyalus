<template>
  <div
    class="fixed left-0 z-40 w-full px-4"
    :class="{
      'top-0': !isDesktop,
      'top-8': isDesktop,
    }"
  >
    <div
      class="bg-primary-500 my-2 flex h-10 items-center justify-between rounded-sm px-2 text-sm text-white shadow-md"
    >
      <div class="flex items-center space-x-2 px-1">
        <WarningIcon class="h-4 w-4" />
        <p>Hyalus is currently in beta, please report bugs &amp; issues.</p>
      </div>
      <div
        class="h-6 w-6 cursor-pointer rounded-full bg-black bg-opacity-10 p-1 text-white transition hover:bg-opacity-25 hover:text-white"
        @click="hide"
      >
        <CloseIcon />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CloseIcon from "../icons/CloseIcon.vue";
import WarningIcon from "../icons/WarningIcon.vue";
import { isDesktop } from "../global/helpers";
import { useStore } from "../global/store";

const store = useStore();

const hide = async () => {
  await store.writeConfig("betaBanner", false);
};
</script>
