import { contextBridge, ipcRenderer } from "electron";
import os from "os";

declare const addEventListener: (arg0: string, arg1: () => void) => void; // gets TS to shut up.

let win32Capture:
  | {
      startCapture(...args: unknown[]): void;
      stopCapture(...args: unknown[]): void;
      msgCapture(...args: unknown[]): void;
    }
  | undefined;

const stopWin32Capture = (...args: unknown[]) => {
  if (win32Capture) {
    win32Capture.stopCapture(...args);
  }
};

const startWin32Capture = (...args: unknown[]) => {
  if (!win32Capture) {
    win32Capture = require("@atriplex-co/hyalus-win32-utils");
  }

  if (win32Capture) {
    win32Capture.startCapture(...args);
  }
};

const msgWin32Capture = (...args: unknown[]) => {
  if (win32Capture) {
    win32Capture.msgCapture(...args);
  }
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
  msgWin32Capture,
});
