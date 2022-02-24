<template>
  <div class="flex-1">
    <HeaderBar />
    <div class="flex w-full flex-col items-center py-20">
      <AppIcon class="h-32 w-32" />
      <h1 class="mt-8 text-6xl font-bold tracking-tight">
        Talk on an open platform
      </h1>
      <p class="mt-6 max-w-lg text-center text-lg text-gray-300">
        With cryptographically secure messages &amp; calls, talk on the platform
        that puts you in control.
      </p>
      <div class="mt-8 flex space-x-8">
        <div
          class="bg-primary-500 hover:bg-primary-600 cursor-pointer rounded-lg px-6 py-4 text-white shadow-sm transition"
          to="/downloads"
          @click="appDownloadModal = true"
        >
          Download for Desktop
        </div>
        <router-link
          class="block rounded-lg bg-gray-700 px-6 py-4 text-gray-300 transition hover:bg-gray-600 hover:text-white"
          to="/app"
          >Open Web App</router-link
        >
      </div>
    </div>
    <div
      class="flex flex-col items-center justify-center border-t border-b border-gray-600 bg-gray-700 py-24"
    >
      <h1 class="text-4xl font-bold">A better way to communicate</h1>
      <p class="mt-4 text-lg text-gray-300">
        See why Hyalus is the safest &amp; most transparent platform to stay in
        touch on.
      </p>
      <div class="mt-12 flex w-full max-w-6xl items-center justify-evenly">
        <div class="flex max-w-xs flex-col items-center text-center">
          <LockIcon
            class="h-12 w-12 rounded-full border border-gray-500 bg-gray-600 p-3 text-gray-300"
          />
          <h1 class="mt-4 text-2xl font-bold">Secure</h1>
          <p class="mt-2 text-gray-300">
            Messages and calls automatically use end-to-end encryption that is
            properly documented and audited.
          </p>
          <a class="text-primary-500 mt-4" href="#">Learn more</a>
        </div>
        <div class="flex max-w-xs flex-col items-center text-center">
          <ChipIcon
            class="h-12 w-12 rounded-full border border-gray-500 bg-gray-600 p-3 text-gray-300"
          />
          <h1 class="mt-4 text-2xl font-bold">Open</h1>
          <p class="mt-2 text-gray-300">
            Don't take our word for it, anyone can audit the app's code for
            themselves and suggest improvements or fixes.
          </p>
          <a class="text-primary-500 mt-4" href="#">Learn more</a>
        </div>
        <div class="flex max-w-xs flex-col items-center text-center">
          <PrivateIcon
            class="h-12 w-12 rounded-full border border-gray-500 bg-gray-600 p-3 text-gray-300"
          />
          <h1 class="mt-4 text-2xl font-bold">Private</h1>
          <p class="mt-2 text-gray-300">
            The entire platform is engineered with privacy in mind, it's
            impossible for our team to read your chats.
          </p>
          <a class="text-primary-500 mt-4" href="#">Learn more</a>
        </div>
      </div>
    </div>
    <div class="flex flex-col items-center bg-gray-800 py-24">
      <h1 class="z-10 text-2xl font-bold">
        "Cryptography is the ultimate form of non-violent direct action."
      </h1>
      <p class="text-md z-10 mt-4 text-gray-300">
        Julian Assange, founder of WikiLeaks
      </p>
    </div>
    <FooterBar />
    <AppDownloadModal
      :show="appDownloadModal"
      @close="appDownloadModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import LockIcon from "../icons/LockIcon.vue";
import PrivateIcon from "../icons/PrivateIcon.vue";
import ChipIcon from "../icons/ChipIcon.vue";
import FooterBar from "../components/FooterBar.vue";
import HeaderBar from "../components/HeaderBar.vue";
import AppDownloadModal from "../components/AppDownloadModal.vue";
import AppIcon from "../icons/AppIcon.vue";
import { ref } from "vue";

const appDownloadModal = ref(false);

document.title = "Hyalus";
</script>
