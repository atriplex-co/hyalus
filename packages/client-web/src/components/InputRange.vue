<template>
  <div
    class="relative h-3 w-96 rounded-md border border-gray-700 bg-gray-900 py-px"
  >
    <input
      ref="input"
      type="range"
      :min="min"
      :max="max"
      :style="style"
      class="absolute -top-px h-3 w-96 appearance-none bg-transparent"
      @input="$emit('update:modelValue', +($event?.target as HTMLInputElement).value)"
    />
    <div
      id="bar"
      class="bg-primary-500 absolute -top-px h-3 rounded-l-md"
      :style="style"
    />
  </div>
</template>

<script lang="ts" setup>
import {
  defineEmits,
  onMounted,
  ref,
  watch,
  Ref,
  computed,
  StyleValue,
} from "vue";

defineEmits(["update:modelValue"]);

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
const width = ref("0px");

const update = () => {
  if (!input.value) {
    return;
  }

  width.value = `${(+input.value.value / +props.max) * 22.5}rem`;
};

const style = computed(() => {
  return {
    "--width": width.value,
  } as unknown as StyleValue;
});

onMounted(() => {
  if (!input.value) {
    return;
  }

  input.value.value = String(props.modelValue);
  update();
});

watch(() => props.modelValue, update);
</script>

<style scoped>
input::-webkit-slider-thumb {
  appearance: none;
  left: var(--width);
  @apply absolute -top-1 z-10 h-5 w-5 cursor-[ew-resize] rounded-full bg-white;
}

#bar {
  width: var(--width);
}
</style>
