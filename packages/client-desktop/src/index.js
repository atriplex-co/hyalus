const {
  app,
  BrowserWindow,
  nativeTheme,
  Tray,
  Menu,
  ipcMain,
  shell,
  desktopCapturer,
} = require("electron");
const path = require("path");
const os = require("os");
const { autoUpdater } = require("electron-updater");
const { version } = require("../package.json");
const fs = require("fs");
const pkg = require("../package.json");

let tray;
let mainWindow;
let quitting;
let running;

app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer"); // DO NOT FUCKING TOUCH THIS!

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

nativeTheme.themeSource = "dark";

const start = () => {
  if (running) {
    return;
  }

  running = true;

  if (pkg.name === "Hyalus") {
    app.setAppUserModelId("app.hyalus");

    const initPath = path.join(app.getPath("userData"), "init");
    if (!fs.existsSync(initPath)) {
      fs.writeFileSync(initPath, ""); // so this only runs on the first start.

      try {
        app.setLoginItemSettings({
          openAtLogin: true,
          openAsHidden: true,
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
    },
  });

  if (pkg.name === "Hyalus") {
    mainWindow.loadURL("https://hyalus.app/app");
  }

  if (pkg.name === "HyalusDev") {
    mainWindow.loadURL("https://dev.hyalus.app/app");
  }

  mainWindow.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("ready-to-show", () => {
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
      quitting = true;
      app.relaunch();
      app.quit();
    }
  });

  mainWindow.webContents.on("did-fail-load", () => {
    mainWindow.loadFile(path.join(__dirname, "error.html"));
  });

  mainWindow.removeMenu();
};

const restart = () => {
  quitting = true;
  app.releaseSingleInstanceLock();
  app.relaunch();
  app.quit();
};

app.on("ready", () => {
  tray = new Tray(path.join(__dirname, "../build/icon.png"));

  tray.setToolTip(`Hyalus ${version}`);

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

app.on("web-contents-created", (e, webContents) => {
  webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
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

ipcMain.handle("getOpenAtLogin", () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle("setOpenAtLogin", (e, val) => {
  app.setLoginItemSettings({
    openAtLogin: val,
  });
});

ipcMain.handle("getWasOpenedAtLogin", () => {
  return app.getLoginItemSettings().wasOpenedAtLogin;
});
