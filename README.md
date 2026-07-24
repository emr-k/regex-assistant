# Regex Assistant

Regex Assistant is a lightweight, zero-latency VS Code extension that breaks down regular expressions and helps you work with them faster. Hover over any regex in your code to see an instant explanation, test patterns in the built-in live tester, or generate snippets in JavaScript, Python, or Go.

## Why I Built This

Complex regex shouldn't interrupt your flow. When you're reading code and encounter an unfamiliar pattern, you shouldn't need to:
- Copy the regex to an external website
- Switch tabs back and forth
- Wait for pages to load

Regex Assistant keeps everything in your editor. It uses a local AST parser to break down expressions instantly and securely—no external API calls, no latency, 100% offline.

## Features

### 📖 Instant Hover Explanations
Hover over any regex literal to see exactly what it does. The extension breaks down anchors (`^`, `$`), character classes, quantifiers, groups, lookaheads, and more—all in plain English.

**Supports:**
- JavaScript / TypeScript regex literals: `/pattern/flags`
- Python raw strings: `r"pattern"`
- Go backtick strings: `` `pattern` ``

### 🧪 Live Regex Tester
Test your regex patterns directly in the sidebar without leaving VS Code. Type a pattern, add test strings, and see if they match instantly.

### 📚 Snippet Library
Pick from 10 pre-built regex patterns for common use cases:
- **Validation:** Email, strong passwords, IPv4 addresses, hex colors, UUIDs, ISO dates
- **Extraction:** URLs, prices, quoted text, domain names

Choose your target language (JavaScript, Python, or Go), click a snippet, and it's formatted and ready to copy.

### 🌍 Multi-Language Export
See how your regex should be written in different languages. When you hover over a regex, the tooltip shows equivalent syntax for Python and Go—so you can copy it to the right project without guessing the escape rules.

### ⚡ Blazing Fast
Everything runs locally with built-in caching for O(1) lookups. No waiting, no external services.

### 🔒 Privacy First
Your code never leaves your editor. 100% offline, no analytics, no external API calls.

## How to Use

### Hover Over a Regex
```javascript
const email = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                                    // ↑ Hover here to see the explanation
```

### Test a Pattern
1. Open the **Regex Assistant** sidebar (click the icon in the Activity Bar)
2. In the **Live Tester** section, enter your pattern and test string
3. Click "Test Match" to see if it matches

### Generate a Snippet
1. In the **Snippet Library** section, pick your target language (JavaScript, Python, or Go)
2. Click any snippet button
3. The formatted regex appears in the output area—ready to copy

## Supported Languages

The extension works with:
- JavaScript & TypeScript
- Python
- Go

## Example: Email Validation

In the sidebar, select JavaScript and click "Email Address":
```javascript
/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
```

Switch to Python:
```python
r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
```

Switch to Go:
```go
`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
```