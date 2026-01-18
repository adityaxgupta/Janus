const ADAPTERS = {
    //gemini adapter
    "gemini.google.com": {
        inputBox: ["div[contenteditable='true']", "div[role='textbox']"],
        messageSelector: ".user-query-text, .model-response-text, message-content",
        scrollableList: "infinite-scroll-component, msg-list, main" 
    },

    //chatgpt adapter
    "chatgpt.com": {
        inputBox: ["#prompt-textarea"],
        messageSelector: "div[data-message-author-role]", 
        scrollableList: "div[class*='react-scroll-to-bottom']" 
    },

    //deepseek adapter
    "deepseek.com": {
        inputBox: ["textarea", "#chat-input"], 
        messageSelector: ".ds-markdown, .text-base", 
        scrollableList: "main div[class*='scroll']" 
    }
};

//helper func to get current site config
function getCurrentAdapter() {
    const hostname = window.location.hostname;
    for (const domain in ADAPTERS) {
        if (hostname.includes(domain)) {
            console.log(`🔌 Loaded Adapter for: ${domain}`);
            return ADAPTERS[domain];
        }
    }
    return null;
}