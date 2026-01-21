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