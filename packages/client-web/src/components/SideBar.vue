<template>
  <div
    v-if="store.state.value.user"
    class="flex w-full"
    :class="{
      'fixed inset-0 z-40': isMobile,
      'max-w-[26.25rem]': !isMobile,
    }"
  >
    <div class="flex w-16 flex-col justify-between bg-gray-900">
      <div>
        <div
          class="mt-px flex h-16 items-center justify-center border-b border-gray-700"
        >
          <div class="relative">
            <UserAvatar
              :id="store.state.value.user.avatarId"
              class="h-10 w-10 cursor-pointer rounded-full"
              :status="store.state.value.user.wantStatus"
              @click="menu !== 'status' ? (menu = 'status') : (menu = '')"
            />
            <SideBarStatusPicker :show="menu === 'status'" @close="menu = ''" />
          </div>
        </div>
        <div
          class="hover:text-primary-400 flex h-16 cursor-pointer items-center justify-center text-gray-400 transition hover:bg-gray-800"
          :class="{
            'text-primary-400':
              store.state.value.sideBarContent ===
              SideBarContent.CHANNELS_PRIVATE,
          }"
          @click="
            store.state.value.sideBarContent = SideBarContent.CHANNELS_PRIVATE
          "
        >
          <ChatIcon class="h-6 w-6" />
        </div>
        <div
          class="hover:text-primary-400 flex h-16 cursor-pointer items-center justify-center text-gray-400 transition hover:bg-gray-800"
          :class="{
            'text-primary-400':
              store.state.value.sideBarContent ===
              SideBarContent.CHANNELS_GROUP,
          }"
          @click="
            store.state.value.sideBarContent = SideBarContent.CHANNELS_GROUP
          "
        >
          <GroupIcon class="h-6 w-6" />
        </div>
        <div
          class="hover:text-primary-400 relative flex h-16 cursor-pointer items-center justify-center text-gray-400 transition hover:bg-gray-800"
          :class="{
            'text-primary-400':
              store.state.value.sideBarContent === SideBarContent.FRIENDS,
          }"
          @click="store.state.value.sideBarContent = SideBarContent.FRIENDS"
        >
          <FriendsIcon class="h-6 w-6" />
          <div
            v-if="acceptableFriends"
            class="bg-primary-500 absolute bottom-4 right-4 flex h-4 w-4 items-center justify-center rounded-full text-xs text-white"
          >
            {{ acceptableFriends }}
          </div>
        </div>
        <div
          v-if="store.state.value.updateAvailable"
          class="hover:text-primary-400 flex h-16 cursor-pointer items-center justify-center text-gray-400 transition hover:bg-gray-800"
          @click="updateReloadModal = true"
        >
          <RefreshIcon class="h-6 w-6" />
        </div>
      </div>
      <div
        class="hover:text-primary-400 flex h-16 cursor-pointer items-center justify-center text-gray-400 transition hover:bg-gray-800"
        :class="{
          'text-primary-400':
            store.state.value.sideBarContent === SideBarContent.SETTINGS,
        }"
        @click="store.state.value.sideBarContent = SideBarContent.SETTINGS"
      >
        <SettingsIcon class="h-6 w-6" />
      </div>
    </div>
    <div
      class="min-w-0 flex-1 bg-gray-700"
      :class="{
        hidden: store.state.value.sideBarContent === SideBarContent.NONE,
      }"
    >
      <SideBarChannelList
        v-if="
          [
            SideBarContent.CHANNELS_PRIVATE,
            SideBarContent.CHANNELS_GROUP,
          ].indexOf(+store.state.value.sideBarContent) !== -1
        "
      />
      <SideBarSettings
        v-if="store.state.value.sideBarContent === SideBarContent.SETTINGS"
      />
      <SideBarFriendList
        v-if="store.state.value.sideBarContent === SideBarContent.FRIENDS"
      />
      <UpdateReloadModal
        :show="updateReloadModal"
        @close="updateReloadModal = false"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from "./UserAvatar.vue";
import ChatIcon from "../icons/ChatIcon.vue";
import GroupIcon from "../icons/GroupIcon.vue";
import FriendsIcon from "../icons/FriendsIcon.vue";
import SettingsIcon from "../icons/SettingsIcon.vue";
import RefreshIcon from "../icons/RefreshIcon.vue";
import SideBarChannelList from "./SideBarChannelList.vue";
import SideBarSettings from "./SideBarSettings.vue";
import SideBarFriendList from "./SideBarFriendList.vue";
import SideBarStatusPicker from "./SideBarStatusPicker.vue";
import UpdateReloadModal from "./UpdateReloadModal.vue";
import { ref, watch, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { SideBarContent } from "../global/types";
import { store } from "../global/store";
import { ChannelType } from "common";
import { isMobile } from "../global/helpers";

const route = useRoute();
const menu = ref("");
const updateReloadModal = ref(false);

const updateRoute = () => {
  if (route.name === "channel") {
    const channel = store.state.value.channels.find(
      (c) => c.id === route.params.channelId
    );

    if (channel?.type === ChannelType.Private) {
      store.state.value.sideBarContent = SideBarContent.CHANNELS_PRIVATE;
    }

    if (channel?.type === ChannelType.Group) {
      store.state.value.sideBarContent = SideBarContent.CHANNELS_GROUP;
    }

    return;
  }

  if (String(route.name).startsWith("settings")) {
    store.state.value.sideBarContent = SideBarContent.SETTINGS;
    return;
  }

  if (!isMobile) {
    store.state.value.sideBarContent = SideBarContent.NONE;
  }
};

const acceptableFriends = computed(() => {
  return store.state.value.friends.filter((friend) => friend.acceptable).length;
});

onMounted(updateRoute);
watch(route, updateRoute);
</script>
