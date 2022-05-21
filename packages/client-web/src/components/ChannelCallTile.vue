<template>
  <div
    ref="main"
    class="group absolute flex h-full w-full items-center justify-center overflow-hidden transition"
    :class="{
      'cursor-none': !controls,
      'rounded-md border border-gray-600 shadow-lg': !isFullscreen,
      'ring-primary-600 ring ring-opacity-75': speaking,
      'bg-black':
        stream &&
        [CallStreamType.Video, CallStreamType.DisplayVideo].includes(
          stream?.type
        ),
      'bg-gray-800':
        !stream ||
        ![CallStreamType.Video, CallStreamType.DisplayVideo].includes(
          stream?.type
        ),
    }"
    @mousemove="resetControlsTimeout"
    @fullscreenchange="updateIsFullscreen"
    @contextmenu.prevent="
      menuX = $event.x;
      menuY = $event.y;
      menuShow = true;
    "
  >
    <!-- <video
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
      /> -->
    <div
      v-if="
        stream &&
        [CallStreamType.Video, CallStreamType.DisplayVideo].includes(
          stream?.type
        )
      "
      ref="video"
      class="flex h-full w-full"
      :class="{
        'object-cover':
          !isFullscreen && stream?.type !== CallStreamType.DisplayVideo,
      }"
    ></div>
    <UserAvatar
      v-else
      :id="tile.user.avatarId"
      class="aspect-square w-[25%] rounded-full shadow-lg"
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
          v-if="stream?.type === CallStreamType.DisplayVideo"
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
import { ref, PropType, Ref, computed, onMounted, onUnmounted } from "vue";
import { ICallTile, IHTMLMediaElement } from "../global/types";
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
const main: Ref<HTMLDivElement | null> = ref(null);
const video: Ref<HTMLDivElement | null> = ref(null);
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

const updateIsFullscreen = () => {
  isFullscreen.value = !!document.fullscreenElement;
  resetControlsTimeout();
};

const stream = computed(() => {
  return props.tile.localStream || props.tile.remoteStream;
});

const muted = computed(() => {
  if (!store.call || !stream.value) {
    return true;
  }

  if (stream.value.type === CallStreamType.DisplayVideo) {
    return false;
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

const speaking = computed(() => {
  if (!stream.value || stream.value.type === CallStreamType.DisplayVideo) {
    return false;
  }

  if (props.tile.localStream) {
    return store.call?.localStreams.find((stream2) => stream2.speaking);
  }

  if (props.tile.remoteStream) {
    return store.call?.remoteStreams.find(
      (stream2) => stream2.userId === props.tile.user.id && stream2.speaking
    );
  }

  return false;
});

const onVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    props.tile.remoteStream?.muxer?.reset();
  }
};

onMounted(() => {
  if (video.value) {
    let element: IHTMLMediaElement | null = null;

    if (video.value && props.tile.localStream) {
      element = document.createElement("video") as unknown as IHTMLMediaElement;
      element.srcObject = new MediaStream([props.tile.localStream.track]);
    }

    if (video.value && props.tile.remoteStream?.element) {
      props.tile.remoteStream.muxer?.reset();
      element = props.tile.remoteStream.element;
    }

    if (element) {
      element.play();
      // element.controls = true;
      video.value.appendChild(element);
    }

    addEventListener("visibilitychange", onVisibilityChange);
  }
});

onUnmounted(() => {
  removeEventListener("visibilitychange", onVisibilityChange);
});
</script>
