const { app, BrowserWindow, Menu } = require("electron");

/** @type {BrowserWindow|null|undefined} */
let updateWindow;

function getWindow() {
    return updateWindow;
}

function destroyWindow() {
    if (updateWindow) {
        updateWindow.destroy();
        updateWindow = null;
    }
}

function createWindow() {
    destroyWindow();

    updateWindow = new BrowserWindow({
        width: 400,
        height: 500,
        title: "Updater",
        resizable: false,
        frame: false,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    Menu.setApplicationMenu(null);
    updateWindow.setMenuBarVisibility(false);
    updateWindow.loadFile("src/render/update.html");
    updateWindow.once("ready-to-show", () => {
        if (updateWindow) {
            updateWindow.webContents.openDevTools({ mode: "detach" });
            updateWindow.show();
        }
    });
}

module.exports = {
    createWindow,
    getWindow,
    destroyWindow,
};
