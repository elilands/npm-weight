# ⚖️ @elilands/npm-weight

[![npm version](https://img.shields.io/npm/v/@elilands/npm-weight?style=flat-square&color=cyan)](https://www.npmjs.com/package/@elilands/npm-weight)
[![npm downloads](https://img.shields.io/npm/dt/@elilands/npm-weight?style=flat-square&color=blue)](https://www.npmjs.com/package/@elilands/npm-weight)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> The elite CLI to calculate the real cost, weight, and health of your npm dependencies.

Ever wondered how much bloat you are actually shipping to your users? Not all dependencies are created equal. Some are lightweight and actively maintained, while others are massive, outdated, and silently killing your app's performance.

**npm-weight** scans your local `package.json`, bridges directly with the NPM Registry and Bundlephobia, and generates a visual dashboard of your project's health. It separates your client-side payload from your dev-tools, grades them with a strict Health Score, and even auto-updates outdated packages for you.

---

## ✨ Features

- **🧠 Contextual Health Scores:** Automatically grades your packages (A, B, C, F) based on their GZIP size and age. It smartly forgives `devDependencies` for being heavy, but strictly audits your `dependencies`.
- **🌐 Network Orchestration:** Fetches real-time data from NPM and Bundlephobia concurrently to give you the exact physical weight of your code.
- **🔧 Interactive Auto-Fix:** Detects outdated packages and interactively asks if you want to auto-update them to their latest versions using your native package manager.
- **🤖 CI/CD & GitHub PR Ready:** Export pure JSON for your pipelines or raw Markdown tables to paste directly into your Pull Request comments.
- **⚡ Zero Bloat:** Built with modern TypeScript and ESM. Fast, reliable, and strictly typed.

---

## 📦 Installation

You can run it directly using your favorite package manager without installing it permanently:

```bash
# Using NPM
npx @elilands/npm-weight analyze

# Using PNPM
pnpm dlx @elilands/npm-weight analyze

# Using Yarn
yarn dlx @elilands/npm-weight analyze
```

*Want to use it globally across all your projects?*

```bash
npm install -g @elilands/npm-weight
```

---

## 🚀 Usage

`npm-weight` is designed to give you maximum insights with zero configuration. Open your terminal in any project folder and run:

### 1. The Visual Dashboard (Standard Mode)
This scans your project, fetches network data, and renders a beautiful terminal UI with actionable insights.

```bash
npx @elilands/npm-weight analyze
# Or use the short alias:
npx @elilands/npm-weight a
```

### 2. GitHub PR Mode (Markdown)
Want to prove to your Tech Lead that your new dependency is lightweight? Use the `--md` flag to generate a clean Markdown table. Perfect for copying and pasting into GitHub Pull Requests.

```bash
npx @elilands/npm-weight a --md
```
*(Note: If using npm run locally during development, remember to pass the double dash: `npm run dev -- a --md`)*

### 3. Pipeline Mode (JSON)
Building an automated CI/CD pipeline? Extract the raw analytical data in strict JSON format.

```bash
npx @elilands/npm-weight a --json
```

---

## 🤝 Contributing

Found a bug or have an idea to make this better? PRs are always welcome! 

1. Clone the repo.
2. Run `npm install`.
3. Make your changes in the `src/` directory.
4. Run `npm run build` to compile the TypeScript.
5. Submit your PR!

## 📄 License
MIT License. See `package.json` for details. Built for developers, by developers.