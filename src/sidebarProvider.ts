import * as vscode from 'vscode';

export class RegexSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'regexHelperView';

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 12px;
            color: var(--vscode-editor-foreground);
            font-size: 12px;
        }
        h3 {
            margin: 0 0 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 4px;
        }
        label {
            display: block;
            margin: 8px 0 4px;
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            text-transform: uppercase;
        }
        input, select, textarea {
            width: 100%;
            box-sizing: border-box;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 6px;
            margin-bottom: 6px;
            font-family: var(--vscode-editor-font-family);
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            margin-bottom: 6px;
        }
        button:hover { background: var(--vscode-button-hoverBackground); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .snippet-btn {
            background: var(--vscode-secondaryButton-background);
            color: var(--vscode-secondaryButton-foreground);
            text-align: left;
            font-size: 11px;
        }
        .section {
            margin-bottom: 12px;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
        }
        .category { font-weight: bold; margin-top: 8px; }
        #result { font-weight: bold; margin: 6px 0 0; }
    </style>
</head>
<body>
    <div class="section">
        <h3>Live Tester</h3>
        <label for="pattern">Pattern</label>
        <input type="text" id="pattern" placeholder="Pattern (e.g. \\d+)">
        <label for="flags">Flags</label>
        <input type="text" id="flags" placeholder="Flags (e.g. im)">
        <label for="testString">Test String</label>
        <textarea id="testString" rows="3" placeholder="Test string..."></textarea>
        <button id="testBtn">Test Match</button>
        <p id="result"></p>
    </div>

    <div class="section">
        <h3>Snippet Library</h3>
        <label for="snippetLang">Snippet Language</label>
        <select id="snippetLang">
            <option value="">Choose language</option>
            <option value="javascript">JavaScript / TypeScript</option>
            <option value="python">Python</option>
            <option value="go">Go</option>
        </select>
        <label for="snippetOutput">Generated Regex</label>
        <textarea id="snippetOutput" rows="4" readonly placeholder="Choose a language, then click a snippet"></textarea>
        
        <div class="category">Validation</div>
        <button class="snippet-btn" data-snippet="email">📧 Email Address</button>
        <button class="snippet-btn" data-snippet="password">🔑 Password (Strong)</button>
        <button class="snippet-btn" data-snippet="ipv4">🌐 IPv4 Address</button>
        <button class="snippet-btn" data-snippet="hex-color">🎨 Hex Color</button>
        <button class="snippet-btn" data-snippet="uuid">🆔 UUID v4</button>
        <button class="snippet-btn" data-snippet="iso-date">📅 ISO Date (YYYY-MM-DD)</button>

        <div class="category">Extraction</div>
        <button class="snippet-btn" data-snippet="urls">🔗 Extract URLs</button>
        <button class="snippet-btn" data-snippet="price">💵 Extract Price Value</button>
        <button class="snippet-btn" data-snippet="quoted-text">💬 Extract Quoted Text</button>
        <button class="snippet-btn" data-snippet="domain">🌍 Extract Domain</button>
    </div>

    <script>
        const testBtn = document.getElementById('testBtn');
        const patternInput = document.getElementById('pattern');
        const flagsInput = document.getElementById('flags');
        const testStringInput = document.getElementById('testString');
        const resultDiv = document.getElementById('result');
        const snippetLangSelect = document.getElementById('snippetLang');
        const snippetOutput = document.getElementById('snippetOutput');
        const snippetButtons = document.querySelectorAll('.snippet-btn');

        const snippets = {
            email: { pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$' },
            password: { pattern: '^(?=.*[A-Za-z])(?=.*\\\\d)[A-Za-z\\\\d]{8,}$' },
            ipv4: { pattern: '^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$' },
            'hex-color': { pattern: '^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$' },
            uuid: { pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', flags: 'i' },
            'iso-date': { pattern: '^\\\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\\\d|3[01])$' },
            urls: { pattern: 'https?:\\\\/\\\\/(?:[-\\\\w.]|(?:%[\\\\da-fA-F]{2}))+' },
            price: { pattern: '\\\\d+(?:\\\\.\\\\d{1,2})?' },
            'quoted-text': { pattern: '(["\\\'])(?:(?=(\\\\\\\\?))\\\\2.)*?\\\\1' },
            domain: { pattern: 'https?:\\\\/\\\\/([^\\\\/]+)' }
        };

        function formatForLanguage(pattern, flags, lang) {
            if (lang === 'javascript') {
                return '/' + pattern + '/' + (flags || '');
            } else if (lang === 'python') {
                return 'r"' + pattern + '"' + (flags ? ' # flags: ' + flags : '');
            } else if (lang === 'go') {
                return '\`' + pattern + '\`' + (flags ? ' // flags: ' + flags : '');
            }
            return pattern;
        }

        testBtn.addEventListener('click', function() {
            const pattern = patternInput.value;
            const flags = flagsInput.value;
            const testStr = testStringInput.value;
            try {
                const regex = new RegExp(pattern, flags);
                const match = regex.test(testStr);
                resultDiv.textContent = match ? 'Match Found! ✅' : 'No Match ❌';
                resultDiv.style.color = match ? 'lightgreen' : 'salmon';
            } catch (e) {
                resultDiv.textContent = 'Error: ' + e.message;
                resultDiv.style.color = 'orange';
            }
        });

        snippetButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const lang = snippetLangSelect.value;
                if (!lang) {
                    snippetOutput.value = 'Choose a language first';
                    snippetOutput.style.color = 'orange';
                    return;
                }
                const snippetKey = btn.dataset.snippet;
                const snippet = snippets[snippetKey];
                if (!snippet) {
                    snippetOutput.value = 'Snippet not found';
                    return;
                }
                const output = formatForLanguage(snippet.pattern, snippet.flags || '', lang);
                snippetOutput.value = output;
                snippetOutput.style.color = 'lightgreen';
            });
        });

        snippetLangSelect.addEventListener('change', function() {
            if (!this.value) {
                snippetOutput.value = '';
            }
        });
    </script>
</body>
</html>`;
    }
}