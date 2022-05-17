<template>
  <div v-if="show" ref="root" class="fixed w-64 bg-gray-900 p-4" @mouseup.stop>
    <template v-if="tile.user.id === store.user?.id">
      <p>this is u!!</p>
      <InputRange v-model="a" min="0" max="200" />
    </template>
    <template v-else>
      <p>this is not u</p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { watch, ref, Ref, nextTick, PropType } from "vue";
import { ICallTile } from "../global/types";
import InputRange from "./InputRange.vue";
import { useStore } from "../global/store";

const store = useStore();
const a = ref(0);

const root: Ref<HTMLDivElement | null> = ref(null);

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  x: {
    type: Number,
    default: 0,
  },
  y: {
    type: Number,
    default: 0,
  },
  tile: {
    type: Object as PropType<ICallTile>,
    default() {
      //
    },
  },
});

const emit = defineEmits(["close"]);

watch(
  () => props.show,
  async () => {
    await nextTick();

    if (!props.show || !root.value) {
      return;
    }

    console.log("x:%d y:%d", props.x, props.y);

    root.value.style.left = `${props.x}px`;
    root.value.style.top = `${props.y}px`;

    const close = () => {
      emit("close");
      removeEventListener("mouseup", close);
    };

    setTimeout(() => {
      addEventListener("mouseup", close);
    });
  }
);
</script>
