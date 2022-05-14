import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import ServiceWorker from "./shared/serviceWorker?worker";
import { getWorkerUrl } from "./global/helpers";
import { idbDel, idbGet, idbKeys, idbSet } from "./global/idb";
import { pinia, store } from "./global/store";

await store.start();

const app = createApp(App);
app.use(router);
app.use(pinia);
app.mount("#app");

window.dev = {
  store,
  enabled: import.meta.env.DEV,
  start() {
    this.enabled = true;
  },
  stop() {
    this.enabled = false;
    console.clear();
  },
  idb: {
    keys: idbKeys,
    get: idbGet,
    set: idbSet,
    del: idbDel,
  },
};

const _debug = console.debug.bind(console);
console.debug = (...args) => {
  if (!window.dev.enabled) {
    return;
  }

  if (
    [
      "CCallRTC",
      "SCallRTC",
      "RemoteTrackICECandidate",
      "LocalTrackICECandidate",
    ].find((k) => JSON.stringify(args).includes(k))
  ) {
    return;
  }

  _debug(...args);
};

try {
  await navigator.serviceWorker.register(getWorkerUrl(ServiceWorker), {
    type: "module",
    scope: "/",
  });
} catch (e) {
  console.warn("error registering service worker");
  console.warn(e);
}
