import * as ts from 'typescript';
import * as vscode from 'vscode';

export type SupportedRegexLanguage = 'javascript' | 'typescript' | 'python' | 'go';

export interface RegexMatch {
	languageId: SupportedRegexLanguage;
	pattern: string;
	flags: string;
	literalText: string;
	sourceKind: 'javascript-regex' | 'python-string' | 'python-raw-string' | 'go-string' | 'go-raw-string';
}

export interface LanguageExportPreview {
	code: string;
	hint?: string;
}

export function getRegexMatchAtPosition(document: vscode.TextDocument, position: vscode.Position): RegexMatch | null {
	const languageId = normalizeLanguageId(document.languageId);
	if (!languageId) {
		return null;
	}

	const offset = document.offsetAt(position);
	const text = document.getText();

	if (languageId === 'javascript' || languageId === 'typescript') {
		return getJavaScriptRegexMatch(document.fileName, text, offset, languageId);
	}

	if (languageId === 'python') {
		return getStringLiteralMatch(text, offset, languageId, [
			{ sourceKind: 'python-raw-string', pattern: /\b[rR](['"])([\s\S]*?)\1/g },
			{ sourceKind: 'python-string', pattern: /(['"])(?:\\.|[^\\])*?\1/g },
		]);
	}

	if (languageId === 'go') {
		return getStringLiteralMatch(text, offset, languageId, [
			{ sourceKind: 'go-raw-string', pattern: /`[\s\S]*?`/g },
			{ sourceKind: 'go-string', pattern: /"(?:\\.|[^"\\])*?"/g },
		]);
	}

	return null;
}

export function formatRegexForLanguage(pattern: string, flags: string, targetLanguage: SupportedRegexLanguage): LanguageExportPreview {
	switch (targetLanguage) {
		case 'javascript':
		case 'typescript':
			return {
				code: buildJavaScriptRegexLiteral(pattern, flags),
				hint: flags ? `Flags remain on the trailing slash: /.../${flags}` : 'Use the native JavaScript/TypeScript regex literal form.',
			};
		case 'python': {
			const pythonPattern = renderPythonPattern(pattern);
			const pythonFlags = renderPythonFlags(flags);
			return {
				code: pythonFlags
					? `import re\npattern = re.compile(${pythonPattern}, ${pythonFlags})`
					: `import re\npattern = re.compile(${pythonPattern})`,
				hint: flags ? buildFlagHint(flags, 'Python') : 'Python uses raw strings for the pattern and re.compile for flag handling.',
			};
		}
		case 'go': {
			const goPattern = renderGoPattern(pattern, flags);
			return {
				code: `import "regexp"\npattern := regexp.MustCompile(${goPattern})`,
				hint: flags ? buildFlagHint(flags, 'Go') : 'Go uses backtick strings when possible; inline flags are prefixed inside the pattern.',
			};
		}
	}
}

export function buildJavaScriptRegexLiteral(pattern: string, flags: string): string {
	return `/${escapeRegexLiteralBody(pattern)}/${flags}`;
}

export function getLanguageDisplayName(languageId: string): string {
	switch (normalizeLanguageId(languageId)) {
		case 'javascript': return 'JavaScript';
		case 'typescript': return 'TypeScript';
		case 'python': return 'Python';
		case 'go': return 'Go';
		default: return languageId;
	}
}

export function normalizeLanguageId(languageId: string): SupportedRegexLanguage | null {
	switch (languageId.toLowerCase()) {
		case 'javascript':
		case 'javascriptreact':
			return 'javascript';
		case 'typescript':
		case 'typescriptreact':
			return 'typescript';
		case 'python':
			return 'python';
		case 'go':
			return 'go';
		default:
			return null;
	}
}

function getJavaScriptRegexMatch(fileName: string, text: string, offset: number, languageId: SupportedRegexLanguage): RegexMatch | null {
	const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
	let result: RegexMatch | null = null;

	function visit(node: ts.Node) {
		if (result) {
			return;
		}

		if (offset < node.getStart() || offset > node.getEnd()) {
			return;
		}

		if (ts.isRegularExpressionLiteral(node)) {
			const match = node.text.match(/^\/(.*)\/([a-z]*)$/i);
			if (match) {
				result = {
					languageId,
					pattern: match[1],
					flags: match[2],
					literalText: node.text,
					sourceKind: 'javascript-regex',
				};
			}
			return;
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return result;
}

function getStringLiteralMatch(
	text: string,
	offset: number,
	languageId: SupportedRegexLanguage,
	patterns: Array<{ sourceKind: RegexMatch['sourceKind']; pattern: RegExp }>,
): RegexMatch | null {
	for (const entry of patterns) {
		entry.pattern.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = entry.pattern.exec(text)) !== null) {
			const start = match.index;
			const end = start + match[0].length;
			if (offset < start || offset > end) {
				continue;
			}

			const literalText = match[0];
			let patternText = '';

			if (entry.sourceKind === 'python-raw-string') {
				patternText = match[2];
			} else if (entry.sourceKind === 'python-string') {
				patternText = decodeStringLiteral(literalText.slice(1, -1));
			} else if (entry.sourceKind === 'go-raw-string') {
				patternText = literalText.slice(1, -1);
			} else if (entry.sourceKind === 'go-string') {
				patternText = decodeStringLiteral(literalText.slice(1, -1));
			}

				return {
					languageId,
					pattern: patternText,
					flags: '',
					literalText,
					sourceKind: entry.sourceKind,
				};
		}
	}

	return null;
}

function renderPythonPattern(pattern: string): string {
	const rawPattern = choosePythonRawString(pattern);
	if (rawPattern) {
		return rawPattern;
	}

	return JSON.stringify(pattern);
}

function renderPythonFlags(flags: string): string {
	const translated = flags
		.split('')
		.map((flag) => pythonFlagMap[flag])
		.filter((flag): flag is string => Boolean(flag));

	return translated.join(' | ');
}

function renderGoPattern(pattern: string, flags: string): string {
	const prefix = renderGoInlineFlags(flags);
	if (!pattern.includes('`') && !pattern.includes('\n') && !pattern.includes('\r')) {
		return `\`${prefix}${pattern}\``;
	}

	return JSON.stringify(`${prefix}${pattern}`);
}

function renderGoInlineFlags(flags: string): string {
	const inlineFlags = flags
		.split('')
		.map((flag) => goInlineFlagMap[flag])
		.filter((flag): flag is string => Boolean(flag));

	if (!inlineFlags.length) {
		return '';
	}

	return `(?${inlineFlags.join('')})`;
}

function choosePythonRawString(pattern: string): string | null {
	if (pattern.includes('\n') || pattern.includes('\r') || pattern.endsWith('\\')) {
		return null;
	}

	if (!pattern.includes('"')) {
		return `r"${pattern}"`;
	}

	if (!pattern.includes("'")) {
		return `r'${pattern}'`;
	}

	return null;
}

function escapeRegexLiteralBody(pattern: string): string {
	return pattern
		.replace(/\\/g, '\\\\')
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n')
		.replace(/\//g, '\\/');
}

function decodeStringLiteral(value: string): string {
	let result = '';
	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		if (char !== '\\') {
			result += char;
			continue;
		}

		index += 1;
		if (index >= value.length) {
			result += '\\';
			break;
		}

		const escapeChar = value[index];
		switch (escapeChar) {
			case 'n': result += '\n'; break;
			case 'r': result += '\r'; break;
			case 't': result += '\t'; break;
			case 'b': result += '\b'; break;
			case 'f': result += '\f'; break;
			case 'v': result += '\v'; break;
			case '\\': result += '\\'; break;
			case '"': result += '"'; break;
			case "'": result += "'"; break;
			case 'x': {
				const hex = value.slice(index + 1, index + 3);
				if (/^[0-9a-fA-F]{2}$/.test(hex)) {
					result += String.fromCharCode(Number.parseInt(hex, 16));
					index += 2;
				} else {
					result += `\\${escapeChar}`;
				}
				break;
			}
			case 'u': {
				const hex = value.slice(index + 1, index + 5);
				if (/^[0-9a-fA-F]{4}$/.test(hex)) {
					result += String.fromCharCode(Number.parseInt(hex, 16));
					index += 4;
				} else {
					result += `\\${escapeChar}`;
				}
				break;
			}
			case 'U': {
				const hex = value.slice(index + 1, index + 9);
				if (/^[0-9a-fA-F]{8}$/.test(hex)) {
					result += String.fromCodePoint(Number.parseInt(hex, 16));
					index += 8;
				} else {
					result += `\\${escapeChar}`;
				}
				break;
			}
			default:
				result += escapeChar;
		}
	}

	return result;
}

function buildFlagHint(flags: string, targetLanguage: 'Python' | 'Go'): string {
	const notes: string[] = [];
	for (const flag of flags) {
		if (flag === 'g' || flag === 'y' || flag === 'd') {
			notes.push(`${flag} has no direct ${targetLanguage} regex flag equivalent`);
		}
	}

	return notes.join('; ');
}

const pythonFlagMap: Record<string, string> = {
	i: 're.IGNORECASE',
	m: 're.MULTILINE',
	s: 're.DOTALL',
};

const goInlineFlagMap: Record<string, string> = {
	i: 'i',
	m: 'm',
	s: 's',
};