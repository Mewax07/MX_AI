class Credit {
    constructor(
        store,
        /** @type {import('googleapis').Auth.OAuth2Client} */ oauth2Client,
    ) {
        this.store = store;
        this.oauth2Client = oauth2Client;
    }

    saveTokens(tokens) {
        this.store.set("tokens", tokens);
    }

    loadTokens() {
        return this.store.get("tokens");
    }

    async authorize() {
        let tokens = this.loadTokens();
        if (tokens) {
            this.oauth2Client.setCredentials(tokens);
            return this.oauth2Client;
        }

        const client = await this.authenticate();
        if (client.credentials) {
            this.saveTokens(client.credentials);
            this.oauth2Client.setCredentials(client.credentials);
        }
        return this.oauth2Client;
    }

    refreshAccessToken() {
        const tokens = this.loadTokens();
        if (tokens && tokens.refresh_token) {
            this.oauth2Client.setCredentials(tokens);
            this.oauth2Client.refreshAccessToken(async (err, newTokens) => {
                if (err) {
                    console.error("Error refreshing access token:", err);
                    return;
                }
                this.oauth2Client.setCredentials(newTokens);
                this.saveTokens(newTokens);
                console.log("Access token refreshed:", newTokens);
            });
        }
    }
}

module.exports = {
    Credit,
};
