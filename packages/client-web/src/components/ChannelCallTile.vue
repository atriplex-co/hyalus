<template>
  <div
    ref="main"
    :class="{
      'cursor-none': !controls,
      'overflow-hidden rounded-md border border-gray-600 shadow-lg':
        !isFullscreen,
    }"
    @mousemove="resetControlsTimeout"
    @fullscreenchange="updateIsFullscreen"
  >
    <div
      class="h-full w-full overflow-hidden rounded-md border border-gray-600"
      :class="{
        'bg-gray-600': srcObject,
        'bg-primary-500': !srcObject && !tile.user.avatarId,
      }"
    >
      <UserAvatar
        v-if="!srcObject && tile.user.avatarId"
        :id="tile.user.avatarId"
        class="h-full w-full"
      />
    </div>
    <div
      class="group absolute top-0 left-0 flex h-full w-full items-center justify-center overflow-hidden bg-black bg-opacity-25"
      :class="{
        'bg-gray-800': srcObject,
        'backdrop-blur-3xl': isFullscreen,
        'backdrop-blur-2xl': !isFullscreen,
      }"
    >
      <video
        v-if="srcObject"
        class="h-full w-full"
        :class="{
          'object-cover':
            !isFullscreen && tile.stream?.type !== CallStreamType.DisplayVideo,
        }"
        :srcObject.prop="srcObject"
        autoplay
        muted
        controls
      />
      <UserAvatar
        v-else
        :id="tile.user.avatarId"
        class="aspect-square w-[25%] rounded-full shadow-2xl"
      />
      <div
        v-if="controls"
        class="absolute -bottom-px -mx-px flex h-9 w-full items-end justify-between"
      >
        <div
          class="flex h-full items-center space-x-3 overflow-hidden rounded-tr-md border border-gray-600 bg-gray-800 px-3"
        >
          <div class="flex items-center space-x-2">
            <UserAvatar :id="tile.user.avatarId" class="h-5 w-5 rounded-full" />
            <p class="text-sm font-bold">{{ tile.user.name }}</p>
          </div>
          <MicOffIcon v-if="muted" class="h-4 w-4 text-gray-300" />
          <DisplayIcon
            v-if="tile.stream?.type === CallStreamType.DisplayVideo"
            class="h-4 w-4 text-gray-300"
          />
        </div>
        <div
          class="flex h-full cursor-pointer items-center rounded-tl-md border border-gray-600 bg-gray-800 px-3 text-gray-300 opacity-0 shadow-md transition hover:text-white group-hover:opacity-100"
          @click="expand"
        >
          <FullscreenIcon class="h-4 w-4" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from "./UserAvatar.vue";
import FullscreenIcon from "../icons/FullscreenIcon.vue";
import DisplayIcon from "../icons/DisplayIcon.vue";
import MicOffIcon from "../icons/MicOffIcon.vue";
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  PropType,
  Ref,
  computed,
} from "vue";
import { ICallTile } from "../global/types";
import { store } from "../global/store";
import { CallStreamType } from "common";

const props = defineProps({
  tile: {
    type: Object as PropType<ICallTile>,
    default() {
      //
    },
  },
});

const controls = ref(true);
const isFullscreen = ref(false);
const srcObject: Ref<MediaStream | null> = ref(null);
const main: Ref<HTMLDivElement | null> = ref(null);
let controlsTimeout: number;

const expand = async () => {
  if (!main.value) {
    return;
  }

  try {
    await document.exitFullscreen();
  } catch {
    main.value.requestFullscreen();
  }
};

const resetControlsTimeout = () => {
  controls.value = true;

  if (controlsTimeout) {
    clearTimeout(controlsTimeout);
  }

  if (isFullscreen.value) {
    controlsTimeout = +setTimeout(() => {
      controls.value = false;
    }, 500);
  }
};

const updateSrcObject = () => {
  if (props.tile.stream?.track.kind === "video") {
    srcObject.value = new MediaStream([props.tile.stream.track]);
  }
};

const updateIsFullscreen = () => {
  isFullscreen.value = !!document.fullscreenElement;
  resetControlsTimeout();
};

const muted = computed(() => {
  if (!store.state.value.call) {
    return true;
  }

  if (props.tile.user === store.state.value.user) {
    return !store.state.value.call.localStreams.find(
      (stream) => stream.type === CallStreamType.Audio
    );
  } else {
    return !store.state.value.call.remoteStreams.find(
      (stream) =>
        stream.userId === props.tile.user.id &&
        stream.type === CallStreamType.Audio
    );
  }
});

onMounted(updateSrcObject);
watch(() => props.tile.stream, updateSrcObject);

onBeforeUnmount(() => {
  srcObject.value = null; // https://webrtchacks.com/srcobject-intervention
});
</script>
