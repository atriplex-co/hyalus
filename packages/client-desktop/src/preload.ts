import { contextBridge, ipcRenderer } from "electron";
import os from "os";

interface IWin32CaptureUserOpts {
  id: string;
  fps: number;
  video: boolean;
  audio: boolean;
}

interface IWin32CaptureInternalOpts {
  id: string;
  fps: number;
  video: boolean;
  audio: boolean;
  buffer: Uint8Array;
}

let win32Capture:
  | {
      startCapture(
        opts: IWin32CaptureInternalOpts,
        cb: (data: unknown) => void
      ): void;
      stopCapture(): void;
    }
  | undefined;
let win32CaptureBuffer;

const stopWin32Capture = () => {
  if (win32Capture) {
    win32Capture.stopCapture();
  }
};

const startWin32Capture = (
  opts: IWin32CaptureUserOpts,
  cb: (data: unknown) => void
) => {
  if (!win32Capture) {
    win32Capture = require("@atriplex-co/hyalus-win32-utils");
  }

  win32CaptureBuffer = new SharedArrayBuffer(32 * 1024 * 1024); // 32MB
  postMessage(win32CaptureBuffer);

  win32Capture.startCapture(
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
  stopWin32Capture,
  startWin32Capture,
});
