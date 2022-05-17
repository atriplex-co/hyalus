<template>
  <div class="flex h-full w-full flex-col bg-gray-700">
    <div class="flex h-16 items-center justify-between px-4 text-gray-200">
      <p class="text-2xl font-bold">Friends</p>
      <div @click="addFriendModal = true">
        <UserAddIcon
          class="bg-primary-500 hover:bg-primary-600 h-8 w-8 cursor-pointer rounded-full p-2 text-white transition"
        />
      </div>
    </div>
    <div
      class="flex-1 divide-y divide-gray-600 overflow-auto border-t border-gray-600"
    >
      <SideBarFriend
        v-for="friend in friends"
        :key="friend.id"
        :friend="friend"
      />
      <div />
    </div>
    <AddFriendModal :show="addFriendModal" @close="addFriendModal = false" />
  </div>
</template>

<script lang="ts" setup>
import SideBarFriend from "./SideBarFriend.vue";
import UserAddIcon from "../icons/UserAddIcon.vue";
import AddFriendModal from "./AddFriendModal.vue";
import { ref, computed } from "vue";
import { useStore } from "../global/store";

const store = useStore();

const addFriendModal = ref(false);
const friends = computed(() =>
  [...store.friends]
    .sort((a, b) => (a.name > b.name ? -1 : 1))
    .sort((a) => (!a.accepted ? -1 : 1))
);
</script>
