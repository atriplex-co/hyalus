<template>
  <ModalBase empty @close="$emit('close')">
    <div class="flex flex-col items-center p-8">
      <p class="text-2xl font-bold">Download the app</p>
      <div class="mt-8 flex space-x-10 text-gray-300">
        <a
          href="https://github.com/atriplex-co/hyalus/releases/latest/download/HyalusDesktop-win32.exe"
          target="_blank"
          rel="noreferrer noopener"
          class="h-20 w-20 transition hover:text-white"
        >
          <WindowsIcon />
        </a>
        <a
          href="https://github.com/atriplex-co/hyalus/releases/latest/download/HyalusDesktop-osx.zip"
          target="_blank"
          rel="noreferrer noopener"
          class="h-20 w-20 transition hover:text-white"
        >
          <AppleIcon />
        </a>
        <a
          href="https://github.com/atriplex-co/hyalus/releases/latest/download/HyalusDesktop-linux.AppImage"
          target="_blank"
          rel="noreferrer noopener"
          class="h-20 w-20 transition hover:text-white"
        >
          <LinuxIcon />
        </a>
      </div>
      <p class="mt-8 rounded-md border border-gray-600 bg-gray-800 px-4 py-2">
        iOS &amp; Android apps coming soon.
      </p>
      <p
        class="text-primary-500 hover:text-primary-600 mt-6 cursor-pointer transition"
        @click="$emit('close')"
      >
        Close
      </p>
    </div>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import WindowsIcon from "../icons/WindowsIcon.vue";
import AppleIcon from "../icons/AppleIcon.vue";
import LinuxIcon from "../icons/LinuxIcon.vue";

defineEmits(["close"]);
</script>
