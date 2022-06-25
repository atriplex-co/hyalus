<template>
  <div class="flex h-full w-full flex-col">
    <div
      class="flex h-16 items-center justify-between px-4 text-2xl font-bold text-gray-200"
    >
      <p v-if="type === ChannelType.Private">Direct Messages</p>
      <template v-if="type === ChannelType.Group">
        <p>Groups</p>
        <div @click="groupCreateModal = true">
          <PlusIcon
            class="bg-primary-500 hover:bg-primary-600 h-8 w-8 cursor-pointer rounded-full p-2 text-white transition"
          />
        </div>
      </template>
    </div>
    <div class="flex-1 overflow-auto px-2">
      <SideBarChannel
        v-for="channel in channels"
        :key="channel.id"
        :channel="channel"
      />
    </div>
    <GroupCreateModal
      :show="groupCreateModal"
      @close="groupCreateModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import SideBarChannel from "./SideBarChannel.vue";
import GroupCreateModal from "./GroupCreateModal.vue";
import PlusIcon from "../icons/PlusIcon.vue";
import { computed, ref, watch } from "vue";
import { SideBarContent } from "../global/types";
import { useRoute, useRouter } from "vue-router";
import { ChannelType } from "common";
import { isMobile } from "../global/helpers";
import { useStore } from "../global/store";

const store = useStore();
const route = useRoute();
const router = useRouter();

const groupCreateModal = ref(false);

const type = computed(
  () =>
    ({
      [SideBarContent.CHANNELS_PRIVATE]: ChannelType.Private,
      [SideBarContent.CHANNELS_GROUP]: ChannelType.Group,
    }[+store.sideBarContent])
);

const channels = computed(() =>
  store.channels.filter((c) => c.type === type.value)
);

const updateRoute = () => {
  if (
    !isMobile &&
    channels.value.length &&
    (route.name !== "channel" ||
      (route.name === "channel" &&
        store.channels.find((c) => c.id === route.params.channelId)?.type !==
          type.value))
  ) {
    router.push(`/channels/${channels.value[0].id}`);
  }
};

updateRoute();
watch(() => type.value, updateRoute);
</script>
