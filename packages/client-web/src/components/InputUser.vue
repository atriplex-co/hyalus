<template>
  <div class="w-full space-y-2">
    <p class="text-sm text-gray-300">Friends</p>
    <div class="rounded-md border border-gray-600 bg-gray-800">
      <input
        v-model="search"
        class="-mt-px w-full rounded-sm border border-gray-600 bg-transparent px-4 py-2 text-gray-300 transition focus:border-gray-500 focus:outline-none"
        type="text"
        placeholder="Search for friends"
      />
      <div class="h-48 overflow-auto">
        <div v-if="users.length" class="space-y-3 p-3">
          <div
            v-for="user in shownUsers"
            :key="user.id"
            class="flex items-center justify-between"
          >
            <div class="flex items-center space-x-4">
              <UserAvatar :id="user.avatarId" class="h-8 w-8 rounded-full" />
              <div>
                <p class="font-bold">{{ user.name }}</p>
                <p class="text-xs text-gray-400">@{{ user.username }}</p>
              </div>
            </div>
            <CheckBox v-model="user.selected" />
          </div>
        </div>
        <div
          v-else
          class="flex h-full w-full flex-col items-center justify-center space-y-4 text-gray-500"
        >
          <GroupIcon class="h-8 w-8" />
          <p>No more friends to add</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import CheckBox from "./CheckBox.vue";
import GroupIcon from "../icons/GroupIcon.vue";
import UserAvatar from "./UserAvatar.vue";
import { ref, computed, PropType } from "vue";
import { IChannelUser, IFriend } from "../global/types";

const props = defineProps({
  users: {
    type: Array as PropType<
      ((IFriend | IChannelUser) & {
        selected: boolean;
      })[]
    >,
    default() {
      //
    },
  },
});

const search = ref("");
const shownUsers = computed(() =>
  props.users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.value.toLowerCase()) ||
      u.username.toLowerCase().includes(search.value.toLowerCase())
  )
);
</script>
