<template>
  <div class="flex-1 overflow-auto">
    <div class="flex h-16 items-center px-4 text-2xl font-bold text-gray-200">
      <router-link
        v-if="isMobile"
        class="ml-2 mr-4 h-8 w-8 rounded-full bg-gray-600 p-1.5 text-gray-300 transition hover:bg-gray-500"
        to="/settings"
      >
        <ArrowLeftIcon />
      </router-link>
      <p>Updates &amp; Changelog</p>
    </div>
    <div class="divide-y divide-gray-700 border-t border-b border-gray-700">
      <!-- TODO: content -->
    </div>
  </div>
</template>

<script lang="ts" setup>
import { store } from "../global/store";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import { isMobile } from "../global/helpers";

store.state.value.sideBarOpen = false;
document.title = "Hyalus \u2022 Updates & Changelog";
</script>
