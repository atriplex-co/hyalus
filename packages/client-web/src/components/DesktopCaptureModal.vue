<template>
  <ModalBase
    title="Share screen"
    submit-text="Share"
    :show="show"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <DisplayIcon />
    </template>
    <template #main>
      <div class="w-full space-y-2">
        <p class="text-sm text-gray-300">Source</p>
        <div
          class="h-48 w-full overflow-auto rounded-md border border-gray-600 bg-gray-800"
        >
          <div
            v-for="source in sources"
            :key="source.id"
            class="flex cursor-pointer items-center justify-between space-x-3 px-3 py-2 text-gray-300"
            :class="{
              'hover:bg-gray-900': selectedSourceId !== source.id,
              'bg-gray-900': selectedSourceId === source.id,
            }"
            @click="selectedSourceId = source.id"
          >
            <div class="flex w-full min-w-0 items-center space-x-3">
              <img
                class="w-12 rounded-sm border border-gray-700 shadow-sm"
                :src="source.thumbnail"
              />
              <p class="truncate text-xs font-bold">{{ source.name }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-3 px-2">
        <InputBoolean v-model="selectedAudio" />
        <p>Share audio</p>
      </div>
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
/* eslint-disable no-undef */

import ModalBase from "./ModalBase.vue";
import DisplayIcon from "../icons/DisplayIcon.vue";
import InputBoolean from "./InputBoolean.vue";
import { ref, Ref, watch } from "vue";
import { CallStreamType } from "common";
import { ICallLocalStream } from "../global/types";
import { useStore } from "../global/store";

const store = useStore();

interface ISource {
  id: string;
  name: string;
  thumbnail: string;
}

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const sources: Ref<ISource[]> = ref([]);
const selectedSourceId = ref("screen:0:0");
const selectedAudio = ref(true);

const win32CaptureAvailable =
  window.HyalusDesktop?.osPlatform === "win32" &&
  +window.HyalusDesktop?.osRelease.split(".")[0] >= 10 &&
  +window.HyalusDesktop?.osRelease.split(".")[2] >= 19043;

const submit = async () => {
  if (!selectedSourceId.value) {
    return;
  }

  const videoHeight = +store.config.videoMode.split("p")[0] || 1280;
  const videoWidth =
    {
      360: 640,
      480: 854,
      720: 1280,
      1080: 1920,
    }[videoHeight] || 720;
  const videoFps = +store.config.videoMode.split("p")[1] || 60;
  const videoBitrate =
    {
      ["480p30"]: 3000000,
      ["480p60"]: 3000000,
      ["720p30"]: 3000000,
      ["720p60"]: 4500000,
      ["1080p30"]: 4500000,
      ["1080p60"]: 6000000,
    }[store.config.videoMode] || 4500000;

  const getStream = async (audio: boolean): Promise<MediaStream> => {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: selectedSourceId.value,
          maxWidth: videoWidth,
          maxHeight: videoHeight,
          maxFrameRate: videoFps,
        },
      },
      audio: audio && {
        mandatory: {
          chromeMediaSource: "desktop",
        },
      },
    } as unknown as MediaStreamConstraints);
  };

  if (win32CaptureAvailable) {
    const videoStream = await store.callAddLocalStream({
      type: CallStreamType.DisplayVideo,
      track: (await getStream(false)).getTracks()[0],
      submitOverride: true,
    });

    let audioStream: ICallLocalStream | undefined;
    // const audioWriter: WritableStreamDefaultWriter<AudioData>; // TODO: fix this shit.

    if (selectedAudio.value) {
      const audioGenerator = new MediaStreamTrackGenerator({
        kind: "audio",
      });

      // audioWriter = audioGenerator.writable.getWriter();
      audioStream = await store.callAddLocalStream({
        type: CallStreamType.DisplayAudio,
        track: audioGenerator,
        procOverride: true,
        silent: true,
      });
    }

    const opts = {
      id: selectedSourceId.value,
      video: !!videoStream,
      videoWidth,
      videoHeight,
      videoFps,
      videoBitrate,
      audio: !!audioStream,
    };

    console.log(JSON.stringify(opts, null, 2));

    window.HyalusDesktop?.startWin32Capture(opts, async (data) => {
      if (!data) {
        return;
      }

      if (videoStream && data.t === "video") {
        videoStream.submit(new Uint8Array(data.d.data));

        if (videoStream.requestKeyFrame) {
          videoStream.requestKeyFrame = false;
          window.HyalusDesktop?.msgWin32Capture("video_request_key_frame");
        }
      }

      if (audioStream && data.t === "audio") {
        const frame = new AudioData({
          format: "f32",
          sampleRate: data.d.sampleRate,
          numberOfFrames: data.d.frames,
          numberOfChannels: data.d.channels,
          timestamp: data.d.timestamp,
          data: new Uint8Array(data.d.data),
        });

        await audioStream.proc(frame);
      }
    });

    emit("close");
    return;
  }

  let stream: MediaStream | null = null;

  try {
    stream = await getStream(selectedAudio.value);
  } catch {
    stream = await getStream(false);
  }

  for (const track of stream.getTracks()) {
    await store.callAddLocalStream({
      type:
        track.kind === "video"
          ? CallStreamType.DisplayVideo
          : CallStreamType.DisplayAudio,
      track,
      silent: track.kind !== "video",
    });
  }

  emit("close");
};

let updateSourcesInterval: number;

const updateSources = async () => {
  if (!window.HyalusDesktop) {
    return;
  }

  sources.value = await window.HyalusDesktop.getSources();
};

watch(
  () => props.show,
  async () => {
    selectedSourceId.value = "screen:0:0";
    selectedAudio.value = true;

    if (props.show) {
      await updateSources();

      updateSourcesInterval = +setInterval(async () => {
        await updateSources();
      }, 1000);
    } else {
      clearInterval(updateSourcesInterval);
    }
  }
);
</script>
