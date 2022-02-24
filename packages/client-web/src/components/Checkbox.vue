<template>
  <div
    :class="[
      'rounded-md border transition duration-100',
      { 'border-gray-700 bg-gray-900 text-gray-900': !modelValue },
      { 'bg-primary-500 border-primary-600 text-white': modelValue },
    ]"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <CheckIcon class="h-6 w-6 p-1" />
  </div>
</template>

<script lang="ts" setup>
import CheckIcon from "../icons/CheckIcon.vue";

defineEmits(["update:modelValue"]);

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});
</script>
