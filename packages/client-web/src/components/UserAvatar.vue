<template>
  <div
    class="flex overflow-hidden"
    :class="{
      'border-2': status !== undefined,
      'border-green-500': status === Status.Online,
      'border-amber-500': status === Status.Away,
      'border-rose-500': status === Status.Busy,
      'border-gray-400': status === Status.Offline,
    }"
  >
    <div
      v-if="id"
      class="h-full w-full bg-gray-800"
      @mouseenter="!animateDisabled && (animate = true)"
      @mouseleave="
        animate = false;
        animateReady = false;
      "
    >
      <img
        v-show="!animateReady"
        :src="`/api/avatars/${id}/${AvatarType.WEBP}`"
        class="h-full w-full object-cover"
        :class="{
          'rounded-full border border-transparent': status !== undefined,
        }"
      />
      <video
        v-if="animate"
        v-show="animateReady"
        :src="`/api/avatars/${id}/${AvatarType.MP4}`"
        class="h-full w-full object-cover"
        :class="{
          'rounded-full border border-transparent': status !== undefined,
        }"
        autoplay
        muted
        loop
        @error="
          animate = false;
          animateDisabled = true;
        "
        @timeupdate="animate && (animateReady = true)"
      />
    </div>
    <div
      v-else
      class="bg-primary-500 flex w-full items-center justify-center rounded-full text-white"
      :class="{
        'm-px': status !== undefined,
      }"
    >
      <UserIcon class="h-2/3 w-2/3" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import UserIcon from "../icons/UserIcon.vue";
import { PropType, ref } from "vue";
import { AvatarType, Status } from "common";

const animate = ref(false);
const animateReady = ref(false);
const animateDisabled = ref(false);

defineProps({
  id: {
    type: String as PropType<string | undefined>,
    default() {
      //
    },
  },
  status: {
    type: Number as PropType<Status | undefined>,
    default() {
      //
    },
  },
});
</script>
