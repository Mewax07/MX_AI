const express = require("express");
const WebSocket = require("ws");
const { google } = require("googleapis");
const { Ollama } = require("./ollama/ollama");

class Server {
    constructor() {
        this.expressApp = express();
        this.server = require("http").createServer(this.expressApp);
        this.wss = new WebSocket.Server({ server: this.server });
        this.setupWebSocket();
    }

    init(oauth2Client, port) {
        this.oauth2Client = oauth2Client;
        this.port = port;
        this.initRoutes();
        this.startServer();
        this.ollama = new Ollama(this.wss);
        this.ollama.init();
    }

    setupWebSocket() {
        this.wss.on("connection", (ws) => {
            console.log("Client connected");

            ws.on("message", async (message) => {
                const data = JSON.parse(message);
                try {
                    switch (data.type) {
                        case "listDrafts":
                            const drafts = await this.listDrafts();
                            ws.send(
                                JSON.stringify({
                                    type: "drafts",
                                    data: drafts,
                                }),
                            );
                            break;
                        case "getDraft":
                            const draft = await this.getDraft(data.draftId);
                            ws.send(
                                JSON.stringify({ type: "draft", data: draft }),
                            );
                            break;
                        case "listMessages":
                            const messages = await this.listMessages();
                            ws.send(
                                JSON.stringify({
                                    type: "messages",
                                    data: messages,
                                }),
                            );
                            break;
                        case "sendEmail":
                            const result = await this.sendEmail(data.emailData);
                            ws.send(
                                JSON.stringify({
                                    type: "result",
                                    data: result,
                                }),
                            );
                            break;
                        case "getMessage":
                            const messageData = await this.getMessage(
                                data.messageId,
                            );
                            ws.send(
                                JSON.stringify({
                                    type: "message",
                                    data: messageData,
                                }),
                            );
                            break;
                        case "searchMessages":
                            const searchResults = await this.searchMessages(
                                data.query,
                            );
                            ws.send(
                                JSON.stringify({
                                    type: "searchResults",
                                    data: searchResults,
                                }),
                            );
                            break;
                        case "listModels":
                            const models = this.ollama.models;
                            ws.send(
                                JSON.stringify({
                                    type: "models",
                                    data: models,
                                }),
                            );
                            break;
                        case "listTemplates":
                            const templates = this.ollama.templates;
                            ws.send(
                                JSON.stringify({
                                    type: "templates",
                                    data: templates,
                                }),
                            );
                            break;
                        case "listTools":
                            const tools = this.ollama.tools;
                            ws.send(
                                JSON.stringify({ type: "tools", data: tools }),
                            );
                            break;
                        case "listPrompts":
                            const prompts = this.ollama.prompts;
                            ws.send(
                                JSON.stringify({
                                    type: "prompts",
                                    data: prompts,
                                }),
                            );
                            break;
                        case "listConversations":
                            const conversations =
                                await this.ollama.listConversations();
                            ws.send(
                                JSON.stringify({
                                    type: "conversations",
                                    data: conversations,
                                }),
                            );
                            break;
                        case "createConversation":
                            await this.ollama.createConversation(
                                data.chatId,
                                data.initialMessage,
                            );
                            ws.send(
                                JSON.stringify({
                                    type: "conversationCreated",
                                    data: { chatId: data.chatId },
                                }),
                            );
                            break;
                        case "loadConversation":
                            await this.ollama.loadConversation(data.chatId);
                            ws.send(
                                JSON.stringify({
                                    type: "conversationLoaded",
                                    data: { chatId: data.chatId },
                                }),
                            );
                            break;
                        case "sendMessage":
                            const response =
                                await this.ollama.addMessageToConversation(
                                    data.chatId,
                                    "user",
                                    data.message,
                                    data.tools || [],
                                );
                            ws.send(
                                JSON.stringify({
                                    type: "messageResponse",
                                    data: response,
                                }),
                            );
                            break;
                        default:
                            ws.send(
                                JSON.stringify({
                                    type: "error",
                                    message: "Unknown message type",
                                }),
                            );
                    }
                } catch (error) {
                    console.error("Error:", error);
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            message: error.message,
                        }),
                    );
                }
            });

            ws.on("close", () => {
                console.log("Client disconnected");
            });
        });
    }

    async listDrafts() {
        const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
        const response = await gmail.users.drafts.list({ userId: "me" });
        return response.data;
    }

    async sendDraft(draftId) {
        const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
        await gmail.users.drafts.send({ userId: "me", draftId });
        return { success: true, message: "Draft sent successfully" };
    }

    async listMessages() {
        const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
        const response = await gmail.users.messages.list({
            userId: "me",
            maxResults: 10,
        });
        return response.data;
    }

    async sendEmail(emailData) {
        const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
        const raw = this.makeRawEmail(
            emailData.to,
            emailData.subject,
            emailData.message,
        );
        const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: raw,
            },
        });
        return response.data;
    }

    makeRawEmail(to, subject, message) {
        const email = [
            `To: ${to}`,
            `Subject: ${subject}`,
            "MIME-Version: 1.0",
            "Content-Type: text/plain; charset=utf-8",
            "Content-Transfer-Encoding: 7bit",
            "",
            message,
        ].join("\n");

        return Buffer.from(email)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    }

    async getMessage(messageId) {
        const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
        const response = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
        });
        return response.data;
    }

    async searchMessages(query) {
        const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
        const response = await gmail.users.messages.list({
            userId: "me",
            q: query,
        });
        return response.data;
    }

    initRoutes() {
        this.expressApp.get("/oauth2callback", async (req, res) => {
            const code = req.query.code;
            if (!code) return res.send("Pas de code reçu.");

            try {
                const { tokens } = await this.oauth2Client.getToken(code);
                this.oauth2Client.setCredentials(tokens);
                console.log("Token obtenu:", tokens);
                res.send(
                    "Authentification réussie! Tu peux fermer cette fenêtre.",
                );
            } catch (err) {
                console.error("Erreur token:", err);
                res.send("Erreur.");
            }
        });
    }

    startServer() {
        this.server.listen(this.port, () => {
            console.log(`Serveur démarré sur le port ${this.port}`);
        });
    }
}

module.exports = { Server };
