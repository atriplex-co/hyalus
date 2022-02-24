<template>
  <transition
    leave-active-class="transition transform ease-in"
    leave-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-90"
  >
    <div class="h-full">
      <div
        class="flex h-full flex-col items-center justify-center space-y-8 text-sm text-gray-400"
      >
        <AppIcon class="h-20 w-20" />
        <LoadingIcon class="h-6 w-6" />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import AppIcon from "../icons/AppIcon.vue";
import LoadingIcon from "../icons/LoadingIcon.vue";
</script>
