let customProviders = []; //store custom APIs in memory

document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    setupEventListeners();
});

function setupEventListeners() {
    //save settings
    document.getElementById("saveBtn").addEventListener("click", saveSettings);

    //tab switch
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".content-zone").forEach(z => z.classList.remove("active"));
            
            btn.classList.add("active");
            const viewId = btn.getAttribute("data-tab");
            document.getElementById(viewId).classList.add("active");
        });
    });

    //toggle for gemini advanced options
    document.querySelectorAll(".advanced-toggle").forEach(toggle => {
        toggle.addEventListener("click", () => {
            const section = toggle.nextElementSibling;
            section.classList.toggle("visible");
        });
    });

    document.getElementById("fetchModelsBtn").addEventListener("click", fetchGeminiModels);

    //show custom
    document.getElementById("showAddFormBtn").addEventListener("click", () => {
        const form = document.getElementById("addCustomForm");
        const btn = document.getElementById("showAddFormBtn");
        const isHidden = form.style.display === "none" || form.style.display === "";
        
        form.style.display = isHidden ? "block" : "none";
        btn.style.display = isHidden ? "none" : "block";
    });

    //add new custom provider
    document.getElementById("addCustomBtn").addEventListener("click", handleAddCustom);
}

function getOrigin(url) {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.hostname}/*`;
    } catch (e) { return null; }
}

function getNormalizedEndpoint(userUrl) {
    let url = userUrl.trim().replace(/\/+$/, "");
    if (url.endsWith("/chat/completions")) return url;
    if (url.endsWith("/v1")) return `${url}/chat/completions`;
    // if user enters base domain like api.groq.com, assume standard path
    return `${url}/v1/chat/completions`;
}

async function handleAddCustom() {
    console.log("🚀 Starting Add Custom Process...");
    
    const name = document.getElementById("newCustomName").value;
    const rawUrl = document.getElementById("newCustomUrl").value;
    const key = document.getElementById("newCustomKey").value;
    const model = document.getElementById("newCustomModel").value;
    const btn = document.getElementById("addCustomBtn");
    const statusDiv = document.getElementById("status");

    statusDiv.innerText = "";
    statusDiv.style.color = "#333";

    if (!name || !rawUrl) {
        statusDiv.innerText = "Name and URL are required.";
        statusDiv.style.color = "red";
        return;
    }

    const finalUrl = getNormalizedEndpoint(rawUrl);
    const originPattern = getOrigin(finalUrl);

    console.log(`Raw URL: ${rawUrl}`);
    console.log(`Final Endpoint: ${finalUrl}`);
    console.log(`Origin Pattern: ${originPattern}`);

    if (!originPattern) {
        statusDiv.innerText = "Invalid URL format.";
        statusDiv.style.color = "red";
        return;
    }

    //request permission
    btn.innerText = "Requesting Permission...";
    
    try {
        const hasPermission = await chrome.permissions.contains({ origins: [originPattern] });
        console.log(`Has Permission: ${hasPermission}`);
        
        if (!hasPermission) {
            console.log("Requesting permission from user...");
            const granted = await chrome.permissions.request({ origins: [originPattern] });
            console.log(`User Response: ${granted}`);
            
            if (!granted) {
                alert("Permission denied. Can't connect to this URL.");
                btn.innerText = "Test & Save Connection";
                return;
            }
        }
    } catch (permErr) {
        console.error("Permission Error:", permErr);
        statusDiv.innerText = "Permission Error: " + permErr.message;
        statusDiv.style.color = "red";
        btn.innerText = "Test & Save Connection";
        return;
    }

    //test conection
    btn.innerText = "Testing Connection...";
    
    try {
        await testCustomConnection(finalUrl, key, model);
        
        console.log("Test Successful!");

        //if connection works, save it
        const newId = "custom_" + Date.now();
        customProviders.push({ id: newId, name, url: finalUrl, key, model });
        
        //reset
        document.getElementById("newCustomName").value = "";
        document.getElementById("newCustomUrl").value = "";
        document.getElementById("newCustomKey").value = "";
        document.getElementById("newCustomModel").value = "";
        document.getElementById("addCustomForm").style.display = "none";
        document.getElementById("showAddFormBtn").style.display = "block";
        
        btn.innerText = "Test & Save Connection";
        
        renderCustomList();
        updateDropdown(newId);
        saveSettings();
        
        statusDiv.innerText = "Connection Verified & Saved!";
        statusDiv.style.color = "green";

    } catch (error) {
        console.error("Test Failed:", error);
        statusDiv.innerText = "Connection Failed: " + error.message;
        statusDiv.style.color = "red";
        btn.innerText = "Test & Save Connection";
    }
}

async function testCustomConnection(url, apiKey, modelName) {
    console.log(`Testing Connection to: ${url}`);
    console.log(`Model: ${modelName || "default"}`);

    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const body = {
        model: modelName || "default",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5
    };

    //timeout controller (10 sec)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, { 
            method: "POST", 
            headers, 
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        console.log(`📥 Status: ${response.status} ${response.statusText}`);
        
        //parse response text first to log it, then check JSON
        const rawText = await response.text();
        console.log(`Raw Response:`, rawText);

        if (!response.ok) {
            //try to parse error from json
            let errMsg = `API Error ${response.status}`;
            try {
                const json = JSON.parse(rawText);
                if (json.error && json.error.message) errMsg = json.error.message;
            } catch (e) { /* ignore parse error */ }
            
            throw new Error(errMsg);
        }

    } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error("Connection Timed Out (10s)");
        throw e;
    }
}

//logic for standard mode
async function fetchGeminiModels() {
    const apiKey = document.getElementById("geminiKey").value;
    const statusDiv = document.getElementById("modelStatus");
    const select = document.getElementById("geminiModel");

    if (!apiKey) {
        statusDiv.innerText = "Enter API Key first.";
        statusDiv.style.color = "red";
        return;
    }

    statusDiv.innerText = "Fetching...";
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const chatModels = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
        
        select.innerHTML = "";
        chatModels.forEach(model => {
            const cleanName = model.name.replace("models/", "");
            const option = document.createElement("option");
            option.value = cleanName;
            option.text = `${cleanName}`;
            select.add(option);
        });
        statusDiv.innerText = `Found ${chatModels.length} models.`;
        statusDiv.style.color = "green";
    } catch (err) {
        statusDiv.innerText = "Error: " + err.message;
        statusDiv.style.color = "red";
    }
}

function loadSettings() {
    chrome.storage.local.get(null, (result) => {
        if (result.geminiApiKey) document.getElementById("geminiKey").value = result.geminiApiKey;
        if (result.openaiApiKey) document.getElementById("openaiKey").value = result.openaiApiKey;
        if (result.deepseekApiKey) document.getElementById("deepseekKey").value = result.deepseekApiKey;
        if (result.openrouterApiKey) document.getElementById("openrouterKey").value = result.openrouterApiKey;
        if (result.openrouterModel) document.getElementById("openrouterModel").value = result.openrouterModel;
        
        if (result.geminiModel) {
            const select = document.getElementById("geminiModel");
            if (![...select.options].some(o => o.value === result.geminiModel)) {
                const opt = document.createElement("option");
                opt.value = result.geminiModel;
                opt.text = result.geminiModel + " (Saved)";
                select.add(opt);
            }
            select.value = result.geminiModel;
        }

        customProviders = result.customProviders || [];
        renderCustomList();
        updateDropdown(result.activeProvider);
    });
}

function saveSettings() {
    const config = {
        geminiApiKey: document.getElementById("geminiKey").value,
        geminiModel: document.getElementById("geminiModel").value,
        openaiApiKey: document.getElementById("openaiKey").value,
        deepseekApiKey: document.getElementById("deepseekKey").value,
        openrouterApiKey: document.getElementById("openrouterKey").value,
        openrouterModel: document.getElementById("openrouterModel").value,
        activeProvider: document.getElementById("activeProvider").value,
        customProviders: customProviders
    };

    chrome.storage.local.set(config, () => {
        const status = document.getElementById("status");
        status.innerText = "Settings Saved!";
        status.style.color = "green";
        status.style.opacity = "1";
        setTimeout(() => status.style.opacity = "0", 2000);
    });
}

function deleteCustomProvider(id) {
    if(!confirm("Remove this connection?")) return;
    customProviders = customProviders.filter(p => p.id !== id);
    const currentActive = document.getElementById("activeProvider").value;
    if (currentActive === id) updateDropdown("gemini");
    else updateDropdown(currentActive);
    renderCustomList();
    saveSettings();
}

function renderCustomList() {
    const container = document.getElementById("customListContainer");
    container.innerHTML = "";
    if (customProviders.length === 0) {
        container.innerHTML = "<div style='text-align:center;color:#999;font-size:12px;padding:10px;'>No custom connections.</div>";
        return;
    }
    customProviders.forEach(p => {
        const div = document.createElement("div");
        div.className = "custom-item";
        div.innerHTML = `
            <div class="custom-info">
                <div class="custom-name">🔌 ${p.name}</div>
                <div class="custom-meta" title="${p.url}">${p.model || "Default"}</div>
            </div>
            <button class="del-btn" data-id="${p.id}">Delete</button>
        `;
        container.appendChild(div);
        div.querySelector(".del-btn").addEventListener("click", () => deleteCustomProvider(p.id));
    });
}

function updateDropdown(activeId) {
    const select = document.getElementById("activeProvider");
    while (select.options.length > 4) select.remove(4);

    customProviders.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.text = `🔌 ${p.name}`;
        select.add(option);
    });

    select.value = activeId || "gemini";
}