<template>
  <ModalBase
    :show="show"
    title="Add friend"
    submit-text="Send"
    @submit="submit"
    @close="reset"
  >
    <template #icon>
      <UserAddIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <div class="w-full space-y-2">
        <p class="text-sm text-gray-300">User</p>
        <div
          v-if="user"
          class="flex w-full items-center space-x-4 rounded-md border border-gray-600 bg-gray-800 px-4 py-2"
        >
          <UserAvatar :id="user.avatarId" class="h-8 w-8 rounded-full" />
          <div>
            <p class="text-sm font-bold text-white">{{ user.name }}</p>
            <p class="text-sm text-gray-300">@{{ user.username }}</p>
          </div>
        </div>
      </div>
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalError from "./ModalError.vue";
import UserAvatar from "./UserAvatar.vue";
import UserAddIcon from "../icons/UserAddIcon.vue";
import { ref, Ref, watch } from "vue";
import { prettyError } from "../global/helpers";
import { IUser } from "../global/types";
import axios from "axios";
import { useStore } from "../global/store";

const store = useStore();

const user: Ref<IUser | null> = ref(null);
const error = ref("");

const props = defineProps({
  show: {
    type: Boolean,
  },
});

const reset = () => {
  delete store.invite;
};

const submit = async () => {
  if (store.friends.find((friend) => friend.username === store.invite)) {
    return;
  }

  try {
    await axios.post("/api/friends", {
      username: store.invite,
    });
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  reset();
};

watch(
  () => props.show,
  async () => {
    if (!props.show) {
      return;
    }

    try {
      const { data } = await axios.get(`/api/users/${store.invite}`);

      user.value = data;
    } catch {
      reset();
    }
  }
);
</script>
