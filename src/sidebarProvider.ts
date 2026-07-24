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
                body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-editor-foreground); font-size: 12px; }
                h3 { margin-top: 10px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 4px; }
                textarea, input { width: 100%; box-sizing: border-box; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 5px; margin-bottom: 6px; }
                button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 5px 10px; cursor: pointer; width: 100%; margin-bottom: 4px;}
                button:hover { background: var(--vscode-button-hoverBackground); }
                .snippet-btn { background: var(--vscode-secondaryButton-background); color: var(--vscode-secondaryButton-foreground); text-align: left; font-family: monospace; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .section { margin-bottom: 12px; }
                .category { font-weight: bold; margin-top: 8px; color: var(--vscode-textLink-foreground); }
            </style>
        </head>
        <body>
            <div class="section">
                <h3>Live Tester</h3>
                <input type="text" id="pattern" placeholder="Pattern (e.g. \\d+)">
                <textarea id="testString" rows="2" placeholder="Test string..."></textarea>
                <button onclick="testRegex()">Test Match</button>
                <p id="result" style="font-weight: bold; margin: 4px 0;"></p>
            </div>

            <div class="section">
                <h3>Snippet Library</h3>
                
                <div class="category">Validation</div>
                <button class="snippet-btn" title="Email" onclick="setPattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')">📧 Email Address</button>
                <button class="snippet-btn" title="Password" onclick="setPattern('^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$')">🔑 Password (Strong)</button>
                <button class="snippet-btn" title="IPv4" onclick="setPattern('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$')">🌐 IPv4 Address</button>
                <button class="snippet-btn" title="Hex Color" onclick="setPattern('^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$')">🎨 Hex Color</button>
                <button class="snippet-btn" title="UUID v4" onclick="setPattern('^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$-i')">🆔 UUID v4</button>
                <button class="snippet-btn" title="Date YYYY-MM-DD" onclick="setPattern('^\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])$')">📅 ISO Date (YYYY-MM-DD)</button>

                <div class="category">Extraction</div>
                <button class="snippet-btn" title="Extract URLs" onclick="setPattern('https?:\\/\\/(?:[-\\w.]|(?:%[\\da-fA-F]{2}))+')">🔗 Extract URLs</button>
                <button class="snippet-btn" title="Extract Prices" onclick="setPattern('\\d+(?:\\.\\d{1,2})?')">💵 Extract Price Value</button>
                <button class="snippet-btn" title="Extract Quotes" onclick="setPattern('(["\'])(?:(?=(\\\\?))\\2.)*?\\1')">💬 Extract Quoted Text</button>
                <button class="snippet-btn" title="Extract Domain" onclick="setPattern('https?:\\/\\/([^\\/]+)')">🌍 Extract Domain</button>
            </div>

            <script>
                function setPattern(pat) {
                    document.getElementById('pattern').value = pat;
                }
                function testRegex() {
                    const pat = document.getElementById('pattern').value;
                    const str = document.getElementById('testString').value;
                    try {
                        // Handle potential flags split if included
                        const regex = new RegExp(pat);
                        const match = regex.test(str);
                        document.getElementById('result').innerText = match ? "Match Found! ✅" : "No Match ❌";
                        document.getElementById('result').style.color = match ? "lightgreen" : "salmon";
                    } catch (e) {
                        document.getElementById('result').innerText = "Error: " + e.message;
                        document.getElementById('result').style.color = "orange";
                    }
                }
            </script>
        </body>
        </html>`;
    }
}