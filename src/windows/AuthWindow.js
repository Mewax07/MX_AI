const { BrowserWindow } = require("electron");

const scopes = [
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.readonly",
];

class AuthWindow {
    constructor(oauth2Client) {
        this.authWindow = null;
        this.oauth2Client = oauth2Client;
    }

    createWindow() {
        this.authWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
        });

        const url = this.oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: scopes,
        });

        this.authWindow.webContents.on("will-redirect", (event, newUrl) => {
            const url = new URL(newUrl);
            const code = url.searchParams.get("code");

            if (code) {
                this.oauth2Client.getToken(code, (err, tokens) => {
                    if (err) {
                        console.error(
                            "Erreur lors de l'obtention du token:",
                            err,
                        );
                        return;
                    }
                    this.oauth2Client.setCredentials(tokens);
                    this.authWindow.close();
                });
            }
        });

        this.oauth2Client.on("tokens", (_tokens) => {
            // this.authWindow.close();
        });

        this.authWindow.loadURL(url);
        this.authWindow.show();
    }
}

module.exports = AuthWindow;
