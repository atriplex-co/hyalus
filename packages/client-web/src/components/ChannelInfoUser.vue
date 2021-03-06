<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <UserAvatar
        :id="user.avatarId"
        :status="status"
        class="h-8 w-8 rounded-full"
      />
      <div>
        <p class="font-bold">{{ user.name }}</p>
        <p class="text-xs text-gray-400">@{{ user.username }}</p>
      </div>
    </div>
    <div class="flex space-x-2 text-gray-400">
      <div @click="remove">
        <TrashIcon
          v-if="removable"
          class="h-8 w-8 cursor-pointer rounded-full bg-gray-600 p-2 transition hover:bg-gray-500 hover:text-white"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from "./UserAvatar.vue";
import TrashIcon from "../icons/TrashIcon.vue";
import { computed, PropType } from "vue";
import { IChannel, IChannelUser, IUser } from "../global/types";
import { ChannelType } from "common";
import axios from "axios";
import { useStore } from "../global/store";

const store = useStore();

const props = defineProps({
  channel: {
    type: Object as PropType<IChannel>,
    default() {
      //
    },
  },
  user: {
    type: Object as PropType<IChannelUser | IUser>,
    default() {
      //
    },
  },
});

const removable = computed(
  () =>
    props.channel.type === ChannelType.Group &&
    props.channel.owner &&
    props.user.id !== store.user?.id
);

const status = computed(() => {
  return (
    (props.user as IChannelUser).status ?? (props.user as IUser).wantStatus
  );
});

const remove = async () => {
  await axios.delete(
    `/api/channels/${props.channel.id}/users/${props.user.id}`
  );
};
</script>
