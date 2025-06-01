const { app, ipcMain, nativeTheme, globalShortcut } = require("electron");
const { autoUpdater } = require("electron-updater");

const UpdateWindow = require("./windows/UpdateWindow.js");
const MainWindow = require("./windows/MainWindow.js");

const mainWindow = new MainWindow();

let dev = process.env.NODE_ENV === "dev";

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.whenReady().then(() => {
        if (dev) {
            mainWindow.createWindow("src/render/index.html", true);
        } else {
            UpdateWindow.createWindow();
        }
    });
}

ipcMain.on("main-window-open", () => {
    mainWindow.createWindow("src/render/index.html", true);
});

ipcMain.on("update-window-close", () => UpdateWindow.destroyWindow());
ipcMain.on("update-window-dev-tools", () =>
    UpdateWindow.getWindow().webContents.openDevTools({ mode: "detach" }),
);
ipcMain.on("update-window-progress", (event, options) =>
    UpdateWindow.getWindow().setProgressBar(options.progress / options.size),
);
ipcMain.on("update-window-progress-reset", () =>
    UpdateWindow.getWindow().setProgressBar(-1),
);
ipcMain.on("update-window-progress-load", () =>
    UpdateWindow.getWindow().setProgressBar(2),
);

ipcMain.handle("is-dark-theme", (_, theme) => {
    if (theme === "dark") return true;
    if (theme === "light") return false;

    return nativeTheme.shouldUseDarkColors;
});

app.on("window-all-closed", () => app.quit());

app.on("will-quit", () => {
    globalShortcut.unregisterAll();
});

autoUpdater.autoDownload = false;
autoUpdater.forceDevUpdateConfig = true;

ipcMain.handle("update-app", async () => {
    return await new Promise(async (resolve, reject) => {
        autoUpdater
            .checkForUpdates()
            .then((res) => {
                resolve(res);
            })
            .catch((error) => {
                reject({
                    error: true,
                    message: error,
                });
            });
    });
});

autoUpdater.on("update-available", () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send("updateAvailable");
});

ipcMain.on("start-update", () => {
    autoUpdater.downloadUpdate();
});

autoUpdater.on("update-not-available", () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send("update-not-available");
});

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on("download-progress", (progress) => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow)
        updateWindow.webContents.send("download-progress", progress);
});

autoUpdater.on("error", (err) => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send("error", err);
});
