<template>
  <div class="flex flex-1">
    <div class="flex flex-1 flex-col items-center justify-center space-y-6">
      <AppIcon class="h-24 w-24 opacity-10 grayscale filter" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStore } from "../global/store";
import AppIcon from "../icons/AppIcon.vue";

const store = useStore();

document.title = "Hyalus";
store.sideBarOpen = true;
</script>
