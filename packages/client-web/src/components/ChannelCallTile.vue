<template>
  <div
    ref="main"
    class="hover:ring-primary-600 h-full w-full overflow-hidden rounded-md border border-gray-600 bg-gray-200 bg-opacity-10 hover:ring hover:ring-opacity-75"
    :class="{
      'cursor-none': !controls,
      'rounded- overflow-hidden shadow-lg': !isFullscreen,
    }"
    @mousemove="resetControlsTimeout"
    @fullscreenchange="updateIsFullscreen"
    @contextmenu.prevent="
      menuX = $event.x;
      menuY = $event.y;
      menuShow = true;
    "
  >
    <div
      class="group flex h-full w-full items-center justify-center overflow-hidden bg-black bg-opacity-25"
      :class="{
        'bg-gray-800': srcObject,
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
        class="w-[25%] rounded-full shadow-lg"
      />
      <div
        v-if="controls"
        class="absolute -bottom-px -mx-px flex h-10 w-full items-end justify-between"
      >
        <div
          class="flex h-full items-center space-x-3 overflow-hidden rounded-tr-md border border-gray-600 bg-gray-800 px-4"
        >
          <p class="text-sm font-bold">{{ tile.user.name }}</p>
          <MicOffIcon v-if="muted" class="h-4 w-4 text-gray-300" />
          <DisplayIcon
            v-if="tile.stream?.type === CallStreamType.DisplayVideo"
            class="h-4 w-4 text-gray-300"
          />
        </div>
        <div
          class="flex h-full w-12 cursor-pointer items-center justify-center rounded-tl-md border border-gray-600 bg-gray-800 text-gray-300 opacity-0 shadow-md transition hover:text-white group-hover:opacity-100"
          @click="expand"
        >
          <FullscreenIcon class="h-4 w-4" />
        </div>
      </div>
    </div>
    <ChannelCallTileMenu
      :show="menuShow"
      :x="menuX"
      :y="menuY"
      :tile="tile"
      @close="menuShow = false"
    />
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
import { CallStreamType } from "common";
import ChannelCallTileMenu from "./ChannelCallTileMenu.vue";
import { useStore } from "../global/store";

const store = useStore();

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
const menuShow = ref(false);
const menuX = ref(0);
const menuY = ref(0);
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

  clearTimeout(controlsTimeout);

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
  if (!store.call) {
    return true;
  }

  if (props.tile.user === store.user) {
    return !store.call.localStreams.find(
      (stream) => stream.type === CallStreamType.Audio
    );
  } else {
    return !store.call.remoteStreams.find(
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
