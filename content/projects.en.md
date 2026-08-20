+++
title = "Projects"
template = "projects.html"
+++

A selection of my open-source projects, auto-updated from my [GitHub](https://github.com/maxgfr).

**📦 75 public repos · ⭐ 301 stars**

---

## 🪄 Agent skills

- **[skills](https://github.com/maxgfr/skills)** — The home for my agent skills — process skills, which change how an agent works rather than what it knows. Installable with one `npx skills add maxgfr/skills`, or as a Claude Code plugin. · [site](https://www.skills.sh/maxgfr/skills)
- **[ultradoc](https://github.com/maxgfr/ultradoc)** — Grounded Q&A + citation-checked reference docs for any OSS project, from its real source, issues & PRs.
- **[ultraindex](https://github.com/maxgfr/ultraindex)** — Indexes a whole repo into an AI-navigable encyclopedia (map + per-module entries + link-graph) for huge codebases.
- **[ultrasearch](https://github.com/maxgfr/ultrasearch)** — Keyless multi-backend web research → citation-checked, tiered Markdown/HTML report (5 modes + deep-research tier).
- **[ultrasec](https://github.com/maxgfr/ultrasec)** — Cross-file security-audit agent: source→sink taint + Trivy/Semgrep/gitleaks/osv, adversarially verified into a cited report.
- **[ultra11y](https://github.com/maxgfr/ultra11y)** — Audits HTML/CSS/JSX for RGAA 4.1.2 + WCAG 2.1/2.2 AA with a zero-dependency static engine + agent judgment.
- **[ultrai18n](https://github.com/maxgfr/ultrai18n)** — Finds every human-readable string in a repo, classifies it, translates it with cheap models and proves nothing was missed: zero-dependency engine, the model never opens a source file.
- **[ultraprospect](https://github.com/maxgfr/ultraprospect)** — Turns a place — a town, a street, a radius — into a prospect list you can defend: sweeps OpenStreetMap worldwide and whichever company register a country actually has, fuses them into one entity per company, enriches from each company's own site (openings read straight from the ATS APIs, no browser) and refuses to guess. France, the UK and Estonia are enumerated without any key — the UK from Companies House's monthly open data, Estonia from a register rebuilt daily; Germany's export names the HRB holder VIES will not disclose. Elsewhere each company is confirmed from the registration its own site must publish by law. An ambiguous place, an uncertain match, a partial sweep, an undated snapshot record or an unobserved contact all fail the run. Zero-dependency, no API keys.
- **[construct](https://github.com/maxgfr/construct)** — Turns a product idea into a grounded, buildable SRD/PRD suite (skills.sh agent skill).
- **[reconstruct](https://github.com/maxgfr/reconstruct)** — Analyzes any repo and generates reconstruction PRDs to rebuild it from scratch.
- **[ultraeval](https://github.com/maxgfr/ultraeval)** — Rigorously evaluates a skill or codebase → grounded (file:line) findings + a TDD fix backlog; zero-dep engine with analysis (hotspots, cycles, churn) and brainstorm.

---

## 🤖 AI & dev tooling

- **[feelc](https://github.com/maxgfr/feelc)** — AI-native DMN/FEEL business-rules engine in Go: an LLM writes the rules, the engine proves & runs them deterministically (WASM playground). · [demo](https://maxgfr.github.io/feelc/)
- **[codeindex](https://github.com/maxgfr/codeindex)** — Zero-dependency repo-indexing engine: symbols, imports, typed cross-file link-graph & analytics — one vendorable engine.mjs, CLI + MCP server included. · [demo](https://maxgfr.github.io/codeindex/)
- **[webindex](https://github.com/maxgfr/webindex)** — Zero-dependency web-retrieval engine: turns a URL or a file into clean, citable text — HTML, PDFs through a six-rung ladder ending in OCR, office documents — and serves it over MCP. One vendorable engine.mjs, CLI + MCP server included. The web-side companion to codeindex.
- **[conforme](https://github.com/maxgfr/conforme)** — Syncs your AI coding config (rules, skills, agents, MCP servers) across Claude Code, Cursor & more (Rust).
- **[secretgate](https://github.com/maxgfr/secretgate)** — Local secrets firewall for coding agents — redacts credentials in prompts, file reads & tool output before they reach the LLM (Claude Code, Codex, OpenCode). Deterministic hooks, no proxy.
- **[sift](https://github.com/maxgfr/sift)** — Tells you which quantization of an LLM fits and how fast it will run — before you download it. Reads real GGUF/safetensors headers over HTTP range requests, measures your machine and routes to an engine. No bundled model list (Rust).
- **[claudfeine](https://github.com/maxgfr/claudfeine)** — Runs Claude Code (and Codex) caffeinated — keeps the machine awake for exactly the session, cross-platform & zero-dep.
- **[claude-code-switch](https://github.com/maxgfr/claude-code-switch)** — Zero-dependency provider switching for Claude Code (Anthropic, OpenRouter, DeepSeek, Z.AI, Kimi, Qwen…).
- **[git-pilot](https://github.com/maxgfr/git-pilot)** — AI-powered git automation: smart commits, conflict resolution & auto-rebase (Claude/Codex/OpenAI/Gemini/Mistral). Pure Bash.
- **[git-recap](https://github.com/maxgfr/git-recap)** — Monthly commit-recap generator with AI summaries, bullet points and commit lists.
- **[llm-models](https://github.com/maxgfr/llm-models)** — Fetches the latest LLM models from the OpenRouter and models.dev APIs. · [npm](https://www.npmjs.com/package/llm-models)

---

## 🛠️ CLIs & system tools

- **[andro](https://github.com/maxgfr/andro)** — Run Android apps (phone & TV) from the macOS CLI on a disposable, self-contained emulator (Apple Silicon, HVF). (Rust)
- **[brutifi](https://github.com/maxgfr/brutifi)** — High-performance WiFi security-testing tool in Rust for educational and authorized audits.
- **[rshc](https://github.com/maxgfr/rshc)** — Rust reimplementation of SHC: encrypts shell scripts into compiled binaries.
- **[subtool](https://github.com/maxgfr/subtool)** — All-in-one subtitle CLI: download, translate, convert, sync, clean, merge, fix, extract & embed.
- **[snatch](https://github.com/maxgfr/snatch)** — Universal video downloader: yt-dlp first, CDP browser extraction fallback for stubborn sites.
- **[web-watcher](https://github.com/maxgfr/web-watcher)** — Bash watcher for APIs & websites with diff detection, thresholds and instant notifications.
- **[package-checker.sh](https://github.com/maxgfr/package-checker.sh)** — Scans node/bun/deno projects for vulnerable npm packages via OSV/GHSA (JSON/CSV/PURL/SBOM/SARIF/TRIVY).
- **[github-helpers](https://github.com/maxgfr/github-helpers)** — GitHub maintenance toolkit: bulk unstar, org clone, fork cleanup, repo audit and more.
- **[copyable-pdf](https://github.com/maxgfr/copyable-pdf)** — Converts scanned PDFs into searchable, copyable PDFs with Tesseract OCR (parallel).
- **[ratio-master](https://github.com/maxgfr/ratio-master)** — Torrent ratio tool that sends real HTTP announce requests to BitTorrent trackers.
- **[unsleep](https://github.com/maxgfr/unsleep)** — Tiny executable that prevents the machine from sleeping. · [npm](https://www.npmjs.com/package/unsleep)

---

## 🌐 Web apps & PWAs

- **[today](https://github.com/maxgfr/today)** — Offline-first, privacy-first daily to-do: nothing rolls over on its own — unfinished tasks wait for a decision the next morning, with their age shown. No account, no server, zero network requests, proven by a CSP and a build gate that fails CI. · [demo](https://maxgfr.github.io/today)
- **[nook](https://github.com/maxgfr/nook)** — Local-first, encrypted Notion in the browser: block editor, nested pages, wikilinks and backlinks, tags, ⌘K search, databases (table/board/calendar), version history, link map. Passphrase locking (Argon2id) that rotates the key, and a wipe you can verify. No network request is possible — CSP connect-src 'none', proven in CI. Offline PWA. · [demo](https://maxgfr.github.io/nook/)
- **[basilico](https://github.com/maxgfr/basilico)** — Local-first Pomodoro focus timer (PWA + Chrome extension): tasks, backlog & day plan, interruption counting, overtime and Flowtime, year heatmap, productive hours and estimate accuracy, JSON/CSV/Open Pomodoro export — no account, no server, no tracking. · [demo](https://maxgfr.github.io/basilico/)
- **[tick](https://github.com/maxgfr/tick)** — Local-first timer suite, entirely in the browser: multiple simultaneous countdowns with presets (egg, tea, laundry…), stopwatch with laps, HIIT/Tabata/EMOM intervals, metronome, world clock, duration calculator, alarms and a big fullscreen display — Web Audio beeps, notifications, drift-free system-clock math, keyboard shortcuts, offline PWA. No account, no server, no tracking. · [demo](https://maxgfr.github.io/tick/)
- **[bracketeer](https://github.com/maxgfr/bracketeer)** — Sport-agnostic tournament engine: brackets, Swiss, leagues, groups and Elo composed from six axes — no sport hardcoded. Entirely in-browser, no server or account: shareable link, P2P live sync, ICS export, printing and offline. · [demo](https://maxgfr.github.io/bracketeer)
- **[csv-ai-analyzer](https://github.com/maxgfr/csv-ai-analyzer)** — Self-hosted, browser-based AI CSV analyzer. · [demo](https://maxgfr.github.io/csv-ai-analyzer)
- **[db-schema-viewer](https://github.com/maxgfr/db-schema-viewer)** — Client-side DB-schema visualizer with AI analysis — upload SQL, visualize, share, export, no backend. · [demo](https://maxgfr.github.io/db-schema-viewer/)
- **[real-estate-calculator](https://github.com/maxgfr/real-estate-calculator)** — Real-estate ROI calculator for rental-property profitability. · [demo](https://maxgfr.github.io/real-estate-calculator)
- **[genpass](https://github.com/maxgfr/genpass)** — Client-side password generator + encrypted vault PWA: exact entropy, EFF passphrases, auto-locking AES-256-GCM vault (PBKDF2 600k), encrypted share links & QR — offline-first. · [demo](https://maxgfr.github.io/genpass/)
- **[loyalty-card-vault](https://github.com/maxgfr/loyalty-card-vault)** — Offline-first PWA for loyalty cards with encrypted storage and barcode scanning. · [demo](https://maxgfr.github.io/loyalty-card-vault/)
- **[omnilingo](https://github.com/maxgfr/omnilingo)** — Desktop language-learning app with multi-provider AI tutoring.
- **[feedreel](https://github.com/maxgfr/feedreel)** — Local-first daily short-video generator (Remotion) with per-platform captions + opt-in Shorts/TikTok/Reels publishing.
- **[leboncoin-cdp](https://github.com/maxgfr/leboncoin-cdp)** — Undetectable Leboncoin scraper via Chrome DevTools Protocol & Next.js data routes — no Puppeteer, zero bot detection.
- **[release-notes-finder](https://github.com/maxgfr/release-notes-finder)** — Find npm-package versions with their GitHub release notes. · [demo](https://maxgfr.github.io/release-notes-finder)
- **[kanbo](https://github.com/maxgfr/kanbo)** — Local-first project management: kanban, sprints and roadmap in your browser, with a git repo as the only backend. · [demo](https://maxgfr.github.io/kanbo/)
- **[unmark](https://github.com/maxgfr/unmark)** — Strips watermarks in the browser: invisible Unicode and steganography in text (the payload is decoded, not just deleted), C2PA/EXIF/XMP metadata across 11 formats, and visible image watermarks — a flat overlay is inverted exactly rather than painted over, with Telea or MI-GAN inpainting otherwise. Nothing is uploaded: connect-src 'self' alone, proven by a CI gate. · [demo](https://maxgfr.github.io/unmark/)

---

## 🎮 Games

- **[terravia](https://github.com/maxgfr/terravia)** — Creature-collecting RPG in a procedurally generated world. Runs entirely in the browser — no server, no account. The whole world rebuilds from a seed, so a save file is a few kilobytes of JSON you can export and re-import. · [demo](https://maxgfr.github.io/terravia)

---

## 📈 Trading & finance

- **[crible](https://github.com/maxgfr/crible)** — Self-hosted fundamental stock screener — 150k+ equities, zero API keys, transparent Piotroski/Altman/Beneish scores with full data provenance, DuckDB-fast. · [demo](https://maxgfr.github.io/crible/)
- **[binance-historical](https://github.com/maxgfr/binance-historical)** — Fetch historical klines from the Binance API. · [npm](https://www.npmjs.com/package/binance-historical)
- **[ai-strategy-backtester](https://github.com/maxgfr/ai-strategy-backtester)** — Describe a crypto strategy in plain English → JSON strategy, backtested over 50+ indicators with HTML reports.
- **[supertrend](https://github.com/maxgfr/supertrend)** — Implementation of the SuperTrend indicator. · [npm](https://www.npmjs.com/package/supertrend)

---

## 📦 npm libraries & utilities

- **[regressio](https://github.com/maxgfr/regressio)** — Zero-dep TS regression/classification/stats (OLS, Ridge, Lasso, Logistic, KNN, NN) with a Rust/WASM engine. · [npm](https://www.npmjs.com/package/regressio)
- **[similarities](https://github.com/maxgfr/similarities)** — Functions to find similarities between arrays. · [npm](https://www.npmjs.com/package/similarities)
- **[condorcet-winner](https://github.com/maxgfr/condorcet-winner)** — Condorcet vote algorithm in TypeScript. · [npm](https://www.npmjs.com/package/condorcet-winner)
- **[benford-law](https://github.com/maxgfr/benford-law)** — Check whether a dataset follows Benford's law. · [npm](https://www.npmjs.com/package/benford-law)
- **[gaussian-helper](https://github.com/maxgfr/gaussian-helper)** — Helpers for Gaussian calculations. · [npm](https://www.npmjs.com/package/gaussian-helper)
- **[node-simple-context](https://github.com/maxgfr/node-simple-context)** — Minimalist context for Node, inspired by the React Context API. · [npm](https://www.npmjs.com/package/node-simple-context)
- **[react-essentials-functions](https://github.com/maxgfr/react-essentials-functions)** — Useful hooks and components for React. · [npm](https://www.npmjs.com/package/react-essentials-functions)
- **[ts-essentials-functions](https://github.com/maxgfr/ts-essentials-functions)** — Essential zero-dependency TypeScript helpers. · [npm](https://www.npmjs.com/package/ts-essentials-functions)
- **[rn-date](https://github.com/maxgfr/rn-date)** — Zero-dependency fix for date-parsing issues in React Native on Android. · [npm](https://www.npmjs.com/package/rn-date)
- **[rn-simple-modal](https://github.com/maxgfr/rn-simple-modal)** — Lightweight, zero-dependency React Native modal (no animation). · [npm](https://www.npmjs.com/package/rn-simple-modal)
- **[huge-async-storage](https://github.com/maxgfr/huge-async-storage)** — async-storage wrapper for storing huge data in React Native. · [npm](https://www.npmjs.com/package/huge-async-storage)
- **[insta-who-unfollowed-me](https://github.com/maxgfr/insta-who-unfollowed-me)** — Track who unfollowed you on Instagram. · [npm](https://www.npmjs.com/package/insta-who-unfollowed-me)
- **[api-money-node-sdk](https://github.com/maxgfr/api-money-node-sdk)** — Unofficial Node SDK for api-money.com. · [npm](https://www.npmjs.com/package/api-money-node-sdk)

---

## ⚙️ GitHub Actions

- **[github-change-json](https://github.com/maxgfr/github-change-json)** — Action to change a value in a JSON file (e.g. package.json). · [marketplace](https://github.com/marketplace/actions/github-change-json)
- **[github-commit-push-file](https://github.com/maxgfr/github-commit-push-file)** — Action to commit and push a file to a repository. · [marketplace](https://github.com/marketplace/actions/github-commit-push-file)
- **[github-multi-deployments](https://github.com/maxgfr/github-multi-deployments)** — Action to manage deployment statuses across multiple environments. · [marketplace](https://github.com/marketplace/actions/github-multi-deployments)

---

## 🚀 Starters & templates

- **[typescript-swc-starter](https://github.com/maxgfr/typescript-swc-starter)** — Minimalist TypeScript + SWC starter emitting CJS and ESM packages. · [npm](https://www.npmjs.com/package/typescript-swc-starter)
- **[typescript-react-lib-swc](https://github.com/maxgfr/typescript-react-lib-swc)** — Minimalist TS + SWC starter for building React component libraries. · [demo](https://maxgfr.github.io/typescript-react-lib-swc)

---

## 🧩 Other

- **[awesome-stars](https://github.com/maxgfr/awesome-stars)** — Curated list of repositories I've liked on GitHub.
- **[homebrew-tap](https://github.com/maxgfr/homebrew-tap)** — Homebrew tap for my CLI tools (`brew install maxgfr/tap/…`).
- **[michel-golfier](https://github.com/maxgfr/michel-golfier)** — Source of a writer's website. · [site](https://www.michelgolfier.fr)

---

[See all my repositories on GitHub →](https://github.com/maxgfr)

