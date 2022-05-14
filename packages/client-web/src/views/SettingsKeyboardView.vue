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
      <p>Keyboard Shortcuts</p>
    </div>
    <div class="divide-y divide-gray-700 border-t border-b border-gray-700">
      <div
        v-if="!isDesktop"
        class="flex h-12 items-center justify-between rounded-sm bg-gray-900 px-6 text-gray-200"
      >
        <div class="flex items-center space-x-3">
          <WarningIcon class="h-6 w-6 text-gray-400" />
          <p>System-wide keyboard shortcuts require the desktop app.</p>
        </div>
        <div
          class="h-8 w-8 cursor-pointer rounded-full border border-gray-600 bg-gray-800 p-1.5 text-gray-300"
          @click="appDownloadModal = true"
        >
          <DownloadIcon />
        </div>
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Search</p>
        <InputKeys v-model="searchKeys" />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Open App</p>
        <InputKeys v-model="openAppKeys" />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Toggle Mute</p>
        <InputKeys v-model="toggleMuteKeys" />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Toggle Deafen</p>
        <InputKeys v-model="toggleDeafenKeys" />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Join Call</p>
        <InputKeys v-model="joinCallKeys" />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Leave Call</p>
        <InputKeys v-model="leaveCallKeys" />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Open Current Call</p>
        <InputKeys v-model="openCurrentCallKeys" />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Upload File</p>
        <InputKeys v-model="uploadFileKeys" />
      </div>
    </div>
    <AppDownloadModal
      :show="appDownloadModal"
      @close="appDownloadModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import DownloadIcon from "../icons/DownloadIcon.vue";
import { ref } from "vue";
import AppDownloadModal from "../components/AppDownloadModal.vue";
import WarningIcon from "../icons/WarningIcon.vue";
import InputKeys from "../components/InputKeys.vue";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import { configToComputed } from "../global/helpers";
import { isDesktop, isMobile } from "../global/helpers";
import { store } from "../global/store";

const appDownloadModal = ref(false);
const searchKeys = configToComputed<string>("searchKeys");
const openAppKeys = configToComputed<string>("openAppKeys");
const toggleMuteKeys = configToComputed<string>("toggleMuteKeys");
const toggleDeafenKeys = configToComputed<string>("toggleDeafenKeys");
const joinCallKeys = configToComputed<string>("joinCallKeys");
const leaveCallKeys = configToComputed<string>("leaveCallKeys");
const openCurrentCallKeys = configToComputed<string>("openCurrentCallKeys");
const uploadFileKeys = configToComputed<string>("uploadFileKeys");

document.title = `Hyalus \u2022 Keyboard Shortcuts`;

store.sideBarOpen = false;
</script>
