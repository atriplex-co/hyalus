<template>
  <div class="flex-1 overflow-auto">
    <div class="flex h-16 items-center px-4 text-2xl font-bold text-gray-200">
      <router-link
        v-if="isMobile"
        class="ml-2 mr-4 h-8 w-8 rounded-full bg-gray-600 p-1.5 text-gray-300 transition hover:bg-gray-500"
        to="/settings"
      >
        <ArrowLeftIcon />
      </router-link>
      <p>Appearance</p>
    </div>
    <div class="divide-y divide-gray-700 border-t border-b border-gray-700">
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Color Theme</p>
        <InputList>
          <template #selected>
            <div class="bg-primary-500 h-3 w-3 rounded-full" />
            <p>
              {{ formatColorTheme(colorTheme) }}
            </p>
          </template>
          <template #items>
            <InputListItem
              v-for="usableColorTheme in usableColorThemes"
              :key="usableColorTheme"
              @click="colorTheme = usableColorTheme"
            >
              <div
                class="h-3 w-3 rounded-full"
                :class="{
                  'bg-red-500': usableColorTheme === ColorTheme.Red,
                  'bg-orange-500': usableColorTheme === ColorTheme.Orange,
                  'bg-amber-500': usableColorTheme === ColorTheme.Amber,
                  'bg-yellow-500': usableColorTheme === ColorTheme.Yellow,
                  'bg-lime-500': usableColorTheme === ColorTheme.Lime,
                  'bg-green-500': usableColorTheme === ColorTheme.Green,
                  'bg-emerald-500': usableColorTheme === ColorTheme.Emerald,
                  'bg-teal-500': usableColorTheme === ColorTheme.Teal,
                  'bg-cyan-500': usableColorTheme === ColorTheme.Cyan,
                  'bg-sky-500': usableColorTheme === ColorTheme.Sky,
                  'bg-blue-500': usableColorTheme === ColorTheme.Blue,
                  'bg-indigo-500': usableColorTheme === ColorTheme.Indigo,
                  'bg-violet-500': usableColorTheme === ColorTheme.Violet,
                  'bg-purple-500': usableColorTheme === ColorTheme.Purple,
                  'bg-fuchsia-500': usableColorTheme === ColorTheme.Fuchsia,
                  'bg-pink-500': usableColorTheme === ColorTheme.Pink,
                  'bg-rose-500': usableColorTheme === ColorTheme.Rose,
                }"
              />
              <p>
                {{ formatColorTheme(usableColorTheme) }}
              </p>
            </InputListItem>
          </template>
        </InputList>
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Font Scale</p>
        <InputList>
          <template #selected>
            <p>{{ fontScale }}%</p>
          </template>
          <template #items>
            <InputListItem
              v-for="usableFontScale in usableFontScales"
              :key="usableFontScale"
              @click="fontScale = usableFontScale"
            >
              <p>{{ usableFontScale }}%</p>
            </InputListItem>
          </template>
        </InputList>
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Adaptive Layout</p>
        <InputBoolean v-model="adaptiveLayout" />
      </div>
      <div class="flex h-16 items-center justify-between px-6">
        <p class="font-bold">Grayscale</p>
        <InputBoolean v-model="grayscale" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import InputList from "../components/InputList.vue";
import InputListItem from "../components/InputListItem.vue";
import InputBoolean from "../components/InputBoolean.vue";
import { computed } from "vue";
import { configToComputed, isMobile } from "../global/helpers";
import { ColorTheme } from "common";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import axios from "axios";
import { useStore } from "../global/store";

const store = useStore();

const usableColorThemes = [
  ColorTheme.Red,
  ColorTheme.Orange,
  ColorTheme.Amber,
  ColorTheme.Yellow,
  ColorTheme.Lime,
  ColorTheme.Green,
  ColorTheme.Emerald,
  ColorTheme.Teal,
  ColorTheme.Cyan,
  ColorTheme.Sky,
  ColorTheme.Blue,
  ColorTheme.Indigo,
  ColorTheme.Violet,
  ColorTheme.Purple,
  ColorTheme.Fuchsia,
  ColorTheme.Pink,
  ColorTheme.Rose,
];

const usableFontScales = [
  50, 67, 75, 80, 90, 100, 110, 125, 133, 140, 150, 175, 200,
];

const adaptiveLayout = configToComputed<boolean>("adaptiveLayout");
const fontScale = configToComputed<number>("fontScale");
const grayscale = configToComputed<boolean>("grayscale");

const colorTheme = computed({
  get(): ColorTheme {
    return store.config.colorTheme;
  },
  async set(val: ColorTheme): Promise<void> {
    await axios.post("/api/self", {
      colorTheme: val,
    });
  },
});

const formatColorTheme = (val: ColorTheme) => {
  return `${ColorTheme[val][0].toUpperCase()}${ColorTheme[val].slice(1)}`;
};

document.title = `Hyalus \u2022 Appearance`;

store.sideBarOpen = false;
</script>
