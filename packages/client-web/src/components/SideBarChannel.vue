<template>
  <router-link
    class="flex w-full cursor-pointer items-center space-x-4 rounded-md p-3 transition hover:bg-gray-600 hover:bg-opacity-50"
    :class="{
      'bg-gray-600 bg-opacity-75': selected,
    }"
    :to="`/channels/${channel.id}`"
  >
    <div class="h-10 w-10">
      <UserAvatar
        v-if="avatarId || channel.type === ChannelType.Private"
        :id="avatarId"
        :status="status"
        class="h-full w-full rounded-full"
      />
      <EmptyAvatar v-else :name="name" class="h-full w-full" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex w-full items-center justify-between">
        <div class="flex min-w-0 items-center space-x-2 pr-2">
          <p class="truncate text-sm font-bold">{{ name }}</p>
          <GroupIcon
            v-if="channel.type === ChannelType.Group"
            class="h-3 w-3 flex-shrink-0 text-gray-400"
          />
        </div>
        <p class="text-xs text-gray-300">
          {{ lastMessageTime }}
        </p>
      </div>
      <p class="truncate pr-2 text-sm text-gray-300">
        {{ lastMessage }}
      </p>
    </div>
  </router-link>
</template>

<script lang="ts" setup>
import Day from "dayjs";
import UserAvatar from "./UserAvatar.vue";
import EmptyAvatar from "./EmptyAvatar.vue";
import { ref, computed, PropType, onUnmounted } from "vue";
import { IChannel, IChannelUser, IUser } from "../global/types";
import { useRoute } from "vue-router";
import { ChannelType, MessageType } from "common";
import { useStore } from "../global/store";
import GroupIcon from "../icons/GroupIcon.vue";

const store = useStore();

const props = defineProps({
  channel: {
    type: Object as PropType<IChannel>,
    default: null,
  },
});

const lastMessageTime = ref("");

const lastMessage = computed(() => {
  const message = props.channel.messages.at(-1);
  const dataString = message && message.dataString;

  if (!message || !dataString) {
    return "No messages yet";
  }

  let user: IChannelUser | IUser | undefined;
  let ret = "";

  if (store.user && message.userId === store.user.id) {
    user = store.user;
  } else {
    user = props.channel.users.find((user) => user.id === message.userId);
  }

  if (user) {
    ret = `${user.name} \u2022 `;
  }

  ret += dataString;

  if (message.type === MessageType.Attachment) {
    try {
      ret = ret.slice(0, ret.length - dataString.length);
      ret += JSON.parse(dataString).name;
    } catch {
      //
    }
  }

  return ret;
});

const selected = computed(() => {
  const route = useRoute();
  return (
    route.name === "channel" && route.params.channelId === props.channel.id
  );
});

const name = computed(() => {
  if (!props.channel) {
    return "Unknown";
  }

  if (props.channel.type === ChannelType.Private) {
    return props.channel.users[0].name;
  }

  return props.channel.name;
});

const avatarId = computed(() => {
  if (!props.channel) {
    return "Unknown";
  }

  if (props.channel.type === ChannelType.Private) {
    return props.channel.users[0].avatarId;
  }

  return props.channel.avatarId;
});

const status = computed(() => {
  if (props.channel.type === ChannelType.Private) {
    return props.channel.users[0].status;
  }

  return undefined;
});

const updateLastMessageTime = () => {
  if (!props.channel.messages.length) {
    return;
  }

  const date = props.channel.messages.at(-1)?.created || +props.channel.created;
  const duration = Day.duration(+new Date() - +date);

  lastMessageTime.value = "now";

  if (duration.asMinutes() >= 1) {
    lastMessageTime.value = `${Math.floor(duration.asMinutes())}m`;
  }

  if (duration.asHours() >= 1) {
    lastMessageTime.value = `${Math.floor(duration.asHours())}h`;
  }

  if (duration.asDays() >= 1) {
    lastMessageTime.value = `${Math.floor(duration.asDays())}d`;
  }

  if (duration.asMonths() >= 1) {
    lastMessageTime.value = `${Day(date).format("l")}`;
  }
};

let updateLastMessageTimeInterval: number;

updateLastMessageTime();
updateLastMessageTimeInterval = +setInterval(updateLastMessageTime, 1000);

onUnmounted(() => {
  clearInterval(updateLastMessageTimeInterval);
});
</script>
