<template>
  <div
    class="bg-primary-500 flex items-center justify-center rounded-full font-bold text-white"
  >
    <p>{{ name.slice(0, 1) }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps({
  name: {
    type: String,
    default: "?",
  },
});
</script>
