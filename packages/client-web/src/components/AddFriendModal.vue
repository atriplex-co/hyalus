<template>
  <ModalBase
    :show="show"
    title="Add friend"
    submit-text="Add"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <UserAddIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput v-model="username" type="text" label="Username" autofocus />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import UserAddIcon from "../icons/UserAddIcon.vue";
import { ref, watch } from "vue";
import { prettyError } from "../global/helpers";
import axios from "axios";

const props = defineProps({
  show: {
    type: Boolean,
  },
});

const emit = defineEmits(["close"]);

const username = ref("");
const error = ref("");

const submit = async () => {
  try {
    await axios.post("/api/friends", {
      username: username.value,
    });
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
    username.value = "";
  }
);
</script>
