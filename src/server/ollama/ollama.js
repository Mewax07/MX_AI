const path = require("path");
const fs = require("fs");

const pkg = require("../../../package.json");
const { ConversationSummaryBufferMemory } = require("langchain/memory");
const { ConversationChain } = require("langchain/chains");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const {
    CheerioWebBaseLoader,
} = require("@langchain/community/document_loaders/web/cheerio");
const { ChatOllama, OllamaEmbeddings } = require("@langchain/ollama");
const {
    createStuffDocumentsChain,
} = require("langchain/chains/combine_documents");
const { createRetrievalChain } = require("langchain/chains/retrieval");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");

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

class Ollama {
    constructor(websocket) {
        this.models = [];
        this.templates = [];
        this.tools = [];
        this.prompts = [];
        this.websocket = websocket;
        this.conversations = {};
        this.isBusy = false;
    }

    getDirectories() {
        return {
            appData,
            rootDir,
            workspaceDir,
            conversationsDir,
        };
    }

    init() {
        this.initModels();
        this.initTemplates();
        this.initTools();
        this.initPrompts();
    }

    initModels() {
        const modelsDir = path.join(rootDir, "models");
        if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir);

        const modelFiles = fs.readdirSync(modelsDir);
        this.models = modelFiles.map((file) => {
            const filePath = path.join(modelsDir, file);
            const fileData = fs.readFileSync(filePath, "utf8");
            return JSON.parse(fileData);
        });
    }

    initTemplates() {
        const templatesDir = path.join(rootDir, "templates");
        if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir);

        const templateFiles = fs.readdirSync(templatesDir);
        this.templates = templateFiles.map((file) => {
            const filePath = path.join(templatesDir, file);
            const fileData = fs.readFileSync(filePath, "utf8");
            return JSON.parse(fileData);
        });
    }

    initTools() {
        this.tools = [
            {
                name: "search",
                description:
                    "A useful tool for when you need to answer questions about current events. You should ask targeted questions.",
                prompt: `
Répondre à l'utilisateur en utilisant le contexte fourni si nécessaire.
Si le contexte ne correspond pas à la question, ignore le contexte.
Terminer la réponse par une liste des sources utilisées.

Context: {context}
Question: {input}

Réponse:
`,
            },
        ];
    }

    initPrompts() {
        this.prompts.push({
            name: "mistral",
            system: "You are a helpful assistant. You are given the following extracted parts of a long document and a question. Provide a conversational answer based on the context provided.",
            user: "Context:\n{{context}}\n\nQuestion:\n{{question}}\n\nAnswer:",
        });
    }

    async listConversations() {
        try {
            const files = fs.readdirSync(conversationsDir);
            return files.map((file) => {
                const filePath = path.join(conversationsDir, file);
                const fileData = fs.readFileSync(filePath, "utf8");
                return JSON.parse(fileData);
            });
        } catch (error) {
            console.error(
                "Erreur lors de la lecture des conversations:",
                error,
            );
            return [];
        }
    }

    async createConversation(chatId, initialMessage) {
        const filePath = path.join(conversationsDir, `${chatId}.json`);
        const conversationData = {
            id: chatId,
            title: initialMessage,
            content: [],
            llm: "gemma2:2b",
        };

        fs.writeFileSync(filePath, JSON.stringify(conversationData, null, 2));
        this.conversations[chatId] = {
            llm: new ChatOllama({
                model: conversationData.llm,
            }),
        };
    }

    async readConversation(chatId) {
        console.log("ChatId:", chatId);
        const filePath = path.join(conversationsDir, `${chatId}.json`);
        if (!fs.existsSync(filePath)) {
            throw new Error("Conversation non trouvée");
        }

        const fileData = fs.readFileSync(filePath, "utf8");
        const conversationData = JSON.parse(fileData);

        return conversationData;
    }

    async loadConversation(chatId) {
        const filePath = path.join(conversationsDir, `${chatId}.json`);
        if (!fs.existsSync(filePath)) {
            throw new Error("Conversation non trouvée");
        }

        const fileData = fs.readFileSync(filePath, "utf8");
        const conversationData = JSON.parse(fileData);

        const memory = new ConversationSummaryBufferMemory({
            llm: new ChatOllama({ model: conversationData.llm }),
            returnMessages: true,
        });

        const conversationChain = new ConversationChain({
            llm: new ChatOllama({ model: conversationData.llm }),
            memory: memory,
        });

        for (const msg of conversationData.content) {
            if (msg.role === "user") {
                await memory.chatHistory.addUserMessage(msg.content);
            } else if (msg.role === "assistant") {
                await memory.chatHistory.addAIMessage(msg.content);
            }
        }

        this.conversations[chatId] = {
            chain: conversationChain,
            data: conversationData,
        };

        return conversationChain;
    }

    async addMessageToConversation(chatId, role, content, activedTools = []) {
        if (this.isBusy) {
            throw new Error(
                "L'IA est occupée. Veuillez attendre la fin de la réponse actuelle.",
            );
        }

        const filePath = path.join(conversationsDir, `${chatId}.json`);
        if (!fs.existsSync(filePath)) {
            throw new Error("Conversation non trouvée");
        }

        this.isBusy = true;

        try {
            const fileData = fs.readFileSync(filePath, "utf8");
            const conversationData = JSON.parse(fileData);

            conversationData.content.push({
                role,
                content,
                timestamp: new Date().toISOString(),
            });

            const llm = new ChatOllama({ model: conversationData.llm });

            const memory = new ConversationSummaryBufferMemory({
                llm,
                returnMessages: true,
            });

            if (activedTools.length > 0) {
                const searchTool = this.tools.find((t) =>
                    activedTools.includes(t.name),
                );

                if (searchTool) {
                    const prompt = ChatPromptTemplate.fromTemplate(
                        searchTool.prompt,
                    );

                    const chain = await createStuffDocumentsChain({
                        prompt,
                        llm,
                        documents: [],
                        documentPrompt: ChatPromptTemplate.fromTemplate(
                            `Context: {page_content}\nSource: {source}`,
                        ),
                    });

                    const googleUrl = "https://www.google.com/search?q=";

                    function extractDomain(url) {
                        try {
                            return new URL(url).hostname;
                        } catch (error) {
                            console.error("Error extracting domain:", error);
                            return "unknown domain";
                        }
                    }

                    const splitter = new RecursiveCharacterTextSplitter({
                        chunkSize: 300,
                        chunkOverlap: 50,
                    });

                    const ollamaEmbeddings = new OllamaEmbeddings({
                        model: "gemma2:2b",
                    });

                    async function performSearchAndRetrival(userMessage) {
                        const searchTerm = userMessage
                            .toLowerCase()
                            .replace(/[?.,!]/g, "")
                            .replace(/\s+/g, "+");
                        const urls = [googleUrl + searchTerm];

                        const loaders = urls.map(
                            (url) => new CheerioWebBaseLoader(url),
                        );
                        const docsArray = await Promise.all(
                            loaders.map((loader) => loader.load()),
                        );
                        const docs = docsArray.flat();
                        const splittedDocs =
                            await splitter.splitDocuments(docs);

                        const vectorStore =
                            await MemoryVectorStore.fromDocuments(
                                splittedDocs,
                                ollamaEmbeddings,
                            );
                        const retriever = vectorStore.asRetriever({
                            k: 5,
                            callbacks: [
                                {
                                    async handleRetrieverStart() {
                                        console.log("Searching...");
                                    },
                                    async handleRetrieverEnd(documents) {
                                        console.log(
                                            "\n=== Chunks séléctionnés ===\n",
                                        );
                                        documents.forEach((doc, index) => {
                                            console.log(`Chunk ${index + 1}:`);
                                            console.log(
                                                `Source: ${doc.metadata.source}`,
                                            );
                                            console.log(
                                                `Source Domain: ${extractDomain(doc.metadata.source)}`,
                                            );
                                            console.log(
                                                `Content: ${doc.pageContent}\n`,
                                            );
                                        });
                                    },
                                },
                            ],
                        });

                        const retrievalChain = await createRetrievalChain({
                            combineDocsChain: chain,
                            retriever,
                            callbacks: [
                                {
                                    async handleRetrievalStart() {
                                        console.log("Retrieving...");
                                    },
                                    async handleRetrievalEnd(outputs) {
                                        console.log(
                                            "\n=== Sources récupérées ===\n",
                                        );
                                        const usedDocs = outputs.context.map(
                                            (doc) => ({
                                                content:
                                                    doc.pageContent.slice(
                                                        0,
                                                        150,
                                                    ) + "...",
                                                source: extractDomain(
                                                    doc.metadata.source ||
                                                        "Source inconnue",
                                                ),
                                            }),
                                        );
                                        console.log(
                                            JSON.stringify(usedDocs, null, 4),
                                        );
                                    },
                                },
                            ],
                        });

                        return retrievalChain.invoke({
                            input: userMessage,
                        });
                    }

                    const response = await performSearchAndRetrival(content);
                    const parsedResponse = {
                        answer: response.answer,
                        context: response.context,
                        input: response?.input || "no input provided",
                    };

                    conversationData.content.push({
                        role: "assistant",
                        content: parsedResponse,
                        timestamp: new Date().toISOString(),
                    });

                    fs.writeFileSync(
                        filePath,
                        JSON.stringify(conversationData, null, 4),
                    );

                    return parsedResponse;
                } else {
                    const chain = new ConversationChain({
                        llm: new ChatOllama({ model: conversationData.llm }),
                        memory: memory,
                    });

                    for (const msg of conversationData.content) {
                        if (msg.role === "user") {
                            await memory.chatHistory.addUserMessage(
                                msg.content,
                            );
                        } else if (msg.role === "assistant") {
                            await memory.chatHistory.addAIMessage(msg.content);
                        }
                    }

                    const response = await chain.call({ input: content });

                    conversationData.content.push({
                        role: "assistant",
                        content: response.response,
                        timestamp: new Date().toISOString(),
                    });

                    fs.writeFileSync(
                        filePath,
                        JSON.stringify(conversationData, null, 4),
                    );

                    return response.response;
                }
            } else {
                const chain = new ConversationChain({
                    llm: new ChatOllama({ model: conversationData.llm }),
                    memory: memory,
                });

                for (const msg of conversationData.content) {
                    if (msg.role === "user") {
                        await memory.chatHistory.addUserMessage(msg.content);
                    } else if (msg.role === "assistant") {
                        await memory.chatHistory.addAIMessage(msg.content);
                    }
                }

                const response = await chain.call({ input: content });

                conversationData.content.push({
                    role: "assistant",
                    content: response.response,
                    timestamp: new Date().toISOString(),
                });

                fs.writeFileSync(
                    filePath,
                    JSON.stringify(conversationData, null, 4),
                );

                return response.response;
            }
        } finally {
            this.isBusy = false;
        }
    }
}

module.exports = { Ollama };
