<template>
  <div
    class="relative h-3 w-full rounded-md border border-gray-700 bg-gray-900"
  >
    <div
      id="val"
      class="absolute -top-10 z-10 flex w-10 items-center justify-center rounded-md border border-gray-800 bg-gray-900 py-1 px-2 text-sm transition"
      :class="{
        'opacity-0': !valueShow,
      }"
    >
      {{ value }}
    </div>
    <input
      ref="input"
      v-model="value"
      type="range"
      :min="min"
      :max="max"
      class="absolute w-full appearance-none bg-transparent"
      @mouseenter="valueShow = true"
      @mouseleave="valueShow = false"
    />
    <div id="bar" class="bg-primary-500 absolute h-full rounded-l-md" />
  </div>
</template>

<script lang="ts" setup>
import { ref, Ref, computed, watch } from "vue";

const emit = defineEmits(["update:modelValue"]);

const props = defineProps({
  min: {
    type: String,
    default: "0",
  },
  max: {
    type: String,
    default: "0",
  },
  modelValue: {
    type: Number,
    default: 0,
  },
});

const input: Ref<HTMLInputElement | null> = ref(null);
const value = ref(props.modelValue.toString());
const valueShow = ref(false);

const barWidth = computed(() => {
  if (!input.value) {
    return "";
  }

  return `${(+value.value / +props.max) * (input.value.offsetWidth - 16)}px`;
});

let lastEmitTime = 0;
let emitTimeout = 0;

watch(
  () => value.value,
  () => {
    if (Date.now() - lastEmitTime < 100) {
      clearTimeout(emitTimeout);
      emitTimeout = +setTimeout(() => {
        emit("update:modelValue", +value.value);
      }, 100);

      return;
    }

    lastEmitTime = Date.now();
    emit("update:modelValue", +value.value);
  }
);
</script>

<style scoped>
:root {
  --val-display: none;
}

input {
  pointer-events: none;
}

input::-webkit-slider-thumb {
  pointer-events: auto;
  @apply absolute -top-[0.3125rem] z-10 h-5 w-2 cursor-[ew-resize] appearance-none rounded-full bg-white;
  left: v-bind(barWidth);
}

#bar {
  width: v-bind(barWidth);
}

#val {
  left: calc(v-bind(barWidth) - 1rem);
}
</style>
