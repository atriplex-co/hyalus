<template>
  <div
    class="flex h-4 w-10 cursor-pointer items-center rounded-full border shadow-sm transition"
    :class="{
      'bg-primary-500 border-transparent': modelValue,
      'border-gray-600 bg-gray-900': !modelValue,
    }"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <div
      class="h-5 w-5 transform rounded-full bg-white transition"
      :class="{
        'translate-x-5': modelValue,
      }"
    ></div>
  </div>
</template>

<script lang="ts" setup>
defineEmits(["update:modelValue"]);

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});
</script>
