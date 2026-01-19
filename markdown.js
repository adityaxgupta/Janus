const SimpleMarkdown = {
    parse: function (text) {
        //if null or empty, return
        if (!text) return "";

        //sanitization
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        html = html.replace(/```(\w*)([\s\S]*?)```/g, (match, lang, code) => {
            const safeCode = code.trim(); 
            
            return `<div class="ghost-code-block">
                        <div class="ghost-code-header">
                            <span class="ghost-lang-label">${lang || "code"}</span>
                            <button class="ghost-copy-btn" data-code="${encodeURIComponent(safeCode)}">Copy</button>
                        </div>
                        <pre><code>${safeCode}</code></pre>
                    </div>`;
        });

        //inline code (const a = 1)
        html = html.replace(/`([^`]+)`/g, '<code class="ghost-inline-code">$1</code>');

        //bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        //italics
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        //list
        html = html.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
        //wrap <li>s in <ul>
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        //line break
        html = html.replace(/\n/g, '<br>');

        return html;
    }
};