import { contextBridge, ipcRenderer } from "electron";
import os from "os";

let win32Capture:
  | {
      startCapture(...args: unknown[]): void;
      stopCapture(): void;
    }
  | undefined;

const stopWin32Capture = () => {
  if (win32Capture) {
    win32Capture.stopCapture();
  }
};

const startWin32Capture = (...args: unknown[]) => {
  if (!win32Capture) {
    win32Capture = require("@atriplex-co/hyalus-win32-utils");
  }

  win32Capture.startCapture(...args);
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
  getStartupSettings: () => ipcRenderer.invoke("getStartupSettings"),
  setStartupSettings: (val: unknown) =>
    ipcRenderer.invoke("setStartupSettings", val),
  osPlatform: os.platform(),
  osRelease: os.release(),
  startWin32Capture,
  stopWin32Capture,
});
