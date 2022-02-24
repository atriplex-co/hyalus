<template>
  <div
    v-if="error"
    class="flex w-full items-center space-x-3 rounded-md border border-gray-500 bg-gray-600 p-3 text-sm text-gray-200"
  >
    <ErrorIcon class="h-6 w-6" />
    <p class="flex-1">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import ErrorIcon from "../icons/ErrorIcon.vue";

defineProps({
  error: {
    type: String,
    default: "",
  },
});
</script>
