import * as vscode from 'vscode';
import { RegexSidebarProvider } from './sidebarProvider';
import { buildJavaScriptRegexLiteral, formatRegexForLanguage, getLanguageDisplayName, getRegexMatchAtPosition, normalizeLanguageId } from './regexLanguage';
const regexpTree = require('regexp-tree');

// Cache to satisfy the <50ms latency constraint
const explanationCache = new Map<string, vscode.MarkdownString>();
const MAX_CACHE_SIZE = 200;

export function activate(context: vscode.ExtensionContext) {
    // 1. Register the Hover Provider
    const hoverProvider = vscode.languages.registerHoverProvider(
        ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'python', 'go'],
        {
            provideHover(document, position, token) {
                const regexLiteral = getRegexMatchAtPosition(document, position);
                if (!regexLiteral) { return null; }

                const sourceLanguage = normalizeLanguageId(document.languageId) ?? 'javascript';
                const parsedExpression = buildJavaScriptRegexLiteral(regexLiteral.pattern, regexLiteral.flags);
                const cacheKey = `${sourceLanguage}:${regexLiteral.sourceKind}:${parsedExpression}`;

                // Return from cache if it exists (O(1) lookup)
                if (explanationCache.has(cacheKey)) {
                    return new vscode.Hover(explanationCache.get(cacheKey)!);
                }

                try {
                    const ast = regexpTree.parse(parsedExpression);
                    const explanation = explainNode(ast.body);
                    
                    const markdown = new vscode.MarkdownString();
                    markdown.appendMarkdown(`### Regex Explanation\n\n`);
                    markdown.appendMarkdown(`**Detected syntax:** ${getLanguageDisplayName(document.languageId)} (${regexLiteral.sourceKind.replace(/-/g, ' ')})\n\n`);
                    markdown.appendMarkdown(explanation);

                    const pythonExport = formatRegexForLanguage(regexLiteral.pattern, regexLiteral.flags, 'python');
                    const goExport = formatRegexForLanguage(regexLiteral.pattern, regexLiteral.flags, 'go');

                    markdown.appendMarkdown(`\n\n---\n### Language Export\n`);
                    markdown.appendMarkdown(`\n**Python**\n\n`);
                    markdown.appendCodeblock(pythonExport.code, 'python');
                    if (pythonExport.hint) {
                        markdown.appendMarkdown(`\n_${pythonExport.hint}_`);
                    }

                    markdown.appendMarkdown(`\n\n**Go**\n\n`);
                    markdown.appendCodeblock(goExport.code, 'go');
                    if (goExport.hint) {
                        markdown.appendMarkdown(`\n_${goExport.hint}_`);
                    }
                    
                    // Manage Cache Size
                    if (explanationCache.size >= MAX_CACHE_SIZE) {
                        const firstKey = explanationCache.keys().next().value!;
                        explanationCache.delete(firstKey);
                    }
                    explanationCache.set(cacheKey, markdown);
                    
                    return new vscode.Hover(markdown);
                } catch (e) {
                    console.error("Regex Parsing Error: ", e);
                    return null;
                }
            }
        }
    );

    // 2. Register the Sidebar Webview Provider
    const sidebarProvider = new RegexSidebarProvider(context.extensionUri);
    const viewRegistration = vscode.window.registerWebviewViewProvider(
        RegexSidebarProvider.viewType,
        sidebarProvider
    );

    context.subscriptions.push(hoverProvider, viewRegistration);
}

function explainNode(node: any): string {
    if (!node) { return ''; }

    switch (node.type) {
        case 'Alternative':
            return node.expressions.map((expr: any) => explainNode(expr)).join('\n');
            
        case 'Disjunction':
            return `**Either:**\n* ${explainNode(node.left).replace(/^\* /, '')}\n**Or:**\n* ${explainNode(node.right).replace(/^\* /, '')}`;
            
        case 'Assertion':
            if (node.kind === '^') { return '* **Starts with** the beginning of the string.'; }
            if (node.kind === '$') { return '* **Ends with** the end of the string.'; }
            if (node.kind === '\\b') { return '* Matches a **word boundary**.'; }
            if (node.kind === 'Lookahead') {
                const ahead = explainNode(node.assertion).replace(/\n/g, '\n  ');
                return `* **${node.negative ? 'Negative' : 'Positive'} Lookahead** (must ${node.negative ? 'NOT ' : ''}be followed by):\n  ${ahead}`;
            }
            if (node.kind === 'Lookbehind') {
                const behind = explainNode(node.assertion).replace(/\n/g, '\n  ');
                return `* **${node.negative ? 'Negative' : 'Positive'} Lookbehind** (must ${node.negative ? 'NOT ' : ''}be preceded by):\n  ${behind}`;
            }
            return `* Assertion: ${node.kind}`;
            
        case 'Char':
            if (node.kind === 'meta') {
                if (node.value === '.') { return '* Matches **any single character**.'; }
                if (node.value === '\\w') { return '* Matches any **word character** (letter, number, or underscore).'; }
                if (node.value === '\\d') { return '* Matches any **digit** (0-9).'; }
                if (node.value === '\\s') { return '* Matches any **whitespace** character.'; }
            }
            return `* Matches the literal character \`${node.value}\`.`;
            
        case 'CharacterClass':
            const chars = node.expressions.map((expr: any) => {
                if (expr.type === 'ClassRange') {
                    return `\`${expr.from.value}\` to \`${expr.to.value}\``;
                }
                return `\`${expr.value}\``;
            }).join(', ');
            return `* Matches **${node.negative ? 'none' : 'any'}** of the following: ${chars}.`;
            
        case 'Repetition':
            const base = explainNode(node.expression).replace('* Matches ', '').replace('* ', ''); 
            let quantifier = '';
            if (node.quantifier.kind === '+') { quantifier = '**one or more times**'; }
            else if (node.quantifier.kind === '*') { quantifier = '**zero or more times**'; }
            else if (node.quantifier.kind === '?') { quantifier = '**zero or one time (optional)**'; }
            else if (node.quantifier.kind === 'Range') {
                if (node.quantifier.from === node.quantifier.to) { quantifier = `**exactly ${node.quantifier.from} times**`; }
                else if (!node.quantifier.to) { quantifier = `**${node.quantifier.from} or more times**`; }
                else { quantifier = `**between ${node.quantifier.from} and ${node.quantifier.to} times**`; }
            }
            return `* Matches ${base} ${quantifier}.`;
            
        case 'Group':
            const groupExp = explainNode(node.expression);
            if (node.capturing) {
                return `* **Capture Group:**\n  ${groupExp.replace(/\n/g, '\n  ')}`;
            }
            return `* **Non-capturing Group:**\n  ${groupExp.replace(/\n/g, '\n  ')}`;
            
        default:
            return `* Matches syntax: \`${node.type}\``;
    }
}

export function deactivate() {}