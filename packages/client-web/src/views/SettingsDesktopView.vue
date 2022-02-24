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
      <p>Desktop Integration</p>
    </div>
    <div class="divide-y divide-gray-700 border-t border-b border-gray-700">
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Open at Login</p>
        <InputBoolean
          :model-value="openAtLogin"
          @update:model-value="setOpenAtLogin"
        />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Open Minimized</p>
        <InputBoolean v-model="startMinimized" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import InputBoolean from "../components/InputBoolean.vue";
import { ref, onMounted } from "vue";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import { configToComputed, isMobile } from "../global/helpers";
import { store } from "../global/store";

const openAtLogin = ref(false);

const setOpenAtLogin = async (val: boolean) => {
  window.HyalusDesktop?.setOpenAtLogin(val);
  openAtLogin.value = val;
};

const startMinimized = configToComputed<boolean>("startMinimized");

document.title = "Hyalus \u2022 Notifications";

onMounted(async () => {
  openAtLogin.value = !!(await window.HyalusDesktop?.getOpenAtLogin());
});

store.state.value.sideBarOpen = false;
</script>
