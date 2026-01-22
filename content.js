// this project was originally called ghost mode ai so please bear with all these ghost names.

console.log("Janus Loaded");

let isGhostMode = false;
let isWaiting = false;
let currentChatId = null;

//detects the unique conversation id from the URL
function getChatId() {
    const url = new URL(window.location.href);
    const path = url.pathname;
    const host = url.hostname;

    //chatgpt (/c/UUID)
    if (host.includes("chatgpt.com")) {
        const match = path.match(/\/c\/([a-zA-Z0-9-]+)/);
        return match && match[1] ? "chatgpt_" + match[1] : "chatgpt_home";
    }
    
    //gemini (/app/ID)
    if (host.includes("google.com")) {
        const match = path.match(/\/app\/([a-zA-Z0-9]+)/);
        return match && match[1] ? "gemini_" + match[1] : "gemini_home";
    }

    //deepseek (full path)
    if (host.includes("deepseek")) {
        //deepseels urls change often so we pick up the whole url
        return "deepseek_" + (path.length > 1 ? path.replace(/\//g, "_") : "home");
    }

    //default fallback
    return "unknown_" + path.replace(/\//g, "_");
}

function createFloatingWindow() {
    if (document.getElementById("ghost-floating-window")) return;
    const windowDiv = document.createElement("div");
    windowDiv.id = "ghost-floating-window";
    
    //inject the HTML structure(header+body)
    //title to be changed
    windowDiv.innerHTML = `
        <div class="ghost-window-header">
            <div class="ghost-window-title">Ghost Chat</div>
            <button class="ghost-minimize-btn" title="Close">×</button>
        </div>
        <div class="ghost-window-body"></div>
    `;
    document.body.appendChild(windowDiv);

    windowDiv.querySelector(".ghost-minimize-btn").addEventListener("click", () => {
        toggleGhostMode(false); //close window
    });

    makeDraggable(windowDiv);
}

function makeDraggable(element) {
    const header = element.querySelector(".ghost-window-header");
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        header.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.right = "auto"; 
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        header.style.cursor = "grab";
    });
}

function toggleGhostMode(forceState) {
    const btn = document.getElementById("ghost-mode-toggle");
    const win = document.getElementById("ghost-floating-window");
    
    isGhostMode = (forceState !== undefined) ? forceState : !isGhostMode;

    if (isGhostMode) {
        btn.classList.add("active");
        btn.innerHTML = "💀";         //couldn't think of anything for now but will change it later
        win.classList.add("visible");
        
        //auto scroll to bottom when opening
        const body = win.querySelector(".ghost-window-body");
        body.scrollTop = body.scrollHeight;
    } else {
        btn.classList.remove("active");
        btn.innerHTML = "👻";
        win.classList.remove("visible");
    }
}

function createGhostButton() {
    if (document.getElementById("ghost-mode-toggle")) return;
    const btn = document.createElement("button");
    btn.id = "ghost-mode-toggle"; 
    btn.innerHTML = "👻"; 
    btn.title = "Toggle Ghost Mode";
    btn.addEventListener("click", () => toggleGhostMode());
    document.body.appendChild(btn);
}

function saveGhostMessage(text, isUser) {
    const chatId = getChatId();
    if (chatId.includes("_home")) return; 

    chrome.storage.local.get([chatId], (result) => {
        let history = result[chatId] || [];
        history.push({ text, isUser, timestamp: Date.now() });
        chrome.storage.local.set({ [chatId]: history });
    });
}

function restoreGhostMessages() {
    const body = document.querySelector(".ghost-window-body");
    if (body) body.innerHTML = "";
    const chatId = getChatId();
    currentChatId = chatId; 
    
    chrome.storage.local.get([chatId], (result) => {
        const history = result[chatId];
        if (history && history.length > 0) {
            //we are passing false as 3rd argument so we dont save the previously saved texts with new ones
            history.forEach(msg => injectGhostBubble(msg.text, msg.isUser, false));
        }
    });
}

function injectGhostBubble(text, isUser, shouldSave = true) {
    const container = document.querySelector(".ghost-window-body");
    if (!container) return;

    const wrapper = document.createElement("div");
    wrapper.classList.add("ghost-message-container");
    wrapper.style.alignItems = isUser ? "flex-end" : "flex-start";
    
    const label = document.createElement("div");
    label.classList.add("ghost-label");
    label.innerText = isUser ? "You" : "Ghost";
    
    const bubble = document.createElement("div");
    bubble.classList.add("ghost-bubble");
    bubble.classList.add(isUser ? "ghost-user" : "ghost-ai");
    // if ai render text with markdown suport
    if (!isUser && typeof SimpleMarkdown !== 'undefined') {
        bubble.innerHTML = SimpleMarkdown.parse(text);
    } else {
        bubble.innerText = text;
    }

    wrapper.appendChild(label);
    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
    
    //auto scroll to bottom
    container.scrollTop = container.scrollHeight;

    if (shouldSave) saveGhostMessage(text, isUser);
}

function showLoading() {
    const container = document.querySelector(".ghost-window-body");
    const wrapper = document.createElement("div");
    wrapper.classList.add("ghost-message-container");
    wrapper.id = "ghost-loading-indicator";
    wrapper.style.alignItems = "flex-start";
    wrapper.innerHTML = `
        <div class="ghost-label">Thinking...</div>
        <div class="ghost-loading-bubble">
            <div class="ghost-dot"></div><div class="ghost-dot"></div><div class="ghost-dot"></div>
        </div>`;
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
}

function removeLoading() {
    const loader = document.getElementById("ghost-loading-indicator");
    if (loader) loader.remove();
}

function getCurrentAdapter() {
    const h = window.location.hostname;
    if(h.includes("gemini")) return ADAPTERS["gemini.google.com"];
    if(h.includes("chatgpt")) return ADAPTERS["chatgpt.com"];
    if(h.includes("deepseek")) return ADAPTERS["deepseek.com"];
    return null;
}

function getChatInput() {
    const adapter = getCurrentAdapter();
    if (!adapter) return null;
    for (const selector of adapter.inputBox) {
        const el = document.querySelector(selector);
        if (el) return el;
    }
    return null;
}

function scrapeContext() {
    const adapter = getCurrentAdapter();
    if (!adapter) return "";
    
    const bubbles = document.querySelectorAll(adapter.messageSelector);
    
    //scrape the last 15 messages, clean them up, and join them
    return Array.from(bubbles).slice(-15).map(b => b.innerText.replace(/\n+/g, " ").trim()).join("\n---\n");
}

function setupInterceptor() {
    document.body.addEventListener("keydown", (event) => {
        if (isGhostMode && event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            if (isWaiting) return;

            const inputBox = getChatInput();
            if (inputBox) {
                const stolenText = inputBox.innerText || inputBox.value;
                if (!stolenText.trim()) return;

                isWaiting = true;
                const screenContext = scrapeContext(); 
                
                injectGhostBubble(stolenText, true);
                inputBox.innerHTML = ""; 
                showLoading();

                chrome.storage.local.get(["activeProvider"], (result) => {
                    const provider = result.activeProvider || "gemini";
                    chrome.runtime.sendMessage(
                        { 
                            action: "fetchGhostReply", 
                            prompt: stolenText, 
                            context: screenContext, 
                            provider: provider 
                        }, 
                        (response) => {
                            removeLoading();
                            isWaiting = false;
                            if (response && response.success) {
                                injectGhostBubble(response.data, false);
                            } else {
                                injectGhostBubble("Error: " + (response.error || "Unknown"), false);
                            }
                        }
                    );
                });
            }
        }
    }, true);
}

function setupCopyListeners() {
    //allows clicking copy to copy code blocks
    document.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("ghost-copy-btn")) {
            const btn = e.target;
            const rawCode = decodeURIComponent(btn.getAttribute("data-code"));
            
            navigator.clipboard.writeText(rawCode).then(() => {
                const original = btn.innerText;
                btn.innerText = "Copied!";
                btn.classList.add("copied");
                setTimeout(() => {
                    btn.innerText = original;
                    btn.classList.remove("copied");
                }, 2000);
            });
        }
    });
}

function setupUrlObserver() {
    setInterval(() => {
        const newId = getChatId();
        if (newId !== currentChatId) {
            restoreGhostMessages();
        }
    }, 1000);
}

//init
setTimeout(() => {
    createGhostButton();
    createFloatingWindow(); //creates the window on load(hidden)
    setupInterceptor();
    setupCopyListeners();
    restoreGhostMessages(); 
    setupUrlObserver();
}, 1000);