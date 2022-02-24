<template>
  <div class="flex flex-1">
    <div class="flex flex-1 flex-col items-center justify-center space-y-6">
      <AppIcon class="h-24 w-24 opacity-10 grayscale filter" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from "../icons/AppIcon.vue";
import { store } from "../global/store";

document.title = "Hyalus";
store.state.value.sideBarOpen = true;
</script>
