const {
  app,
  BrowserWindow,
  nativeTheme,
  Tray,
  Menu,
  ipcMain,
  shell,
  desktopCapturer,
  crashReporter,
  dialog,
} = require("electron");
const path = require("path");
const os = require("os");
const { autoUpdater } = require("electron-updater");
const fs = require("fs");
const pkg = require("../package.json");
const contextMenu = require("electron-context-menu");
const Registry = require("winreg");

let tray;
let mainWindow;
let quitting;
let running;

if (!app.requestSingleInstanceLock()) {
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
        {
          Hyalus: "app.hyalus",
          HyalusDev: "app.hyalus.dev",
        }[pkg.name],
        (err, v) => {
          if (err) {
            minimized = false;
          } else {
            minimized = v.value.includes("--minimized");
          }

          resolve();
        }
      );
    });
  }

  return {
    enabled,
    minimized,
  };
};

const setStartupSettings = async (opts) => {
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
        {
          Hyalus: "app.hyalus",
          HyalusDev: "app.hyalus.dev",
        }[pkg.name],
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
  app.relaunch({
    args: [`--resume=${mainWindow.webContents.getURL()}`],
  });
  app.quit();
};

const start = async () => {
  if (running) {
    return;
  }

  running = true;

  if (pkg.name === "Hyalus") {
    app.setAppUserModelId("app.hyalus");

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
  }

  if (pkg.name === "HyalusDev") {
    app.setAppUserModelId("app.hyalus.dev");
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
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
      experimentalFeatures: true,
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
      mainWindow.hide();
    }
  });

  mainWindow.on("ready-to-show", () => {
    if (
      app.getLoginItemSettings().wasOpenedAsHidden ||
      process.argv.indexOf("--minimized") !== -1
    ) {
      return;
    }

    mainWindow.show();
  });

  mainWindow.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") {
      return;
    }

    if (input.key === "F12") {
      mainWindow.webContents.openDevTools();
    }

    if (input.key === "F5") {
      mainWindow.reload();
    }

    if (input.key === "F6") {
      restart();
    }
  });

  mainWindow.webContents.on("did-fail-load", () => {
    mainWindow.loadFile(path.join(__dirname, "error.html"));
  });

  mainWindow.removeMenu();
};

app.on("ready", () => {
  tray = new Tray(path.join(__dirname, "../build/icon.png"));

  tray.setToolTip(`${pkg.name} ${pkg.version}`);

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open",
        click() {
          mainWindow.show();
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
    mainWindow.show();
  });

  autoUpdater.checkForUpdates();

  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 1000 * 60 * 60);
});

app.on("second-instance", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.on("web-contents-created", (e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
  });

  contents.on("will-navigate", (e, url) => {
    const parsedURL = new URL(url);

    if (
      [
        "https://hyalus.app",
        "https://dev.hyalus.app", // dev server
      ].indexOf(parsedURL.origin) === -1
    ) {
      e.preventDefault();
    }
  });
});

autoUpdater.on("update-downloaded", () => {
  if (!running) {
    autoUpdater.quitAndInstall(true, true);
  } else {
    //TODO: notify renderer process via IPC of update.
  }
});

autoUpdater.on("update-not-available", start);
autoUpdater.on("error", start);

ipcMain.handle("close", () => {
  mainWindow.close();
});

ipcMain.handle("maximize", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle("minimize", () => {
  mainWindow.minimize();
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
