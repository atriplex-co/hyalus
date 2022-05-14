<template>
  <ModalBase
    :show="show"
    title="Enable 2FA"
    submit-text="Enable"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <LockIcon />
    </template>
    <template #main>
      <div class="overflow-hidden rounded-md border border-gray-600">
        <img
          class="h-full w-full contrast-[80%] invert filter"
          :src="qrcodeUrl"
        />
      </div>
      <div class="space-y-2 text-sm">
        <a
          class="group flex items-center space-x-3 text-gray-300 transition hover:text-white"
          href="https://apps.apple.com/us/app/google-authenticator/id388497605"
          target="_blank"
          rel="noreferrer noopener"
        >
          <AppleIcon class="h-6 w-6 text-gray-400 group-hover:text-gray-200" />
          <p>Authenticator for iOS</p>
        </a>
        <a
          class="group flex items-center space-x-3 text-gray-300 transition hover:text-white"
          href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
          target="_blank"
          rel="noreferrer noopener"
        >
          <GooglePlayIcon
            class="h-6 w-6 text-gray-400 group-hover:text-gray-200"
          />
          <p>Authenticator for Android</p>
        </a>
        <div
          class="group flex items-center space-x-3 text-gray-300 transition hover:text-white"
          :class="{
            'cursor-pointer': !showTotpSecretB32,
          }"
          @click="showTotpSecretB32 = true"
        >
          <LockIcon class="h-6 w-6 text-gray-400 group-hover:text-gray-200" />
          <p v-if="showTotpSecretB32">{{ totpSecretB32 }}</p>
          <p v-else>Show TOTP secret</p>
        </div>
      </div>
      <ModalError :error="error" />
      <ModalInput
        v-model="password"
        type="password"
        label="Password"
        autocomplete="current-password"
      />
      <ModalInput v-model="totpCode" type="text" label="2FA Code" />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import LockIcon from "../icons/LockIcon.vue";
import AppleIcon from "../icons/AppleIcon.vue";
import GooglePlayIcon from "../icons/GooglePlayIcon.vue";
import qrcode from "qrcode";
import { ref, onMounted, watch } from "vue";
import sodium from "libsodium-wrappers";
import b32 from "base32-encode";
import { prettyError } from "../global/helpers";
import { store } from "../global/store";
import axios from "axios";

const props = defineProps({
  show: {
    type: Boolean,
  },
});

const emit = defineEmits(["close"]);

const error = ref("");
const password = ref("");
const totpCode = ref("");
const showTotpSecretB32 = ref(false);
const totpSecret = sodium.randombytes_buf(10);
const totpSecretB32 = b32(totpSecret, "RFC3548");
const qrcodeUrl = ref("");

const submit = async () => {
  if (!store.config.salt) {
    return;
  }

  try {
    const symKey = sodium.crypto_pwhash(
      32,
      password.value,
      store.config.salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );

    const authKey = sodium.crypto_pwhash(
      32,
      symKey,
      store.config.salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );

    await axios.post("/api/self", {
      totp: {
        authKey: sodium.to_base64(authKey),
        totpSecret: sodium.to_base64(totpSecret),
        totpCode: +totpCode.value,
      },
    });
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  emit("close");
};

onMounted(async () => {
  if (!store.user) {
    return;
  }

  qrcodeUrl.value = await qrcode.toDataURL(
    `otpauth://totp/Hyalus:${store.user.username}?secret=${totpSecretB32}&issuer=Hyalus`
  );
});

watch(
  () => props.show,
  () => {
    error.value = "";
    password.value = "";
    totpCode.value = "";
  }
);
</script>

<style scoped>
.qrcode {
  filter: invert() contrast(80%);
}
</style>
