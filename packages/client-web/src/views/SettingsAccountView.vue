<template>
  <div v-if="store.user" class="flex-1 overflow-auto">
    <div class="flex h-16 items-center px-4 text-2xl font-bold text-gray-200">
      <router-link
        v-if="isMobile"
        class="ml-2 mr-4 h-8 w-8 rounded-full bg-gray-600 p-1.5 text-gray-300 transition hover:bg-gray-500"
        to="/settings"
      >
        <ArrowLeftIcon />
      </router-link>
      <p>Account</p>
    </div>
    <div class="divide-y divide-gray-700 border-t border-b border-gray-700">
      <div class="flex h-16 items-center justify-between px-6">
        <div class="flex items-center">
          <p class="w-48 font-bold">Avatar</p>
          <UserAvatar :id="store.user.avatarId" class="h-8 w-8 rounded-full" />
        </div>
        <div
          class="bg-primary-500 hover:bg-primary-600 h-8 w-8 cursor-pointer rounded-full p-2 text-white transition"
          @click="setAvatar"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <div class="flex">
          <p class="w-48 font-bold">Name</p>
          <p class="text-gray-400">{{ store.user.name }}</p>
        </div>
        <div
          class="bg-primary-500 hover:bg-primary-600 h-8 w-8 cursor-pointer rounded-full p-2 text-white transition"
          @click="setNameModal = true"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <div class="flex">
          <p class="w-48 font-bold">Username</p>
          <p class="text-gray-400">@{{ store.user.username }}</p>
        </div>
        <div
          class="bg-primary-500 hover:bg-primary-600 h-8 w-8 cursor-pointer rounded-full p-2 text-white transition"
          @click="setUsernameModal = true"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <div class="flex">
          <p class="w-48 font-bold">Password</p>
          <p class="text-gray-400">{{ authKeyUpdated }}</p>
        </div>
        <div
          class="bg-primary-500 hover:bg-primary-600 h-8 w-8 cursor-pointer rounded-full p-2 text-white transition"
          @click="setPasswordModal = true"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">2FA</p>
        <InputBoolean v-model="totpEnabled" />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Typing Indicators</p>
        <InputBoolean v-model="typingEvents" />
      </div>
    </div>
    <SetNameModal :show="setNameModal" @close="setNameModal = false" />
    <SetUsernameModal
      :show="setUsernameModal"
      @close="setUsernameModal = false"
    />
    <SetPasswordModal
      :show="setPasswordModal"
      @close="setPasswordModal = false"
    />
    <TotpEnableModal :show="totpEnableModal" @close="totpEnableModal = false" />
    <TotpDisableModal
      :show="totpDisableModal"
      @close="totpDisableModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import InputBoolean from "../components/InputBoolean.vue";
import UserAvatar from "../components/UserAvatar.vue";
import SetNameModal from "../components/SetNameModal.vue";
import SetUsernameModal from "../components/SetUsernameModal.vue";
import SetPasswordModal from "../components/SetPasswordModal.vue";
import TotpEnableModal from "../components/TotpEnableModal.vue";
import TotpDisableModal from "../components/TotpDisableModal.vue";
import PencilIcon from "../icons/PencilIcon.vue";
import Day from "dayjs";
import { ref, computed } from "vue";
import { isMobile } from "../global/helpers";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import { store } from "../global/store";
import axios from "axios";

const setNameModal = ref(false);
const setUsernameModal = ref(false);
const setPasswordModal = ref(false);
const totpEnableModal = ref(false);
const totpDisableModal = ref(false);

const authKeyUpdated = computed(() => {
  if (!store.user || +store.user.created === +store.user.authKeyUpdated) {
    return "";
  }

  return `Updated ${Day(store.user.authKeyUpdated).fromNow()}`;
});

const totpEnabled = computed({
  get() {
    if (!store.user) {
      return false;
    }

    return store.user.totpEnabled;
  },
  set(val: boolean) {
    if (val) {
      totpEnableModal.value = true;
    } else {
      totpDisableModal.value = true;
    }
  },
});

const typingEvents = computed({
  get() {
    if (!store.user) {
      return true;
    }

    return store.user.typingEvents;
  },
  async set(val: boolean) {
    await axios.post("/api/self", {
      typingEvents: val,
    });
  },
});

const setAvatar = async () => {
  const el = document.createElement("input");

  el.addEventListener("input", async () => {
    if (!el.files) {
      return;
    }

    const form = new FormData();
    form.append("avatar", el.files[0]);

    await axios.post("/api/self/avatar", form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  });

  el.type = "file";
  el.click();
};

document.title = `Hyalus \u2022 Account`;
store.sideBarOpen = false;
</script>
