const pkg = require("../../package.json");
const { ipcRenderer } = require("electron");
const Store = require("electron-store");
const store = new Store();
const WebSocket = require("ws");

/**
 * Html Class is a utility for creating and manipulating DOM elements
 * with improved efficiency and simplicity.
 */
class Html {
    /**
     * The underlying DOM element.
     * @type {HTMLElement}
     */
    elm;

    /**
     * Creates an instance of Html wrapping an existing element or a new one.
     * @param {HTMLElement|string|Html} [elm="div"] - An existing DOM element, a tag name string to create,
     *   or another Html instance to wrap.
     */
    constructor(elm = "div") {
        if (elm instanceof Html) {
            this.elm = elm.elm;
        } else if (elm instanceof HTMLElement) {
            this.elm = elm;
        } else {
            this.elm = document.createElement(elm);
        }
    }

    /**
     * Set the text content of the element.
     * @param {string} val - The text to set as innerText.
     * @returns {Html} The current Html instance.
     */
    text(val) {
        this.elm.innerText = val;
        return this;
    }

    /**
     * Set the inner HTML of the element.
     * @param {string} val - The HTML string to set as innerHTML.
     * @returns {Html} The current Html instance.
     */
    html(val) {
        this.elm.innerHTML = val;
        return this;
    }

    /**
     * Replace the outer text of the element.
     * @param {string} val - The text to set as outerText.
     * @returns {Html} The current Html instance.
     */
    outerText(val) {
        this.elm.outerText = val;
        return this;
    }

    /**
     * Replace the outer HTML of the element.
     * @param {string} val - The HTML string to set as outerHTML.
     * @returns {Html} The current Html instance.
     */
    outerHtml(val) {
        this.elm.outerHTML = val;
        return this;
    }

    /**
     * Removes all child nodes by clearing innerHTML.
     * @returns {Html} The current Html instance.
     */
    clear() {
        this.elm.innerHTML = "";
        return this;
    }

    /**
     * Remove the element from the DOM.
     * @returns {Html} The current Html instance.
     */
    cleanup() {
        this.elm.remove();
        return this;
    }

    /**
     * Query a single descendant using a CSS selector.
     * @param {string} selector - A CSS selector string.
     * @returns {HTMLElement|null} The matching DOM element or null.
     */
    query(selector) {
        return this.elm.querySelector(selector);
    }

    /**
     * Query a single descendant and return wrapped Html.
     * @param {string} selector - A CSS selector string.
     * @returns {Html|null} A new Html instance wrapping the found element, or null if none.
     */
    qs(selector) {
        const found = this.elm.querySelector(selector);
        return found ? new Html(found) : null;
    }

    /**
     * Query multiple descendants and return wrapped Html instances.
     * @param {string} selector - A CSS selector string.
     * @returns {Html[]|null} Array of Html instances, or null if none found.
     */
    qsa(selector) {
        const list = this.elm.querySelectorAll(selector);
        return list.length ? Array.from(list).map((e) => new Html(e)) : null;
    }

    /**
     * Set the element's id attribute.
     * @param {string} val - The id value to assign.
     * @returns {Html} The current Html instance.
     */
    id(val) {
        this.elm.id = val;
        return this;
    }

    /**
     * Set a data-* attribute on the element.
     * @param {{key:string,obj:string}} data - An object with `key` and `obj` to set `dataset[key]=obj`.
     * @returns {Html} The current Html instance.
     */
    dataset(data) {
        this.elm.dataset[data.key] = data.obj;
        return this;
    }

    /**
     * Toggle one or more CSS classes on the element.
     * @param {...string} classes - One or more class names to toggle.
     * @returns {Html} The current Html instance.
     */
    class(...classes) {
        classes.forEach((c) => this.elm.classList.toggle(c));
        return this;
    }

    /**
     * Add one or more CSS classes to the element.
     * @param {...string} classes - One or more class names to add.
     * @returns {Html} The current Html instance.
     */
    classOn(...classes) {
        classes.forEach((c) => this.elm.classList.add(c));
        return this;
    }

    /**
     * Remove one or more CSS classes from the element.
     * @param {...string} classes - One or more class names to remove.
     * @returns {Html} The current Html instance.
     */
    classOff(...classes) {
        classes.forEach((c) => this.elm.classList.remove(c));
        return this;
    }

    /**
     * Apply CSS properties using setProperty.
     * @param {Object.<string,string>} styles - An object of CSS property names and values.
     * @returns {Html} The current Html instance.
     */
    style(styles) {
        Object.keys(styles).forEach((key) =>
            this.elm.style.setProperty(key, styles[key]),
        );
        return this;
    }

    /**
     * Apply CSS properties via the style object (JS property names).
     * @param {Object.<string,string>} styles - An object of style properties and values.
     * @returns {Html} The current Html instance.
     */
    styleJs(styles) {
        Object.keys(styles).forEach((key) => {
            this.elm.style[key] = styles[key];
        });
        return this;
    }

    /**
     * Add an event listener to the element.
     * @param {string} ev - Event name.
     * @param {Function} cb - Event handler callback.
     * @returns {Html} The current Html instance.
     */
    on(ev, cb) {
        this.elm.addEventListener(ev, cb);
        return this;
    }

    /**
     * Remove an event listener from the element.
     * @param {string} ev - Event name.
     * @param {Function} cb - Event handler callback.
     * @returns {Html} The current Html instance.
     */
    un(ev, cb) {
        this.elm.removeEventListener(ev, cb);
        return this;
    }

    /**
     * Append this element to a parent.
     * @param {HTMLElement|Html|string} parent - A DOM node, Html instance, or selector string.
     * @returns {Html} The current Html instance.
     */
    appendTo(parent) {
        if (parent instanceof Html) parent.elm.appendChild(this.elm);
        else if (parent instanceof HTMLElement) parent.appendChild(this.elm);
        else document.querySelector(parent)?.appendChild(this.elm);
        return this;
    }

    /**
     * Prepend this element to a parent.
     * @param {HTMLElement|Html|string} parent - A DOM node, Html instance, or selector string.
     * @returns {Html} The current Html instance.
     */
    prependTo(parent) {
        if (parent instanceof Html) parent.elm.prepend(this.elm);
        else if (parent instanceof HTMLElement) parent.prepend(this.elm);
        else document.querySelector(parent)?.prepend(this.elm);
        return this;
    }

    /**
     * Append a child element or create one from a tag.
     * @param {HTMLElement|Html|string} elem - Element, Html instance, or tag name.
     * @returns {Html} The current Html instance or new Html for created element.
     */
    append(elem) {
        if (elem instanceof Html) this.elm.appendChild(elem.elm);
        else if (elem instanceof HTMLElement) this.elm.appendChild(elem);
        else if (typeof elem === "string") {
            const newEl = document.createElement(elem);
            this.elm.appendChild(newEl);
            return new Html(newEl);
        }
        return this;
    }

    /**
     * Prepend a child element or create one from a tag.
     * @param {HTMLElement|Html|string} elem - Element, Html instance, or tag name.
     * @returns {Html} The current Html instance or new Html for created element.
     */
    prepend(elem) {
        if (elem instanceof Html) this.elm.prepend(elem.elm);
        else if (elem instanceof HTMLElement) this.elm.prepend(elem);
        else if (typeof elem === "string") {
            const newEl = document.createElement(elem);
            this.elm.prepend(newEl);
            return new Html(newEl);
        }
        return this;
    }

    /**
     * Append multiple elements or tags in sequence.
     * @param {...(HTMLElement|Html|string)} elements - Multiple elements, instances, or tags.
     * @returns {Html} The current Html instance.
     */
    appendMany(...elements) {
        elements.forEach((e) => this.append(e));
        return this;
    }

    /**
     * Prepend multiple elements or tags in sequence.
     * @param {...(HTMLElement|Html|string)} elements - Multiple elements, instances, or tags.
     * @returns {Html} The current Html instance.
     */
    prependMany(...elements) {
        elements.forEach((e) => this.prepend(e));
        return this;
    }

    /**
     * Set or remove attributes.
     * @param {Object.<string,string|null|undefined>} obj - Key-value pairs of attributes. Null/undefined removes attribute.
     * @returns {Html} The current Html instance.
     */
    attr(obj) {
        Object.keys(obj).forEach((key) => {
            const val = obj[key];
            if (val != null) {
                if (key === "htmlFor" && this.elm instanceof HTMLLabelElement) {
                    this.elm.htmlFor = val;
                } else {
                    this.elm.setAttribute(key, val);
                }
            } else {
                this.elm.removeAttribute(key);
            }
        });
        return this;
    }

    /**
     * Set the value property on input elements.
     * @param {string} str - The value to assign.
     * @returns {Html} The current Html instance.
     */
    val(str) {
        this.elm.value = str;
        return this;
    }

    /**
     * Set the src attribute (e.g., for images).
     * @param {string} path - The source URL or path.
     * @returns {Html} The current Html instance.
     */
    src(path) {
        this.elm.src = path;
        return this;
    }

    /**
     * Get array of child elements wrapped in Html.
     * @returns {Html[]} Array of Html instances for each child.
     */
    children() {
        return Array.from(this.elm.children).map((c) => new Html(c));
    }

    /**
     * Get the first child element wrapped in Html.
     * @returns {Html|null} Html instance or null if none.
     */
    firstChild() {
        return this.elm.firstElementChild
            ? new Html(this.elm.firstElementChild)
            : null;
    }

    /**
     * Get the inner text of the element.
     * @returns {string} The element's innerText.
     */
    getText() {
        return this.elm.innerText;
    }

    /**
     * Get the inner HTML of the element.
     * @returns {string} The element's innerHTML.
     */
    getHtml() {
        return this.elm.innerHTML;
    }

    /**
     * Get the outer text of the element.
     * @returns {string} The element's outerText.
     */
    getOuterText() {
        return this.elm.outerText;
    }

    /**
     * Get the outer HTML of the element.
     * @returns {string} The element's outerHTML.
     */
    getOuterHtml() {
        return this.elm.outerHTML;
    }

    /**
     * Get the value property of input elements.
     * @returns {string} The element's value.
     */
    getValue() {
        return this.elm.value;
    }

    /**
     * Swap the internal element reference.
     * @param {HTMLElement} elm - The new DOM element.
     * @returns {Html} The current Html instance.
     */
    swapRef(elm) {
        this.elm = elm;
        return this;
    }

    /**
     * Create an Html instance from various inputs.
     * @param {string|HTMLElement|Html} elm - Selector string, DOM element, or Html instance.
     * @returns {Html|null} Html instance or null if selector not found.
     */
    static from(elm) {
        if (elm instanceof Html) return elm;
        if (typeof elm === "string") {
            const found = document.querySelector(elm);
            return found ? new Html(found) : null;
        }
        if (elm instanceof HTMLElement) return new Html(elm);
        return null;
    }

    /**
     * Query a single element in the document and wrap it.
     * @param {string} selector - A CSS selector string.
     * @returns {Html|null} Html instance or null if not found.
     */
    static qs(selector) {
        const found = document.querySelector(selector);
        return found ? new Html(found) : null;
    }

    /**
     * Query multiple elements in the document and wrap them.
     * @param {string} selector - A CSS selector string.
     * @returns {Html[]|null} Array of Html instances or null if none.
     */
    static qsa(selector) {
        const list = document.querySelectorAll(selector);
        return list.length ? Array.from(list).map((e) => new Html(e)) : null;
    }
}

class Logger {
    constructor(name, options = {}) {
        this.name = name;
        this.options = {
            colors: {
                info: "#7289da",
                warn: "#ffa500",
                error: "#ff0000",
                debug: "#808080",
                success: "#00ff00",
            },
            ...options,
        };
        this.logs = [];

        this.originalLog = console.log;
        this.originalWarn = console.warn;
        this.originalError = console.error;
        this.originalDebug = console.debug;
    }

    init() {
        console.log = (...args) => {
            this.log("info", ...args);
        };

        console.warn = (...args) => {
            this.log("warn", ...args);
        };

        console.error = (...args) => {
            this.log("error", ...args);
        };

        console.debug = (...args) => {
            this.log("debug", ...args);
        };
    }

    log(level, ...args) {
        const timestamp = new Date().toISOString();
        const color = this.options.colors[level] || this.options.colors.info;

        const hasStyleFormat =
            typeof args[0] === "string" && args[0].includes("%c");

        if (hasStyleFormat) {
            this.originalLog.call(
                console,
                `%c[${timestamp}] [${this.name}] [${level.toUpperCase()}]%c ${args[0]}`,
                `color: ${color}; font-weight: bold;`,
                ...args.slice(1),
            );
        } else {
            this.originalLog.call(
                console,
                `%c[${timestamp}] [${this.name}] [${level.toUpperCase()}]`,
                `color: ${color}; font-weight: bold;`,
                ...args,
            );
        }

        this.logs.push({ timestamp, level, args });
    }

    success(...args) {
        this.log("success", ...args);
    }
}

class WsClient {
    constructor(port) {
        this.ws = new WebSocket(`ws://localhost:${port}`);
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.ws.onopen = () => {
            console.log("WebSocket connection established.");
        };

        this.ws.onmessage = (data) => {
            if (data.type === "message") {
                const message = JSON.parse(data.data);
                console.log("Received message:", message);
            }
        };

        this.ws.onclose = () => {
            console.log("WebSocket connection closed.");
        };
    }

    listDrafts() {
        this.ws.send(JSON.stringify({ type: "listDrafts" }));
    }

    sendDraft(draftId) {
        this.ws.send(JSON.stringify({ type: "sendDraft", draftId }));
    }

    listMessages() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "listMessages" }));
        } else {
            console.error("WebSocket is not connected.");
        }
    }

    sendEmail(emailData) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "sendEmail", emailData }));
        } else {
            console.error("WebSocket is not connected.");
        }
    }

    getMessage(messageId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "getMessage", messageId }));
        } else {
            console.error("WebSocket is not connected.");
        }
    }

    searchMessages(query) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "searchMessages", query }));
        } else {
            console.error("WebSocket is not connected.");
        }
    }

    listConversations() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "listConversations" }));
        } else {
            console.error("WebSocket is not connected.");
        }
    }

    getConversation(chatId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "loadConversation", chatId }));
        } else {
            console.error("WebSocket is not connected.");
        }
    }

    createConversation() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "createConversation" }));
        } else {
            console.error("WebSocket is not connected.");
        }
    }

    sendMessage(chatId, message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(
                JSON.stringify({
                    type: "sendMessage",
                    chatId,
                    message,
                    tools: [
                        app.get("ai-input-button-bar-left-inp-check-search").elm
                            .checked
                            ? "search"
                            : "",
                    ],
                }),
            );
        } else {
            console.error("WebSocket is not connected.");
        }
    }
}

class Message {
    constructor(content, timestamp, sender, chatId) {
        this.content = content;
        this.timestamp = timestamp;
        this.sender = sender;
        this.chatId = chatId;
    }

    getContent() {
        return this.content;
    }

    getTimestamp() {
        return this.timestamp;
    }

    getSender() {
        return this.sender;
    }

    getChatId() {
        return this.chatId;
    }

    formatChatMessage() {
        const date = new Date(this.timestamp);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const formattedTime = `${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
        // return `${formattedTime} - ${this.sender}: ${this.content}`;
        const typeOf = typeof this.content;
        let contentText = "";
        if (typeOf === "string") {
            contentText = this.content;
        } else if (typeOf === "object") {
            contentText = this.content.answer;
        }
        return {
            type: "message",
            data: {
                text: contentText,
                createdAt: this.timestamp,
                id: this.chatId,
                author: {
                    role: this.sender,
                },
            },
        };
    }
}

class App {
    arrayElements = [];
    chatModels = {
        "Créer une image": "Transforme le prompt suivant en une image : ",
        "Écrire et envoyer un email":
            "Écris un email en suivant le prompt suivant : ",
        "Donnez-moi des idées":
            "Donne-moi des idées en suivant le prompt suivant : ",
        "Planifier un voyage":
            "Planifie un voyage en suivant le prompt suivant : ",
        "Aidez-moi à choisir":
            "Choisissez entre plusieurs options en suivant le prompt suivant : ",
        "Écrire un script Python":
            "Écris un script Python en suivant le prompt suivant : ",
        "Résoudre le problème":
            "Résoud le problème en suivant le prompt suivant : ",
    };
    icons = {
        "panel-icon": `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-panel-left">
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="M9 3v18"></path>
            </svg>
        `,
    };

    async init() {
        this.initClasses();
        await this.buildVanillaJS();
        await this.initFrame();
    }

    initClasses() {
        this.logger = new Logger(pkg.name, {}).init();
        this.ws = new WsClient(process.env.PORT || 65440);
    }

    async buildVanillaJS() {
        console.log("Build vanilla JS");

        /**
         * Gets an element from the arrayElements array by name or index.
         * @param {string|number} name - The name or index of the element to retrieve
         * @returns {Html|null} The Html element if found, null otherwise
         */
        this.get = (name) => {
            if (typeof name === "string") {
                const found = this.arrayElements.find(
                    (item) => item.name === name,
                );
                return found ? found.element : null;
            } else if (typeof name === "number") {
                return this.arrayElements[name]?.element || null;
            } else {
                return null;
            }
        };
    }

    async initFrame() {
        console.log("Init frame");

        await this.createInterface();
        await this.setupEvents();
    }

    async createInterface() {
        console.log("Create interface");

        // TODO: Create MAIN Element
        this.arrayElements.push({
            name: "main-ctn",
            element: new Html("main").class("main-ctn").appendTo("body"),
        });

        // TODO: Create SIDEBAR Button Element
        this.arrayElements.push({
            name: "side-btn-ctn",
            element: new Html()
                .class("side-button-ctn", "hide")
                .appendTo(this.get("main-ctn")),
        });
        this.arrayElements.push({
            name: "side-btn",
            element: new Html("button")
                .class("side-button")
                .appendTo(this.get("side-btn-ctn")),
        });
        this.arrayElements.push({
            name: "side-btn-icon",
            element: new Html()
                .class("icon")
                .html(this.icons["panel-icon"])
                .appendTo(this.get("side-btn")),
        });

        // TODO: Create SIDEBAR Element
        this.arrayElements.push({
            name: "sidebar",
            element: new Html("aside")
                .class("sidebar")
                .appendTo(this.get("main-ctn")),
        });
        this.arrayElements.push({
            name: "side-top-ctn",
            element: new Html()
                .class("side-top-ctn")
                .appendTo(this.get("sidebar")),
        });
        this.arrayElements.push({
            name: "ul-group-feature",
            element: new Html("ul")
                .dataset({ key: "type", obj: "group" })
                .appendTo(this.get("side-top-ctn")),
        });
        const menuItems = await this.generateCode({
            html: new Html("li")
                .dataset({ key: "type", obj: "menu-item" })
                .class("group-item")
                .append(
                    new Html("a")
                        .class("li-item")
                        .append(
                            new Html("span").class("truncate").text("[{name}]"),
                        )
                        .append(
                            new Html()
                                .class("icon")
                                .append(
                                    new Html("i").class(
                                        "fa-regular",
                                        "fa-[{icon}]",
                                    ),
                                ),
                        ),
                ),
            data: [
                {
                    name: "Nouveau Chat",
                    icon: "message",
                    id: "new-chat-s-feature",
                },
                {
                    name: "Agents",
                    icon: "robot",
                    id: "agents-s-feature",
                },
                {
                    name: "Bibliotèques",
                    icon: "books",
                    id: "libraries-s-feature",
                },
                {
                    name: "Connexions",
                    icon: "link",
                    id: "connections-s-feature",
                },
            ],
            value: ["name", "icon"],
        });
        this.get("ul-group-feature").appendMany(...menuItems);
        this.arrayElements.push({
            name: "search-button",
            element: new Html("button")
                .class("search-button")
                .appendTo(this.get("side-top-ctn")),
        });
        this.arrayElements.push({
            name: "search-button-icon",
            element: new Html()
                .class("icon")
                .append(new Html("i").class("fa-solid", "fa-magnifying-glass"))
                .appendTo(this.get("search-button")),
        });
        this.arrayElements.push({
            name: "search-text",
            element: new Html("span")
                .text("Rechercher")
                .appendTo(this.get("search-button")),
        });
        this.arrayElements.push({
            name: "shortcut-keys",
            element: new Html()
                .class("shortcut-keys")
                .append(new Html("kbd").text("Ctrl"))
                .append(new Html("kbd").text("K"))
                .appendTo(this.get("search-button")),
        });
        this.arrayElements.push({
            name: "side-middle-ctn",
            element: new Html()
                .class("side-middle-ctn")
                .appendTo(this.get("sidebar")),
        });
        this.arrayElements.push({
            name: "side-bottom-ctn",
            element: new Html()
                .class("side-bottom-ctn")
                .appendTo(this.get("sidebar")),
        });
        this.arrayElements.push({
            name: "theme-toggle-btn",
            element: new Html("button")
                .class("theme-toggle")
                .appendTo(this.get("side-bottom-ctn")),
        });
        this.arrayElements.push({
            name: "theme-icon-sun",
            element: new Html()
                .class("icon")
                .append(new Html("i").class("fa-regular", "fa-sun-bright"))
                .appendTo(this.get("theme-toggle-btn")),
        });
        this.arrayElements.push({
            name: "theme-icon-moon",
            element: new Html()
                .class("icon")
                .append(new Html("i").class("fa-regular", "fa-moon"))
                .appendTo(this.get("theme-toggle-btn")),
        });
        this.arrayElements.push({
            name: "side-button-2",
            element: new Html("button")
                .class("side-button")
                .appendTo(this.get("side-bottom-ctn")),
        });
        this.arrayElements.push({
            name: "side-btn-icon-2",
            element: new Html()
                .class("icon")
                .html(this.icons["panel-icon"])
                .appendTo(this.get("side-button-2")),
        });

        // TODO: Create MAIN CONTENT Element
        this.arrayElements.push({
            name: "main-content",
            element: new Html()
                .class("main-content")
                .appendTo(this.get("main-ctn")),
        });
        this.arrayElements.push({
            name: "section-navbar",
            element: new Html("section")
                .class("navbar")
                .appendTo(this.get("main-content")),
        });
        this.arrayElements.push({
            name: "container-navbar",
            element: new Html()
                .class("container")
                .appendTo(this.get("section-navbar")),
        });
        this.arrayElements.push({
            name: "navbar-controls",
            element: new Html()
                .class("control")
                .appendTo(this.get("container-navbar")),
        });
        const navbarControls = await this.generateCode({
            html: new Html("button")
                .class("[{name}]", "button-frame")
                .id("[{name}]")
                .append(new Html("i").class("fa-solid", "fa-[{icon}]")),
            data: [
                {
                    name: "close",
                    icon: "xmark",
                    id: "close-nav",
                },
                {
                    name: "minimize",
                    icon: "minus",
                    id: "minimize-nav",
                },
                {
                    name: "maximize",
                    icon: "arrow-up-right-and-arrow-down-left-from-center",
                    id: "maximize-nav",
                },
            ],
            value: ["name", "icon"],
        });
        this.get("navbar-controls").appendMany(...navbarControls);
        this.arrayElements.push({
            name: "navbar-icon",
            element: new Html("i")
                .class("fa-regular", "fa-microchip", "logo")
                .appendTo(this.get("section-navbar")),
        });
        this.arrayElements.push({
            name: "navbar-icon",
            element: new Html("span")
                .class("title")
                .text(`${pkg.name} - ${pkg.version}`)
                .appendTo(this.get("section-navbar")),
        });

        await this.createAiInput();
    }

    async createAiInput() {
        console.log("Create AI Input");

        this.arrayElements.push({
            name: "ai-input",
            element: new Html()
                .class("ai-input")
                .appendTo(this.get("main-content")),
        });
        this.arrayElements.push({
            name: "ai-input-inp-file-camera",
            element: new Html("input")
                .attr({
                    type: "file",
                    accept: "image/*",
                    capture: "environment",
                })
                .id("camera")
                .appendTo(this.get("ai-input")),
        });
        this.arrayElements.push({
            name: "ai-input-inp-file-photos",
            element: new Html("input")
                .attr({ type: "file", accept: "image/*" })
                .id("photos")
                .appendTo(this.get("ai-input")),
        });
        this.arrayElements.push({
            name: "ai-input-inp-file-files",
            element: new Html("input")
                .attr({ type: "file" })
                .id("files")
                .appendTo(this.get("ai-input")),
        });
        this.arrayElements.push({
            name: "ai-input-inp-check-voice",
            element: new Html("input")
                .attr({ type: "checkbox", id: "voice" })
                .appendTo(this.get("ai-input")),
        });
        await this.generateAiInputLabel({
            for: "voice",
            icons: ["xmark-large"],
        });
        this.arrayElements.push({
            name: "ai-input-inp-check-mic",
            element: new Html("input")
                .attr({ type: "checkbox", id: "mic" })
                .appendTo(this.get("ai-input")),
        });
        await this.generateAiInputLabel({
            for: "mic",
            icons: ["microphone", "microphone-slash"],
        });
        this.arrayElements.push({
            name: "ai-input-chat-marquee",
            element: new Html()
                .class("chat-marquee")
                .appendTo(this.get("ai-input")),
        });
        const chatGroup1 = await this.generateCode({
            html: new Html("ul").dataset({ key: "type", obj: "group" }),
            data: [
                {
                    textArr: [],
                },
            ],
            value: [],
        });
        const ulElement1 = chatGroup1[0];
        [
            "Créer une image",
            "Écrire et envoyer un email",
            "Donnez-moi des idées",
            "Planifier un voyage",
            "Aidez-moi à choisir",
            "Écrire un script Python",
            "Résoudre le problème",
        ].forEach((text) => {
            ulElement1.append(
                new Html("li").text(text).on("click", () => {
                    const input = this.get("ai-input-chat-input");
                    input.val(this.chatModels[text]);
                    input.elm.focus();
                }),
            );
        });
        this.get("ai-input-chat-marquee").appendMany(...chatGroup1);
        const chatGroup2 = await this.generateCode({
            html: new Html("ul").dataset({ key: "type", obj: "group" }),
            data: [
                {
                    textArr: [],
                },
            ],
            value: [],
        });
        const ulElement2 = chatGroup2[0];
        [
            "Créer une image",
            "Écrire et envoyer un email",
            "Donnez-moi des idées",
            "Planifier un voyage",
            "Aidez-moi à choisir",
            "Écrire un script Python",
            "Résoudre le problème",
        ].forEach((text) => {
            ulElement2.append(
                new Html("li").text(text).on("click", () => {
                    const input = this.get("ai-input-chat-input");
                    input.val(this.chatModels[text]);
                    input.elm.focus();
                }),
            );
        });
        this.get("ai-input-chat-marquee").appendMany(...chatGroup2);
        this.arrayElements.push({
            name: "ai-input-chat-container",
            element: new Html()
                .class("chat-container")
                .appendTo(this.get("ai-input")),
        });
        this.arrayElements.push({
            name: "ai-input-chat-input-label",
            element: new Html("label")
                .class("chat-wrapper")
                .attr({
                    for: "chat-input",
                })
                .appendTo(this.get("ai-input-chat-container")),
        });
        this.arrayElements.push({
            name: "ai-input-chat-input",
            element: new Html("textarea")
                .id("chat-input")
                .attr({
                    placeholder: "Poser une question",
                })
                .appendTo(this.get("ai-input-chat-input-label")),
        });
        this.arrayElements.push({
            name: "ai-input-button-bar",
            element: new Html()
                .class("button-bar")
                .appendTo(this.get("ai-input-chat-input-label")),
        });
        this.arrayElements.push({
            name: "ai-input-button-bar-left-btns",
            element: new Html()
                .class("left-buttons")
                .appendTo(this.get("ai-input-button-bar")),
        });
        this.arrayElements.push({
            name: "ai-input-button-bar-left-inp-check-appendix",
            element: new Html("input")
                .attr({ type: "checkbox", id: "appendix" })
                .appendTo(this.get("ai-input-button-bar-left-btns")),
        });
        await this.generateAiInputLabel({
            for: "appendix",
            icons: ["paperclip-vertical"],
            parentId: "ai-input-button-bar-left-btns",
        });
        this.arrayElements.push({
            name: "ai-input-button-bar-left-appendix-bar",
            element: new Html()
                .id("appendix-bar")
                .appendTo(this.get("ai-input-button-bar-left-btns")),
        });
        await this.generateAiInputLabel({
            for: "appendix",
            icons: ["xmark-large"],
            parentId: "ai-input-button-bar-left-appendix-bar",
        });
        await this.generateAiInputLabel({
            for: "camera",
            icons: ["camera"],
            parentId: "ai-input-button-bar-left-appendix-bar",
        });
        await this.generateAiInputLabel({
            for: "photos",
            icons: ["image"],
            parentId: "ai-input-button-bar-left-appendix-bar",
        });
        await this.generateAiInputLabel({
            for: "files",
            icons: ["folder"],
            parentId: "ai-input-button-bar-left-appendix-bar",
        });
        this.arrayElements.push({
            name: "ai-input-button-bar-left-inp-check-search",
            element: new Html("input")
                .attr({ type: "checkbox", id: "search" })
                .appendTo(this.get("ai-input-button-bar-left-btns")),
        });
        await this.generateAiInputLabel({
            for: "search",
            icons: ["globe"],
            parentId: "ai-input-button-bar-left-btns",
        });
        this.arrayElements.push({
            name: "ai-input-button-bar-right-btns",
            element: new Html()
                .class("right-buttons")
                .appendTo(this.get("ai-input-button-bar")),
        });
        await this.generateAiInputLabel({
            for: "voice",
            icons: ["microphone"],
            parentId: "ai-input-button-bar-right-btns",
        });
        this.arrayElements.push({
            name: "ai-input-button-bar-right-send-btn",
            element: new Html("button")
                .append(new Html("i").class("fa-regular", "fa-arrow-up"))
                .appendTo(this.get("ai-input-button-bar-right-btns")),
        });
    }

    async generateCode({ html, data, value }) {
        console.log("Generate code");

        return data.map((item) => {
            const template = html.getOuterHtml();
            let processedHtml = template;

            value.forEach((val) => {
                const regex = new RegExp(`\\[{${val}}\\]`, "g");
                processedHtml = processedHtml.replace(regex, item[val]);
            });

            const temp = document.createElement("div");
            temp.innerHTML = processedHtml;

            const newElement = new Html(temp.firstElementChild);

            this.arrayElements.push({
                name: `generated-${item?.id || item.name}`,
                element: newElement,
            });

            return newElement;
        });
    }

    async generateAiInputLabel({ for: forId, icons, parentId = "ai-input" }) {
        console.log("Generate AI Input Label");

        const label = new Html("label")
            .attr({ htmlFor: forId })
            .appendMany(
                ...icons.map((icon) => {
                    return new Html("i").class("fa-regular", `fa-${icon}`);
                }),
            )
            .appendTo(this.get(parentId));

        return label;
    }

    async setupEvents() {
        console.log("Setup events");

        this.get("container-navbar").classOn("end");

        this.get("generated-minimize-nav").on("click", () => {
            ipcRenderer.send("minimize-window");
        });
        this.get("generated-maximize-nav").on("click", () => {
            ipcRenderer.send("maximize-window");
            console.log(
                this.get("generated-maximize-nav")
                    .firstChild()
                    .class(
                        "fa-arrow-down-left-and-arrow-up-right-to-center",
                        "fa-arrow-up-right-and-arrow-down-left-from-center",
                    ),
            );
        });
        this.get("generated-close-nav").on("click", () => {
            ipcRenderer.send("close-window");
        });

        const sideBtn = Html.qsa("button.side-button");

        sideBtn.forEach((child) => {
            child.on("click", () => {
                this.get("sidebar").class("hide");
                this.get("side-btn-ctn").class("hide");
            });
        });

        let theme = "auto";
        let isDarkTheme = await ipcRenderer
            .invoke("is-dark-theme", theme)
            .then((res) => res);
        let body = document.body;
        body.className = isDarkTheme ? "dark global" : "light global";

        this.get(isDarkTheme ? "theme-icon-sun" : "theme-icon-moon").class(
            "actived",
        );
        this.get("theme-toggle-btn").on("click", () => {
            isDarkTheme = !isDarkTheme;
            body.className = isDarkTheme ? "dark global" : "light global";
            this.get(
                isDarkTheme ? "theme-icon-sun" : "theme-icon-moon",
            ).classOn("actived");
            this.get(
                !isDarkTheme ? "theme-icon-sun" : "theme-icon-moon",
            ).classOff("actived");
        });
    }
}

const app = new App();
app.init();
window.app = app;
window.ipcRenderer = ipcRenderer;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

window.delay = delay;
