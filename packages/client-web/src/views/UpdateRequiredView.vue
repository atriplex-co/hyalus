<template>
  <div
    class="flex h-full w-full flex-col items-center justify-center space-y-8"
  >
    <div class="flex flex-col items-center space-y-4">
      <RefreshIcon class="h-20 w-20 text-gray-400" />
      <p class="text-2xl font-bold">Hyalus needs an update</p>
    </div>
    <div
      class="bg-primary-500 hover:bg-primary-600 cursor-pointer rounded-md px-4 py-2 transition"
      @click="submit"
    >
      <p>Reload</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { isDesktop } from "../global/helpers";
import RefreshIcon from "../icons/RefreshIcon.vue";

const submit = () => {
  if (isDesktop) {
    window.HyalusDesktop?.restart();
  } else {
    location.reload();
  }
};
</script>
