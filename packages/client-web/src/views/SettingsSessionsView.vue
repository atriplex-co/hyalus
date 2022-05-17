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
      <p>Sessions</p>
    </div>
    <div class="divide-y divide-gray-700 border-t border-b border-gray-700">
      <SessionItem
        v-for="session in sessions"
        :key="session.id"
        :session="session"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import SessionItem from "../components/SessionItem.vue";
import { computed } from "vue";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import { isMobile } from "../global/helpers";
import { useStore } from "../global/store";

const store = useStore();

const sessions = computed(() =>
  [...store.sessions].sort((a, b) =>
    a.self ? -1 : b.self ? 1 : a.lastStart > b.lastStart ? -1 : 1
  )
);

document.title = "Hyalus \u2022 Sessions";

store.sideBarOpen = false;
</script>
