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