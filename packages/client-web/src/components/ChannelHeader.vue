<template>
  <div>
    <div class="flex h-16 w-full justify-between">
      <div class="flex min-w-0 items-center space-x-2">
        <router-link
          v-if="isMobile"
          class="ml-2 h-8 w-8 rounded-full bg-gray-600 p-1.5 text-gray-300 transition hover:bg-gray-500"
          to="/app"
        >
          <ArrowLeftIcon />
        </router-link>
        <div
          class="flex h-16 w-16 items-center justify-center"
          :class="{ 'cursor-pointer': channel.owner }"
          @click="setAvatar"
        >
          <UserAvatar
            v-if="avatarId || channel.type === ChannelType.Private"
            :id="avatarId"
            :status="
              channel.type === ChannelType.Private
                ? channel.users[0].status
                : undefined
            "
            class="h-10 w-10 rounded-full"
          />
          <EmptyAvatar v-else :name="name" class="h-10 w-10" />
        </div>
        <div class="min-w-0 flex-1">
          <p
            class="truncate text-lg font-bold"
            :class="{ 'cursor-pointer': channel.owner }"
            @click="setName"
          >
            {{ name }}
          </p>
          <p class="-mt-1 text-sm text-gray-300">{{ description }}</p>
        </div>
      </div>
      <div class="flex items-center space-x-2 text-gray-300">
        <template v-if="!inCall">
          <div v-if="voiceUsers.length" class="mr-2 flex -space-x-2">
            <UserAvatar
              v-for="user in voiceUsersShown"
              :id="user.avatarId"
              :key="user.id"
              class="h-7 w-7 rounded-full border border-gray-900"
            />
            <div
              v-if="voiceUsers.length !== voiceUsersShown.length"
              class="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full border border-gray-900 text-xs font-bold text-white"
            >
              <p>+{{ voiceUsers.length - voiceUsersShown.length }}</p>
            </div>
          </div>
          <div
            class="h-8 w-8 cursor-pointer rounded-full bg-gray-600 p-2 transition hover:bg-gray-500"
            @click="callStart"
          >
            <PhoneIcon />
          </div>
        </template>
        <div class="relative">
          <div
            class="h-8 w-8 cursor-pointer rounded-full bg-gray-600 p-2 transition hover:bg-gray-500"
            @click="showInfo = !showInfo"
          >
            <DotsIcon />
          </div>
          <ChannelInfo
            v-if="showInfo"
            :channel="channel"
            @close="showInfo = false"
          />
        </div>
      </div>
    </div>
    <GroupNameModal
      :show="groupNameModal"
      :channel="channel"
      @close="groupNameModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import axios from "axios";
import { CallStreamType, ChannelType, SocketMessageType } from "common/src";
import { computed, PropType, ref } from "vue";
import { isMobile } from "../global/helpers";
import { useStore } from "../global/store";
import { IChannel } from "../global/types";
import GroupNameModal from "./GroupNameModal.vue";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import UserAvatar from "./UserAvatar.vue";
import EmptyAvatar from "./EmptyAvatar.vue";
import PhoneIcon from "../icons/PhoneIcon.vue";
import DotsIcon from "../icons/DotsIcon.vue";
import ChannelInfo from "./ChannelInfo.vue";

const showInfo = ref(false);
const groupNameModal = ref(false);

const props = defineProps({
  channel: {
    type: Object as PropType<IChannel>,
    default() {
      //
    },
  },
});

const store = useStore();

const inCall = computed(() => {
  return store.call && store.call.channelId === props.channel.id;
});

const setAvatar = () => {
  if (!props.channel.owner) {
    return;
  }

  const el = document.createElement("input");

  el.addEventListener("input", async () => {
    if (!props.channel || !props.channel.owner || !el.files) {
      return;
    }

    const form = new FormData();
    form.append("avatar", el.files[0]);

    await axios.post(`/api/channels/${props.channel.id}/avatar`, form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  });

  el.type = "file";
  el.click();
};

const setName = () => {
  if (props.channel && props.channel.owner) {
    groupNameModal.value = true;
  }
};

const callStart = async (e: MouseEvent) => {
  if (store.call) {
    await store.callReset();

    store.socket?.send({
      t: SocketMessageType.CCallStop,
    });
  }

  await store.callStart(props.channel.id);

  if (!e.shiftKey) {
    await store.callAddLocalStream({
      type: CallStreamType.Audio,
      silent: true,
    });
  }
};

const avatarId = computed(() => {
  if (props.channel.type === ChannelType.Private) {
    return props.channel.users[0].avatarId;
  }

  return props.channel.avatarId;
});

const description = computed(() => {
  if (props.channel.type === ChannelType.Private) {
    return `@${props.channel.users[0].username}`;
  }

  if (props.channel.type === ChannelType.Group) {
    const users = props.channel.users.filter((user) => !user.hidden);

    return `${users.length + 1} member${users.length ? "s" : ""}`;
  }

  return "";
});

const voiceUsers = computed(() => {
  return props.channel.users.filter((user) => user.inCall);
});

const voiceUsersShown = computed(() =>
  voiceUsers.value.slice(0, voiceUsers.value.length > 4 ? 3 : 4)
);

const name = computed(() => {
  if (props.channel.type === ChannelType.Private) {
    return props.channel.users[0].name;
  }

  return props.channel.name;
});
</script>
