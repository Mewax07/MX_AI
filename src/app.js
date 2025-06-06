const { app, ipcMain, nativeTheme, globalShortcut } = require("electron");
const { autoUpdater } = require("electron-updater");

const Store = require("electron-store");

const store = new Store();

const { google } = require("googleapis");
require("dotenv").config();

const UpdateWindow = require("./windows/UpdateWindow.js");
const MainWindow = require("./windows/MainWindow.js");
const AuthWindow = require("./windows/AuthWindow.js");

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    `http://localhost:${process.env.PORT || 65440}/oauth2callback`,
);

const serverClass = require("./server/server.js");
const server = new serverClass.Server();
server.init(oauth2Client, process.env.PORT || 65440);

const creditClass = require("./server/credit.js");
const credit = new creditClass.Credit(store, oauth2Client);

const mainWindow = new MainWindow();
const authWindow = new AuthWindow(oauth2Client);

let dev = process.env.NODE_ENV === "dev";

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.whenReady().then(async () => {
        const client = await credit.authorize();
        if (client) {
            oauth2Client.setCredentials(client.credentials);
        }

        if (dev) {
            processApp();
        } else {
            UpdateWindow.createWindow();
        }
    });
}

function processApp() {
    const tokens = credit.loadTokens();
    if (tokens) {
        oauth2Client.setCredentials(tokens);
        mainWindow.createWindow("src/render/index.html", true);
    } else {
        authWindow.createWindow();
    }
}

oauth2Client.on("tokens", (tokens) => {
    credit.saveTokens(tokens);
    oauth2Client.setCredentials(tokens);
    mainWindow.createWindow("src/render/index.html", true);
});

ipcMain.on("main-window-open", () => {
    processApp();
});

ipcMain.on("auth-window-open", () => {
    authWindow.createWindow();
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
