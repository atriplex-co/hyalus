<template>
  <div
    class="absolute right-0 z-20 my-2 h-96 w-96 max-w-xs space-y-4 overflow-auto rounded-md border border-gray-600 bg-gray-700 py-4 px-3 text-sm shadow-md"
  >
    <div
      class="flex cursor-pointer items-center space-x-3 text-gray-300 transition hover:text-white"
      @click="inviteModal = true"
    >
      <UserAddIcon class="h-8 w-8 rounded-full bg-gray-600 p-2 transition" />
      <p v-if="channel.type === ChannelType.Private">Create group</p>
      <p v-if="channel.type === ChannelType.Group">Invite friends</p>
    </div>
    <div
      v-if="channel.type === ChannelType.Group"
      class="flex cursor-pointer items-center space-x-3 text-gray-300 transition hover:text-white"
      @click="leave"
    >
      <TrashIcon
        class="h-8 w-8 cursor-pointer rounded-full bg-gray-600 p-2 transition"
      />
      <p>Leave group</p>
    </div>
    <ChannelUserInfo
      v-for="user in users"
      :key="user.id"
      :channel="channel"
      :user="user"
    />
    <GroupCreateModal
      :show="channel.type === ChannelType.Private && inviteModal"
      :selected="channel.users[0]?.id"
      @close="$emit('close')"
    />
    <GroupAddModal
      :show="channel.type === ChannelType.Group && inviteModal"
      :channel="channel"
      @close="$emit('close')"
    />
  </div>
</template>

<script lang="ts" setup>
import ChannelUserInfo from "./ChannelInfoUser.vue";
import UserAddIcon from "../icons/UserAddIcon.vue";
import GroupAddModal from "./GroupAddModal.vue";
import TrashIcon from "../icons/TrashIcon.vue";
import GroupCreateModal from "./GroupCreateModal.vue";
import { ref, computed, PropType } from "vue";
import { axios } from "../global/helpers";
import { IChannel } from "../global/types";
import { store } from "../global/store";
import { ChannelType } from "common";

defineEmits(["close"]);

const props = defineProps({
  channel: {
    type: Object as PropType<IChannel>,
    default() {
      //
    },
  },
});

const inviteModal = ref(false);

const users = computed(() => {
  const me = store.state.value.user;

  return [...props.channel.users, ...(me ? [me] : [])]
    .filter((u) => !("hidden" in u) || !u.hidden)
    .sort((a, b) => (a.name > b.name ? 1 : -1));
});

const leave = async () => {
  await axios.delete(`/api/channels/${props.channel.id}`);
};
</script>
