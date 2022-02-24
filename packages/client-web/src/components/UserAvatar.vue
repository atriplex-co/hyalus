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
    <div v-if="id" class="h-full w-full">
      <img
        v-if="type === 'image'"
        :src="url"
        class="h-full w-full object-cover"
        :class="{
          'rounded-full border border-transparent': status !== undefined,
        }"
      />
      <video
        v-if="type === 'video'"
        :src="url"
        class="h-full w-full object-cover"
        :class="{
          'rounded-full border border-transparent': status !== undefined,
        }"
        muted
        loop
        @mouseover="animate(true)"
        @mouseout="animate(false)"
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
import { watch, ref, onUnmounted, PropType } from "vue";
import { Status } from "common";

const props = defineProps({
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

const type = ref("");
const url = ref("");

const reset = () => {
  if (url.value) {
    URL.revokeObjectURL(url.value);
  }
};

const update = async () => {
  reset();

  if (props.id) {
    const res = await fetch(`/api/avatars/${props.id}`);
    url.value = URL.createObjectURL(await res.blob());
    type.value = (res.headers.get("content-type") || "").split("/")[0];
  }
};

const animate =
  (val: boolean) =>
  ({ target }: { target: EventTarget | null }) => {
    const el = target as HTMLVideoElement;

    if (val) {
      el.play();
    } else {
      el.pause();
      el.currentTime = 0;
    }
  };

update();
watch(() => props.id, update);
onUnmounted(() => reset);
</script>
