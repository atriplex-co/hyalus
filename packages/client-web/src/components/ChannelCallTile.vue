<template>
  <div
    ref="main"
    class="group absolute flex h-full w-full items-center justify-center overflow-hidden rounded-md transition"
    :class="{
      'cursor-none': !controls,
      'bg-black': isFullscreen,
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
    @dblclick="expand"
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
      class="h-full w-full"
      :class="{
        'object-cover':
          !isFullscreen && stream?.type !== CallStreamType.DisplayVideo,
      }"
    ></div>
    <UserAvatar
      v-else
      :id="tile.user.avatarId"
      class="h-24 w-24 rounded-full shadow-lg"
    />
    <div
      v-if="controls"
      class="absolute bottom-0 flex h-8 w-full items-end justify-between"
    >
      <div
        class="m-2 flex h-full items-center space-x-2 overflow-hidden rounded-md bg-black bg-opacity-25 px-2 backdrop-blur"
      >
        <p class="truncate text-sm">{{ tile.user.name }}</p>
        <MicOffIcon v-if="muted" class="h-4 w-4 flex-shrink-0" />
        <DisplayIcon
          v-if="stream?.type === CallStreamType.DisplayVideo"
          class="h-4 w-4 flex-shrink-0 text-gray-300"
        />
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
import DisplayIcon from "../icons/DisplayIcon.vue";
import MicOffIcon from "../icons/MicOffIcon.vue";
import {
  ref,
  PropType,
  Ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
} from "vue";
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

const ensureStreamEnabled = () => {
  if (
    props.tile.remoteStream?.muxer &&
    props.tile.remoteStream.dc?.readyState === "open"
  ) {
    props.tile.remoteStream.muxer.reset();
    props.tile.remoteStream.dc.send("enable");
  }
};

const ensureStreamDisabled = () => {
  if (
    props.tile.remoteStream?.muxer &&
    props.tile.remoteStream.dc?.readyState === "open"
  ) {
    props.tile.remoteStream.dc.send("disable");
  }
};

const onVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    ensureStreamEnabled();
  }

  if (document.visibilityState === "hidden") {
    ensureStreamDisabled();
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
      element = props.tile.remoteStream.element;
    }

    if (element) {
      element.style.width = "100%";
      element.style.height = "100%";
      element.controls = true;
      element.play();
      video.value.appendChild(element);
    }
  }

  addEventListener("visibilitychange", onVisibilityChange);
  ensureStreamEnabled();
});

onUnmounted(() => {
  removeEventListener("visibilitychange", onVisibilityChange);
  ensureStreamDisabled();
});

watch(
  () => props.tile.remoteStream?.dc?.readyState,
  () => {
    onVisibilityChange(); // this is a bit weird but it works great.
  }
);
</script>
