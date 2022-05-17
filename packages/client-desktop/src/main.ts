require("v8-compile-cache");

import {
  app,
  BrowserWindow,
  nativeTheme,
  Tray,
  Menu,
  ipcMain,
  shell,
  desktopCapturer,
  crashReporter,
} from "electron";
import path from "path";
import os from "os";
import { autoUpdater } from "electron-updater";
import fs from "fs";
import contextMenu from "electron-context-menu";
import Registry from "winreg";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../package.json")).toString()
);

let mainWindow: BrowserWindow | null = null;
let quitting = false;

if (!app.requestSingleInstanceLock() && !process.argv.includes("--dupe")) {
  app.quit();
}

app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer"); // DO NOT FUCKING TOUCH THIS!
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("force_high_performance_gpu");

nativeTheme.themeSource = "dark";

crashReporter.start({
  submitURL: "http://127.0.0.1",
  uploadToServer: false,
});

contextMenu({
  showSaveImage: true,
  showSaveImageAs: true,
  showCopyImageAddress: true,
  showInspectElement: pkg.name === "HyalusDev",
});

const getStartupSettings = async () => {
  const settings = app.getLoginItemSettings();

  let enabled = settings.openAtLogin;
  let minimized = settings.openAsHidden;

  if (os.platform() === "win32") {
    enabled = settings.launchItems[0]?.enabled;

    const reg = new Registry({
      hive: Registry.HKCU,
      key: "\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    });

    await new Promise((resolve) => {
      reg.get(
        `app.hyalus${pkg.name === "HyalusDev" ? ".dev" : ""}`,
        (err, v) => {
          if (err) {
            minimized = false;
          } else {
            minimized = v.value.includes("--minimized");
          }

          resolve(0);
        }
      );
    });
  }

  return {
    enabled,
    minimized,
  };
};

const setStartupSettings = async (opts: {
  enabled: boolean;
  minimized: boolean;
}) => {
  app.setLoginItemSettings({
    openAtLogin: os.platform() === "win32" ? true : opts.enabled,
    openAsHidden: opts.minimized,
    enabled: opts.enabled,
    name: pkg.name,
  });

  if (os.platform() === "win32") {
    const reg = new Registry({
      hive: Registry.HKCU,
      key: "\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    });

    await new Promise((resolve) => {
      reg.set(
        `app.hyalus${pkg.name === "HyalusDev" ? ".dev" : ""}`,
        Registry.REG_SZ,
        `"${process.execPath}"${opts.minimized ? " --minimized" : ""}`,
        resolve
      );
    });
  }
};

const restart = () => {
  quitting = true;
  app.releaseSingleInstanceLock();
  app.relaunch(
    mainWindow
      ? {
          args: [`--resume=${mainWindow.webContents.getURL()}`],
        }
      : {}
  );
  app.quit();
};

app.on("ready", async () => {
  await app.whenReady();

  const tray = new Tray(path.join(__dirname, "../../assets/icon.png"));

  tray.setToolTip(`${pkg.name} ${pkg.version}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open",
        click() {
          mainWindow?.show();
        },
      },
      {
        label: "Restart",
        click: restart,
      },
      {
        label: "Quit",
        click() {
          quitting = true;
          app.quit();
        },
      },
    ])
  );

  tray.on("click", () => {
    mainWindow?.show();
  });

  await new Promise((resolve) => {
    autoUpdater.on("update-downloaded", () => {
      autoUpdater.quitAndInstall(true, true);
    });

    autoUpdater.on("update-not-available", resolve);
    autoUpdater.on("error", resolve);

    autoUpdater.checkForUpdates();
  });

  if (pkg.name === "Hyalus") {
    app.setAppUserModelId("app.hyalus");
  }

  if (pkg.name === "HyalusDev") {
    app.setAppUserModelId("app.hyalus.dev");

    // devtools
    await installExtension(VUEJS_DEVTOOLS);
  }

  const initPath = path.join(app.getPath("userData"), "init2");
  if (!fs.existsSync(initPath)) {
    fs.writeFileSync(initPath, ""); // so this only runs on the first start.

    try {
      await setStartupSettings({
        enabled: true,
        minimized: true,
      });
    } catch {
      //
    }
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    ...(["win32", "darwin"].indexOf(os.platform())
      ? {
          titleBarStyle: "hidden",
        }
      : {
          frame: false,
        }),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false,
    },
  });

  const resumeArg = process.argv.find((arg) => arg.startsWith("--resume="));

  if (resumeArg) {
    mainWindow.loadURL(resumeArg.split("--resume=")[1]);
  } else {
    if (pkg.name === "Hyalus") {
      mainWindow.loadURL("https://hyalus.app/app");
    }

    if (pkg.name === "HyalusDev") {
      mainWindow.loadURL("https://dev.hyalus.app/app");
    }
  }

  mainWindow.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("ready-to-show", () => {
    if (
      app.getLoginItemSettings().wasOpenedAsHidden ||
      process.argv.includes("--minimized")
    ) {
      return;
    }

    mainWindow?.show();
  });

  mainWindow.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") {
      return;
    }

    if (input.key === "F12") {
      mainWindow?.webContents.openDevTools();
    }

    if (input.key === "F5") {
      mainWindow?.reload();
    }

    if (input.key === "F6") {
      restart();
    }
  });

  mainWindow.webContents.on("did-fail-load", () => {
    mainWindow?.loadFile(path.join(__dirname, "../public/error.html"));
  });

  mainWindow.removeMenu();
});

app.on("second-instance", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.on("web-contents-created", (e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);

    return {
      action: "deny",
    };
  });

  contents.on("will-navigate", (e, url) => {
    const parsedURL = new URL(url);

    if (
      ![
        "https://hyalus.app",
        "https://dev.hyalus.app", // dev server
      ].includes(parsedURL.origin)
    ) {
      e.preventDefault();
    }
  });
});

ipcMain.handle("close", () => {
  mainWindow?.close();
});

ipcMain.handle("maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle("minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("restart", () => {
  restart();
});

ipcMain.handle("quit", () => {
  quitting = true;
  app.quit();
});

ipcMain.handle("getSources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
  });

  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
  }));
});

ipcMain.handle("getStartupSettings", async () => {
  return await getStartupSettings();
});

ipcMain.handle("setStartupSettings", async (e, val) => {
  await setStartupSettings(val);
});
