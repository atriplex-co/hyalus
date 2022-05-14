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
      <p>Notifications</p>
    </div>
    <div class="divide-y divide-gray-700 border-t border-b border-gray-700">
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Sound Notifications</p>
        <InputBoolean v-model="notifySound" />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">System Notifications</p>
        <InputBoolean v-model="notifySystem" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import InputBoolean from "../components/InputBoolean.vue";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import { configToComputed, isMobile } from "../global/helpers";
import { store } from "../global/store";

const notifySound = configToComputed<boolean>("notifySound");
const notifySystem = configToComputed<boolean>("notifySystem");

document.title = "Hyalus \u2022 Notifications";

store.sideBarOpen = false;
</script>
