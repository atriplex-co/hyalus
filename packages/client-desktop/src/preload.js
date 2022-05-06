const { contextBridge, ipcRenderer } = require("electron");
const os = require("os");

let win32Capture;
let win32CaptureBuffer;

const stopWin32Capture = () => {
  if (win32Capture) {
    win32Capture.stop();
  }
};

const startWin32Capture = (opts, cb) => {
  stopWin32Capture();

  if (!win32Capture) {
    win32Capture = require("@hyalusapp/win32-audio/build/Release/addon.node");
  }

  win32CaptureBuffer = new SharedArrayBuffer(32 * 1024 * 1024); // 32MB

  win32Capture.start(
    {
      ...opts,
      buffer: new Uint8Array(win32CaptureBuffer),
    },
    (data) => {
      if (!data) {
        win32CaptureBuffer = null;
        return;
      }

      cb(data);
    }
  );

  postMessage(buffer);
};

addEventListener("beforeunload", () => {
  stopWin32Capture();
});

contextBridge.exposeInMainWorld("HyalusDesktop", {
  close: () => ipcRenderer.invoke("close"),
  maximize: () => ipcRenderer.invoke("maximize"),
  minimize: () => ipcRenderer.invoke("minimize"),
  restart: () => ipcRenderer.invoke("restart"),
  quit: () => ipcRenderer.invoke("quit"),
  getSources: () => ipcRenderer.invoke("getSources"),
  getOpenAtLogin: () => ipcRenderer.invoke("getOpenAtLogin"),
  setOpenAtLogin: (val) => ipcRenderer.invoke("setOpenAtLogin", val),
  getWasOpenedAtLogin: () => ipcRenderer.invoke("getWasOpenedAtLogin"),
  osPlatform: os.platform(),
  osRelease: os.release(),
  stopWin32Capture,
  startWin32Capture,
});
