const { BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");

const pkg = require("../../package.json");

const appDataRoaming =
    process.env.APPDATA ||
    (process.platform == "darwin"
        ? process.env.HOME + "/Library/Preferences"
        : process.env.HOME + "/.local/share");
const appData = path.join(appDataRoaming, pkg.name);

if (!fs.existsSync(appData)) fs.mkdirSync(appData);

const rootDir = path.join(appData, "root");
const workspaceDir = path.join(rootDir, "workspace");
const conversationsDir = path.join(rootDir, "conversations");

if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir);
if (!fs.existsSync(workspaceDir)) fs.mkdirSync(workspaceDir);
if (!fs.existsSync(conversationsDir)) fs.mkdirSync(conversationsDir);

let resizeTimeout;
let moveTimeout;
const delay = 500;

let isWritingConfig = false;
const configPath = path.join(rootDir, "config.json");

class ErrorHandler {
    constructor() {
        this.errorStacks = [];
    }

    makeError(errorIn, errorCarch, codeID) {
        const errorDetails = {
            errorID: codeID,
            errorMessage: errorCarch.message,
            stackTrace: errorCarch.stack,
            timestamp: new Date().toISOString(),
        };

        console.error(`Error.ID: ${errorIn} (${codeID})`, errorDetails);

        this.errorStacks.push(errorDetails);
    }

    getErrorStacks() {
        return this.errorStacks;
    }

    clearErrorStacks() {
        this.errorStacks = [];
    }
}

class Settings {
    constructor() {
        this.settings = {
            window: {
                x: 0,
                y: 0,
                width: 1280,
                height: 720,
                maximized: false,
                fullscreen: false,
                resizable: true,
            },
        };
        this.error = new ErrorHandler();
    }

    async loadConfig() {
        try {
            await this.ensureConfigExists();
            const data = await fs.promises.readFile(configPath, "utf-8");
            if (data.trim()) {
                this.settings = JSON.parse(data);
            } else {
                await this.saveConfig(this.settings);
            }
        } catch (error) {
            if (error.code === "ENOENT") {
                await this.saveConfig(this.settings);
            } else {
                this.error.makeError("loadConfig", error, "ERR_LOAD_CONFIG");
            }
        }
    }

    async saveConfig(config) {
        if (isWritingConfig) {
            return;
        }

        isWritingConfig = true;
        try {
            const data = JSON.stringify(config, null, 4);
            await fs.promises.writeFile(configPath, data);
        } catch (error) {
            this.error.makeError("saveConfig", error, "ERR_SAVE_CONFIG");
        } finally {
            isWritingConfig = false;
        }
    }

    async ensureConfigExists() {
        if (!fs.existsSync(configPath)) {
            await fs.promises.writeFile(configPath, "{}", "utf-8");
        }
    }

    getWindowSize() {
        return this.settings.window;
    }

    setWindowSize(width, height) {
        this.settings.window.width = width;
        this.settings.window.height = height;
        this.saveConfig(this.settings);
    }

    getWindowPosition() {
        return { x: this.settings.window.x, y: this.settings.window.y };
    }

    setWindowPosition(x, y) {
        this.settings.window.x = x;
        this.settings.window.y = y;
        this.saveConfig(this.settings);
    }

    isWindowMaximized() {
        return this.settings.window.maximized;
    }

    setWindowMaximized(maximized) {
        this.settings.window.maximized = maximized;
        this.saveConfig(this.settings);
    }

    isWindowFullscreen() {
        return this.settings.window.fullscreen;
    }

    setWindowFullscreen(fullscreen) {
        this.settings.window.fullscreen = fullscreen;
        this.saveConfig(this.settings);
    }

    isWindowResizable() {
        return this.settings.window.resizable;
    }

    setWindowResizable(resizable) {
        this.settings.window.resizable = resizable;
        this.saveConfig(this.settings);
    }

    getWindow() {
        return this.window;
    }
}

class MainWindow {
    constructor() {
        this.settings = new Settings();
        this.window = null;
    }

    async createWindow(webPage, debug) {
        await this.settings.loadConfig();

        if (this.window && !this.window.isDestroyed()) {
            this.window.show();
            this.window.focus();
            return;
        }

        const { width, height } = this.settings.getWindowSize();
        const { x, y } = this.settings.getWindowPosition();
        const isMaximized = this.settings.isWindowMaximized();
        const isFullscreen = this.settings.isWindowFullscreen();
        const isResizable = this.settings.isWindowResizable();

        this.window = new BrowserWindow({
            width: width,
            height: height,
            x: x,
            y: y,
            fullscreen: isFullscreen,
            resizable: isResizable,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
            autoHideMenuBar: true, // Hide the menu bar
            titleBarStyle: "hiddenInset", // Hide the title bar
            title: `${pkg.name} - ${pkg.version}`,
            frame: false,
            minWidth: 1280,
            minHeight: 720,
        });

        if (isMaximized) {
            this.window.maximize();
        }

        webPage !== null ? this.window.loadFile(webPage) : "";

        this.window.on("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.settings.setWindowSize(
                    this.window.getSize()[0],
                    this.window.getSize()[1],
                );
            }, delay);
        });

        this.window.on("move", () => {
            clearTimeout(moveTimeout);
            moveTimeout = setTimeout(() => {
                this.settings.setWindowPosition(
                    this.window.getPosition()[0],
                    this.window.getPosition()[1],
                );
            }, delay);
        });

        this.window.on("maximize", () => {
            this.settings.setWindowMaximized(true);
        });

        this.window.on("unmaximize", () => {
            this.settings.setWindowMaximized(false);
        });

        this.window.on("close", (event) => {
            if (debug) {
                this.window.webContents.openDevTools();
            } else {
                this.window.webContents.closeDevTools();
            }
            event.preventDefault();
            this.window.hide();
        });

        this.window.on("closed", () => {
            this.window = null;
        });

        ipcMain.on("close-window", () => this.window.close());
        ipcMain.on("maximize-window", this.toggleMaximize.bind(this));
        ipcMain.on("minimize-window", () => this.window.minimize());

        ipcMain.handle("is-maximized", () => this.window.isMaximized());

        globalShortcut.register("Alt+CommandOrControl+Space", () => {
            if (this.window) {
                this.window.show();
                this.window.focus();
            }
        });
    }

    toggleMaximize() {
        if (this.window.isMaximized()) {
            this.window.unmaximize();
        } else {
            this.window.maximize();
        }
    }
}

module.exports = MainWindow;
