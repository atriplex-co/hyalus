<template>
  <div class="flex items-center justify-between p-2">
    <div class="flex items-center space-x-3">
      <UserAvatar
        :id="friend.avatarId"
        :status="friend.status"
        class="h-8 w-8 rounded-full"
      />
      <div>
        <p class="text-sm font-bold">{{ friend.name }}</p>
        <p class="text-sm text-gray-300">@{{ friend.username }}</p>
      </div>
    </div>
    <div class="flex space-x-2">
      <div v-if="friend.acceptable" @click="setAccepted(true)">
        <CheckIcon
          class="bg-primary-500 hover:bg-primary-600 h-6 w-6 cursor-pointer rounded-full p-1 text-white transition"
        />
      </div>
      <div @click="setAccepted(false)">
        <CloseIcon
          class="h-6 w-6 cursor-pointer rounded-full bg-gray-600 p-1 text-gray-300 transition hover:bg-gray-500 hover:text-gray-200"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from "./UserAvatar.vue";
import CheckIcon from "../icons/CheckIcon.vue";
import CloseIcon from "../icons/CloseIcon.vue";
import { PropType } from "vue";
import { IFriend } from "../global/types";
import { SocketMessageType } from "common";
import { store } from "../global/store";
import axios from "axios";

const props = defineProps({
  friend: {
    type: Object as PropType<IFriend>,
    default: null,
  },
});

const setAccepted = async (accepted: boolean) => {
  if (accepted) {
    store.expectedEvent = SocketMessageType.SMessageCreate;
  }

  await axios.post(`/api/friends/${props.friend.id}`, {
    accepted,
  });

  delete store.expectedEvent;
};
</script>
