<template>
  <div class="z-10 flex h-8 border-b border-gray-700 bg-gray-900 text-sm">
    <div class="draggable flex flex-1 select-none items-center space-x-2 px-2">
      <AppIcon class="h-4 w-4" />
      <p class="text-gray-200">{{ title }}</p>
      <p
        v-if="gitBranch === 'dev'"
        class="bg-primary-600 rounded-full px-2 font-bold text-white"
      >
        Dev ({{ gitCommitHash }})
      </p>
    </div>
    <div class="flex">
      <div
        class="flex h-8 w-10 items-center justify-center p-2 text-gray-400 transition hover:bg-gray-700 hover:text-gray-200"
        @click="minimize"
      >
        <svg width="11" height="1" viewBox="0 0 11 1" fill="currentColor">
          <path d="m11 0v1h-11v-1z" stroke-width=".25" />
        </svg>
      </div>
      <div
        class="flex h-8 w-10 items-center justify-center p-2 text-gray-400 transition hover:bg-gray-700 hover:text-gray-200"
        @click="maximize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path
            d="m10-1.6667e-6v10h-10v-10zm-1.001 1.001h-7.998v7.998h7.998z"
            stroke-width=".25"
          />
        </svg>
      </div>
      <div
        class="flex h-8 w-10 items-center justify-center p-2 text-gray-400 transition hover:bg-gray-700 hover:text-gray-200"
        @click="close"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path
            d="m6.8496 6 5.1504 5.1504-0.84961 0.84961-5.1504-5.1504-5.1504 5.1504-0.84961-0.84961 5.1504-5.1504-5.1504-5.1504 0.84961-0.84961 5.1504 5.1504 5.1504-5.1504 0.84961 0.84961z"
            stroke-width=".3"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import AppIcon from "../icons/AppIcon.vue";
import { onUnmounted, ref } from "vue";

const gitBranch = import.meta.env.VITE_GIT_BRANCH;
const gitCommitHash = import.meta.env.VITE_GIT_COMMIT_HASH;

const title = ref("");

let updateTitleInterval: number;

const updateTitle = () => {
  if (document.visibilityState == "visible") {
    title.value = document.title;
  }
};

const close = () => {
  window.HyalusDesktop?.close();
};

const maximize = () => {
  window.HyalusDesktop?.maximize();
};

const minimize = () => {
  window.HyalusDesktop?.minimize();
};

updateTitleInterval = +setInterval(updateTitle, 100);

onUnmounted(() => {
  clearInterval(updateTitleInterval);
});
</script>

<style scoped>
.draggable {
  -webkit-app-region: drag;
}
</style>
