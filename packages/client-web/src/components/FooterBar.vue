<template>
  <div
    class="flex flex-col items-center border-t border-gray-700 bg-gray-900 p-12 text-gray-400"
  >
    <div class="flex space-x-8">
      <a
        class="h-6 w-6 text-gray-400 transition hover:text-gray-200"
        href="https://twitter.com/hyalusapp"
      >
        <TwitterIcon />
      </a>
      <a
        class="h-6 w-6 text-gray-400 transition hover:text-gray-200"
        href="https://instagram.com/hyalusapp"
      >
        <InstagramIcon />
      </a>
      <a
        class="h-6 w-6 text-gray-400 transition hover:text-gray-200"
        href="https://facebook.com/hyalusapp"
      >
        <FacebookIcon />
      </a>
      <a
        class="h-6 w-6 text-gray-400 transition hover:text-gray-200"
        href="https://youtube.com/hyalusapp"
      >
        <YouTubeIcon />
      </a>
      <a
        class="h-6 w-6 text-gray-400 transition hover:text-gray-200"
        href="https://github.com/hyalusapp"
      >
        <GitHubIcon />
      </a>
    </div>
  </div>
</template>

<script lang="ts" setup>
import TwitterIcon from "../icons/TwitterIcon.vue";
import InstagramIcon from "../icons/InstagramIcon.vue";
import FacebookIcon from "../icons/FacebookIcon.vue";
import YouTubeIcon from "../icons/YouTubeIcon.vue";
import GitHubIcon from "../icons/GitHubIcon.vue";
</script>
