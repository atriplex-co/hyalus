<template>
  <ModalBase
    :show="show"
    title="Create group"
    submit-text="Create"
    @close="$emit('close')"
    @submit="submit"
  >
    <template #icon>
      <GroupIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput v-model="name" type="text" label="Name" autofocus />
      <InputUser :users="users" />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import GroupIcon from "../icons/GroupIcon.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import InputUser from "./InputUser.vue";
import { ref, watch } from "vue";
import { prettyError } from "../global/helpers";
import { SocketMessageType } from "common";
import axios from "axios";
import { useStore } from "../global/store";

const store = useStore();

const props = defineProps({
  show: {
    type: Boolean,
  },
  selected: {
    type: String,
    default() {
      //
    },
  },
});

const emit = defineEmits(["close"]);
const users = ref(
  store.friends
    .filter((f) => f.accepted)
    .map((f) => ({
      ...f,
      selected: f.id === props.selected,
    }))
);
const error = ref("");
const name = ref("");

const submit = async () => {
  try {
    store.expectedEvent = SocketMessageType.SChannelCreate;

    await axios.post("/api/channels", {
      name: name.value,
      userIds: users.value.filter((f) => f.selected).map((f) => f.id),
    });

    delete store.expectedEvent;
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  emit("close");
};

watch(
  () => props.show,
  () => {
    error.value = "";
    name.value = "";

    for (const user of users.value) {
      user.selected = false;
    }
  }
);
</script>
