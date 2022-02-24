<template>
  <div class="flex items-center justify-between py-4 px-6">
    <div class="flex items-center space-x-6">
      <div
        class="h-10 w-10 flex-shrink-0 rounded-full p-2"
        :class="{
          'bg-primary-600 text-white': session.self,
          'border border-gray-600 bg-gray-700 text-gray-300': !session.self,
        }"
      >
        <GlobeIcon v-if="agentType === 'web'" />
        <DesktopIcon v-if="agentType === 'desktop'" />
        <MobileIcon v-if="agentType === 'mobile'" />
      </div>
      <div class="space-y-2">
        <p class="font-bold">{{ agentFormatted }}</p>
        <div class="space-y-1">
          <div class="flex items-center space-x-2 text-sm">
            <p>IP address:</p>
            <p class="text-gray-400">{{ ip }}</p>
          </div>
          <div class="flex items-center space-x-2 text-sm">
            <p>Signed in:</p>
            <p class="text-gray-400">{{ created }}</p>
          </div>
          <div v-if="!session.self" class="flex items-center space-x-2 text-sm">
            <p>Active:</p>
            <p class="text-gray-400">{{ lastStart }}</p>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!session.self" @click="del">
      <TrashIcon
        class="h-8 w-8 cursor-pointer rounded-full bg-gray-700 p-2 text-gray-400 transition hover:bg-gray-600 hover:text-white"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import DesktopIcon from "../icons/DesktopIcon.vue";
import MobileIcon from "../icons/MobileIcon.vue";
import GlobeIcon from "../icons/GlobeIcon.vue";
import TrashIcon from "../icons/TrashIcon.vue";
import moment from "moment";
import UAParser from "ua-parser-js";
import { PropType } from "vue";
import { axios } from "../global/helpers";
import { ISession } from "../global/types";

const props = defineProps({
  session: {
    type: Object as PropType<ISession>,
    default: null,
  },
});

const created = moment(props.session.created).calendar();
const lastStart = moment(props.session.lastStart).fromNow();
const ip = props.session.ip.replace("::ffff:", "");
const agentParsed = UAParser(props.session.agent);

let agentFormatted = "";
let agentType = "web";

if (agentParsed.browser) {
  agentFormatted += agentParsed.browser.name;

  if (agentParsed.browser.version) {
    agentFormatted += ` ${agentParsed.browser.version}`;
  }
}

if (
  agentParsed?.device?.type === "mobile" ||
  agentParsed?.device?.type === "tablet"
) {
  agentType = "mobile";
}

const parts = props.session.agent.split("Electron/");
if (parts.length >= 2) {
  agentFormatted = `Hyalus ${parts[1].split(" ")[0]}`;
  agentType = "desktop";
}

if (agentParsed.os) {
  if (agentFormatted) {
    agentFormatted += ` on `;
  }

  agentFormatted += agentParsed.os.name;

  if (agentParsed.os.version) {
    agentFormatted += ` ${agentParsed.os.version}`;
  }
}

const del = async () => {
  await axios.delete(`/api/sessions/${props.session.id}`);
};
</script>
