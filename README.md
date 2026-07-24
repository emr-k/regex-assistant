# Regex Helper

Regex Hover is a lightweight, zero-latency VS Code extension that translates regular expressions into plain English directly inside your editor. Just rest your mouse over any regex literal, and see a clear breakdown instantly.

## Why I Built This

Reading complex regular expressions usually means copying the string, opening a browser tab, pasting it into a tester, and context-switching back. That breaks your flow. 

This extension uses a local Abstract Syntax Tree (AST) parser to break down expressions locally in milliseconds—completely offline, with no external API calls or latency.

## Features

- **Instant Hover Tooltips:** Hover over any JavaScript or TypeScript regex literal to view its structure.
- **Deep Translation:** Explains anchors (`^`, `$`), character classes, repetition ranges, quantifiers, groups, and lookaheads.
- **Blazing Fast:** Powered by local AST parsing with built-in caching for seamless $O(1)$ performance.
- **Privacy First:** 100% offline. Your code never leaves your editor.

## Supported Expressions

Handles standard JS/TS regular expression literals:
```javascript
const email = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const password = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;