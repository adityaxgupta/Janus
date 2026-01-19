//will add support for other LLMs soon

//Gemini (direct)
//gemini 2.5 flash
async function callGemini(apiKey, prompt, context) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: `Context:\n${context}\n\nQuestion: ${prompt}` }] }] };
    const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
}

//OpenAI (direct)
//gpt 4o mini
async function callOpenAI(apiKey, prompt, context) {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const payload = {
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: `Context:\n${context}\n\nQuestion: ${prompt}` }]
    };
    const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

// DeepSeek (direct)
// deepseek-chat
async function callDeepSeek(apiKey, prompt, context) {
    const apiUrl = "https://api.deepseek.com/chat/completions";
    const payload = {
        model: "deepseek-chat",
        messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: `Context:\n${context}\n\nQuestion: ${prompt}` }],
        stream: false
    };
    const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

//OpenRouter (dynamic, user has to input the model)
async function callOpenRouter(apiKey, modelID, prompt, context) {
    const apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    
    //use custom model id and if user leaves it blank, use gemini-2.0-flash-lite-preview as default provider (free)
    const targetModel = modelID ? modelID : "google/gemini-2.0-flash-lite-preview-02-05:free";
    
    const payload = {
        model: targetModel, 
        messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: `Context:\n${context}\n\nQuestion: ${prompt}` }]
    };

    const response = await fetch(apiUrl, {
        method: "POST", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "HTTP-Referer": "https://github.com/adityaxgupta/Janus", "X-Title": "Janus" }, 
        body: JSON.stringify(payload) 
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.choices[0].message.content;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchGhostReply") {
        
        chrome.storage.local.get(["geminiApiKey", "openaiApiKey", "deepseekApiKey", "openrouterApiKey", "openrouterModel"], async (keys) => {
            
            let preferred = request.provider; 
            let answer = null;
            let usedProvider = "";
            let errors = [];

            const attempt = async (providerName) => {
                try {
                    if (providerName === "gemini") {
                        if (!keys.geminiApiKey) throw new Error("Key Missing");
                        return await callGemini(keys.geminiApiKey, request.prompt, request.context);
                    } 
                    else if (providerName === "openai") {
                        if (!keys.openaiApiKey) throw new Error("Key Missing");
                        return await callOpenAI(keys.openaiApiKey, request.prompt, request.context);
                    }
                    else if (providerName === "deepseek") {
                        if (!keys.deepseekApiKey) throw new Error("Key Missing");
                        return await callDeepSeek(keys.deepseekApiKey, request.prompt, request.context);
                    }
                    else if (providerName === "openrouter") {
                        if (!keys.openrouterApiKey) throw new Error("Key Missing");
                        return await callOpenRouter(keys.openrouterApiKey, keys.openrouterModel, request.prompt, request.context);
                    }
                } catch (err) {
                    console.warn(`${providerName} failed:`, err.message);
                    errors.push(`${providerName}: ${err.message}`);
                    return null;
                }
            };

            //try users preference first
            console.log(`Attempting Primary: ${preferred}`);
            answer = await attempt(preferred);
            
            if (answer) {
                usedProvider = preferred;
            } else {
                //if preference fails, this will be default fallback order 
                const fallbackOrder = ["openrouter", "gemini", "deepseek", "openai"];
                const fallbacks = fallbackOrder.filter(p => p !== preferred);
                
                for (const fallbackProvider of fallbacks) {
                    console.log(`Fallback to: ${fallbackProvider}`);
                    answer = await attempt(fallbackProvider);
                    if (answer) {
                        usedProvider = fallbackProvider;
                        break; 
                    }
                }
            }

            if (answer) {
                if (usedProvider !== preferred) answer = `[Fallback to ${usedProvider}]: ${answer}`;
                sendResponse({ success: true, data: answer });
            } else {
                sendResponse({ 
                    success: false, 
                    error: `All attempts failed. Details: ${errors.join(" | ")}` 
                });
            }
        });
        return true; 
    }
});
