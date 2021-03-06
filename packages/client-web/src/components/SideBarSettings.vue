<template>
  <div class="flex w-full flex-col bg-gray-700">
    <div class="flex h-16 items-center px-4 text-2xl font-bold text-gray-200">
      <p>Settings</p>
    </div>
    <div class="divide-y divide-gray-600 border-t border-b border-gray-600">
      <router-link
        class="flex items-center space-x-4 px-4 py-2 transition hover:bg-gray-900 hover:text-white"
        :class="{
          'bg-gray-800 text-white': active === 'account',
          'text-gray-300': active !== 'account',
        }"
        to="/settings/account"
        @click="active = 'account'"
      >
        <UserIcon class="h-5 w-5" />
        <p>Account</p>
      </router-link>
      <router-link
        class="flex items-center space-x-4 px-4 py-2 transition hover:bg-gray-900 hover:text-white"
        :class="{
          'bg-gray-800 text-white': active === 'sessions',
          'text-gray-300': active !== 'sessions',
        }"
        to="/settings/sessions"
        @click="active = 'sessions'"
      >
        <DesktopIcon class="h-5 w-5" />
        <p>Sessions</p>
      </router-link>
      <router-link
        class="flex items-center space-x-4 px-4 py-2 transition hover:bg-gray-900 hover:text-white"
        :class="{
          'bg-gray-800 text-white': active === 'appearance',
          'text-gray-300': active !== 'appearance',
        }"
        to="/settings/appearance"
        @click="active = 'appearance'"
      >
        <EyeIcon class="h-5 w-5" />
        <p>Appearance</p>
      </router-link>
      <router-link
        class="flex cursor-pointer items-center space-x-4 px-4 py-2 transition hover:bg-gray-900 hover:text-white"
        :class="{
          'bg-gray-800 text-white': active === 'notifications',
          'text-gray-300': active !== 'notifications',
        }"
        to="/settings/notifications"
        @click="active = 'notifications'"
      >
        <BellIcon class="h-5 w-5" />
        <p>Notifications</p>
      </router-link>
      <router-link
        class="flex cursor-pointer items-center space-x-4 px-4 py-2 transition hover:bg-gray-900 hover:text-white"
        :class="{
          'bg-gray-800 text-white': active === 'media',
          'text-gray-300': active !== 'media',
        }"
        to="/settings/media"
        @click="active = 'media'"
      >
        <VideoIcon class="h-5 w-5" />
        <p>Audio &amp; Video</p>
      </router-link>
      <router-link
        class="flex cursor-pointer items-center space-x-4 px-4 py-2 transition hover:bg-gray-900 hover:text-white"
        :class="{
          'bg-gray-800 text-white': active === 'keyboard',
          'text-gray-300': active !== 'keyboard',
        }"
        to="/settings/keyboard"
        @click="active = 'keyboard'"
      >
        <KeyboardIcon class="h-5 w-5" />
        <p>Keyboard Shortcuts</p>
      </router-link>
      <router-link
        class="flex cursor-pointer items-center space-x-4 px-4 py-2 transition hover:bg-gray-900 hover:text-white"
        :class="{
          'bg-gray-800 text-white': active === 'update',
          'text-gray-300': active !== 'update',
        }"
        to="/settings/update"
        @click="active = 'update'"
      >
        <RefreshIcon class="h-5 w-5" />
        <p>Updates &amp; Changelog</p>
      </router-link>
      <router-link
        v-if="isDesktop"
        class="flex cursor-pointer items-center space-x-4 px-4 py-2 transition hover:bg-gray-900 hover:text-white"
        :class="{
          'bg-gray-800 text-white': active === 'desktop',
          'text-gray-300': active !== 'desktop',
        }"
        to="/settings/desktop"
        @click="active = 'desktop'"
      >
        <ChipIcon class="h-5 w-5" />
        <p>Desktop Integration</p>
      </router-link>
      <div
        class="flex cursor-pointer items-center space-x-4 px-4 py-2 text-gray-300 transition hover:bg-gray-900 hover:text-white"
        @click="logoutModal = true"
      >
        <LogoutIcon class="h-5 w-5" />
        <p>Log Out</p>
      </div>
    </div>
    <LogoutModal :show="logoutModal" @close="logoutModal = false" />
  </div>
</template>

<script lang="ts" setup>
import LogoutModal from "./LogoutModal.vue";
import UserIcon from "../icons/UserIcon.vue";
import BellIcon from "../icons/BellIcon.vue";
import VideoIcon from "../icons/VideoIcon.vue";
import RefreshIcon from "../icons/RefreshIcon.vue";
import LogoutIcon from "../icons/LogoutIcon.vue";
import KeyboardIcon from "../icons/KeyboardIcon.vue";
import EyeIcon from "../icons/EyeIcon.vue";
import DesktopIcon from "../icons/DesktopIcon.vue";
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import ChipIcon from "../icons/ChipIcon.vue";
import { isDesktop, isMobile } from "../global/helpers";
import { useStore } from "../global/store";

const store = useStore();
const router = useRouter();
const active = ref("");
const logoutModal = ref(false);

const update = () => {
  const routeName = String(router.currentRoute.value.name);

  if (routeName.startsWith("settings")) {
    active.value = routeName.replace("settings", "").toLowerCase();
  } else {
    if (!isMobile) {
      router.push("/settings/account");
    }
  }
};

watch(
  () => router.currentRoute.value,
  () => {
    update();
  }
);

update();

store.sideBarOpen = true;
</script>
