#!/usr/bin/env node
// Generates the bilingual "Projects" pages (content/projects.md FR +
// content/projects.en.md EN) for this Zola site from the live GitHub API, plus
// the leaner variant of that catalogue the CV page embeds (content/cv-projects.md
// + content/cv-projects.en.md), plus the structured data the alternate views
// read (data/projects.json — see buildData).
// Zero dependencies (Node 18+ global fetch). Driven by .github/projects.json.
// Run from .github/workflows/update-projects.yml or locally.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const USER = 'maxgfr';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

// SINGLE SOURCE OF TRUTH: the canonical (bilingual) projects config lives in the
// profile repo (maxgfr/maxgfr/.github/projects.json) — there is exactly one file
// to edit. We fetch it via the GitHub API. Override with
// PROJECTS_CONFIG_FILE=<path> for local testing.
const CONFIG_REPO = 'maxgfr/maxgfr';
const CONFIG_PATH = '.github/projects.json';

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': `${USER}-site-bot` };
if (token) headers.Authorization = `Bearer ${token}`;

let CONFIG; // populated by loadConfig() in main()

async function loadConfig() {
  if (process.env.PROJECTS_CONFIG_FILE) {
    return JSON.parse(readFileSync(process.env.PROJECTS_CONFIG_FILE, 'utf8'));
  }
  const url = `https://api.github.com/repos/${CONFIG_REPO}/contents/${CONFIG_PATH}`;
  const raw = { Accept: 'application/vnd.github.raw+json', 'User-Agent': `${USER}-site-bot` };
  // authenticated first (higher rate limit), then anonymous as a fallback
  const attempts = [{ ...raw, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, raw];
  for (const h of attempts) {
    const res = await fetch(url, { headers: h });
    if (res.ok) return JSON.parse(await res.text());
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`GET ${url} → ${res.status} ${await res.text()}`);
    }
  }
  throw new Error(`Could not read ${CONFIG_REPO}/${CONFIG_PATH} (auth + anonymous both failed)`);
}

const T = {
  fr: {
    title: 'Mes projets',
    intro: 'Une sélection de mes projets open source, mise à jour automatiquement depuis mon [GitHub](https://github.com/maxgfr).',
    stats: (n, s) => `**📦 ${n} dépôts publics · ⭐ ${s} étoiles**`,
    all: 'Voir tous mes dépôts sur GitHub →',
    labels: { npm: 'npm', marketplace: 'marketplace', demo: 'démo', site: 'site' },
    cvTitle: 'Projets open source',
    cvIntro: (n, s) =>
      `Mes ${n} dépôts publics, totalisant ${s} étoiles — [github.com/maxgfr](https://github.com/maxgfr).`,
  },
  en: {
    title: 'Projects',
    intro: 'A selection of my open-source projects, auto-updated from my [GitHub](https://github.com/maxgfr).',
    stats: (n, s) => `**📦 ${n} public repos · ⭐ ${s} stars**`,
    all: 'See all my repositories on GitHub →',
    labels: { npm: 'npm', marketplace: 'marketplace', demo: 'demo', site: 'site' },
    cvTitle: 'Open-source projects',
    cvIntro: (n, s) =>
      `My ${n} public repositories, totalling ${s} stars — [github.com/maxgfr](https://github.com/maxgfr).`,
  },
};

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function allOwnedRepos() {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const batch = await gh(`/users/${USER}/repos?per_page=100&page=${page}&type=owner&sort=full_name`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  const excluded = new Set([...(CONFIG.exclude || []), ...(CONFIG.excludeFromSite || [])]);
  return out.filter((r) => !r.private && !r.fork && !r.archived && !excluded.has(r.name));
}

function linkKey(url) {
  let host = '';
  try { host = new URL(url).host.toLowerCase(); } catch { return 'site'; }
  if (host.includes('npmjs.com')) return 'npm';
  if (host.includes('github.com') && url.includes('/marketplace/')) return 'marketplace';
  if (host === `${USER}.github.io`) return 'demo';
  return 'site';
}

function bullet(repo, lang) {
  const d = (CONFIG.descriptions || {})[repo.name];
  const desc = (d && d[lang]) || repo.description || (lang === 'fr' ? 'Sans description.' : 'No description.');
  let line = `- **[${repo.name}](${repo.html_url})** — ${desc.trim()}`;
  const hp = (repo.homepage || '').trim();
  if (hp) line += ` · [${T[lang].labels[linkKey(hp)]}](${hp})`;
  return line;
}

// THE canonical order, shared by /projects and by data/projects.json so the list
// and the alternate views can never disagree: categories in projects.json order,
// repos in the order listed inside each category (that ordering IS the curation),
// then anything uncategorized, by stars. `cat` is null for that trailing group.
function groupedRepos(repos) {
  const byName = new Map(repos.map((r) => [r.name, r]));
  const used = new Set();
  const groups = [];
  for (const cat of CONFIG.categories) {
    const picked = cat.repos.map((n) => byName.get(n)).filter(Boolean);
    if (!picked.length) continue;
    picked.forEach((r) => used.add(r.name));
    groups.push({ cat, picked });
  }
  const leftover = repos
    .filter((r) => !used.has(r.name))
    .sort((a, b) => b.stargazers_count - a.stargazers_count);
  if (leftover.length) groups.push({ cat: null, picked: leftover });
  return groups;
}

function groupTitle(cat, lang) {
  if (!cat) return CONFIG.fallback[lang];
  return lang === 'fr' ? cat.title_fr : cat.title_en;
}

function buildPage(repos, lang) {
  const t = T[lang];
  const sections = groupedRepos(repos).map(
    ({ cat, picked }) =>
      `## ${groupTitle(cat, lang)}\n\n${picked.map((r) => bullet(r, lang)).join('\n')}`
  );

  const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);
  // `template` is the hook the alternate views hang off: it lets
  // templates/projects.html add the view switcher above this generated body
  // without anyone ever hand-editing content/projects*.md.
  const fm = `+++\ntitle = "${t.title}"\ntemplate = "projects.html"\n+++`;
  const body = [
    t.intro,
    t.stats(repos.length, stars),
    '---',
    sections.join('\n\n---\n\n'),
    '---',
    `[${t.all}](https://github.com/${USER})`,
    '',
  ].join('\n\n');
  return `${fm}\n\n${body}`;
}

// Keep CV bullets short: a résumé is skimmed, not read, and the list is long —
// one repo per line keeps the section scannable instead of turning it into prose.
function clamp(text, max = 78) {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`;
}

// No per-repo star count: the list is ordered by theme, not by popularity, so a
// "⭐ 1" next to a good project only undersells it. The aggregate figure in the
// intro line carries that signal instead.
function cvBullet(repo, lang) {
  const d = (CONFIG.descriptions || {})[repo.name];
  const desc = (d && d[lang]) || repo.description || '';
  const line = `- **[${repo.name}](${repo.html_url})**`;
  return desc ? `${line} — ${clamp(desc)}` : line;
}

// The CV lists the whole catalogue: every public repo, grouped by theme in
// projects.json order — that ordering is the curation, so the CV leads with the
// same work the site does. Within a theme the most-starred come first, so a
// reader who stops after two lines has still seen the best of it. Repos in no
// category land in the fallback theme at the end, exactly as on /projects.
function cvSelection(repos, lang) {
  const byName = new Map(repos.map((r) => [r.name, r]));
  const used = new Set();
  const groups = [];
  for (const cat of CONFIG.categories) {
    const picked = cat.repos
      .map((n) => byName.get(n))
      .filter(Boolean)
      .sort((a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name));
    if (!picked.length) continue;
    picked.forEach((r) => used.add(r.name));
    groups.push({ title: lang === 'fr' ? cat.title_fr : cat.title_en, picked });
  }
  const leftover = repos
    .filter((r) => !used.has(r.name))
    .sort((a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name));
  if (leftover.length) groups.push({ title: CONFIG.fallback[lang], picked: leftover });
  return groups;
}

// The open-source section embedded by templates/cv.html. Generated here rather
// than curated by hand so it survives the daily refresh, and so it needs no
// change to maxgfr/maxgfr's projects.json (which lives in another repo).
// Category headings are `###` so they nest under the CV page's own `##`.
// Only the full CV renders this: the one-pager hides the section outright.
function buildCvPage(repos, lang) {
  const t = T[lang];
  const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);
  const sections = cvSelection(repos, lang).map(
    ({ title, picked }) => `### ${title}\n\n${picked.map((r) => cvBullet(r, lang)).join('\n')}`
  );
  const fm = `+++\ntitle = "${t.cvTitle}"\n+++`;
  const body = [t.cvIntro(repos.length, stars), sections.join('\n\n'), ''].join('\n\n');
  return `${fm}\n\n${body}`;
}

// ───────────────────────────── data/projects.json ─────────────────────────────
// The alternate views (/projects-cards, -dex, -timeline, -shell) need structure,
// not prose, so they read this file at build time via Zola's load_data(). Two
// rules govern everything below.
//
//  1. NOTHING VOLATILE. This file is committed and the cron runs nightly, so any
//     field that changes on its own churns the repo and triggers a pointless
//     deploy every morning. Dates are therefore rounded to the month, and
//     watchers/open-issues counts are left out entirely.
//  2. NOTHING RANDOM. Every derived attribute — sprite, HP, level, rarity — is a
//     pure function of data we already have. A sprite reshuffling itself on each
//     build would be unreadable in a diff.
//
// Colours live in static/css/projects-dex.css, never here: this file emits type
// NAMES so the palette stays a styling concern.

function ym(iso) {
  return typeof iso === 'string' ? iso.slice(0, 7) : null;
}

function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

const clampNum = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// FNV-1a: tiny, dependency-free, and above all STABLE across Node versions —
// which a hash built on JSON key order or Math.random would not be.
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// mulberry32, seeded from the repo name: same name → same sprite, for ever.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPRITE = 12;

// Three hand-drawn silhouettes, LEFT HALF ONLY (5 columns; column 4 sits against
// the mirror axis). 'x' always fills, 'o' fills only when the hash says so, '.'
// never fills. `eyes` and `mouth` are the rows carved back out to make a face.
//
// Hand-drawn on purpose. Symmetric noise was the first attempt and it came out as
// confetti — every sprite averaged 21 lit pixels scattered across the frame, with
// empty middles and lit corners. A fixed silhouette is what makes 69 different
// sprites all read as creatures; the hash then varies ears, arms, tails, belly and
// shading, which is plenty of variety without ever risking an unreadable one.
const SILHOUETTES = [
  {
    // round, big ears
    rows: ['..o...', '..oxx.', '..xxxx', '.xxxxx', '.xxxxx', '.xxxxx', '..xxxx', '.oxxxx', '.oxxxx', '..xxxx', '..xxxo', '..xx..'],
    eyes: 4,
    mouth: 6,
  },
  {
    // tall ears
    rows: ['...ox.', '...xx.', '...xx.', '..xxxx', '.xxxxx', '.xxxxx', '..xxxx', '..xxxx', '.oxxxx', '..xxxx', '..xxxo', '..xo..'],
    eyes: 4,
    mouth: 6,
  },
  {
    // wide and squat
    rows: ['......', '......', '..oxxx', '.xxxxx', 'xxxxxx', 'xxxxxx', '.xxxxx', 'oxxxxx', 'xxxxxx', '.xxxxx', '..xxxo', '.xx.x.'],
    eyes: 4,
    mouth: 6,
  },
  {
    // slime, no neck
    rows: ['......', '......', '......', '...oxx', '..xxxx', '.xxxxx', '.xxxxx', 'xxxxxx', 'xxxxxx', 'xxxxxx', 'xxxxxx', '.xxxxo'],
    eyes: 5,
    mouth: 7,
  },
  {
    // serpentine, narrow
    rows: ['...ox.', '...xx.', '..xxx.', '..xxxx', '..xxxx', '..xxxx', '...xxx', '...xxx', '..oxxx', '...xxx', '...xxo', '...xo.'],
    eyes: 4,
    mouth: 6,
  },
  {
    // winged
    rows: ['......', '...oxx', '..xxxx', '.xxxxx', '.xxxxx', 'xxxxxx', 'oxxxxx', 'oxxxxx', '..xxxx', '..xxxx', '..xxxo', '.xxo..'],
    eyes: 4,
    mouth: 6,
  },
  {
    // big head, small body
    rows: ['......', '..oxxx', '.xxxxx', 'xxxxxx', 'xxxxxx', 'xxxxxx', '.xxxxx', '..xxxx', '...xxx', '..oxxx', '...xxx', '..xx..'],
    eyes: 4,
    mouth: 6,
  },
  {
    // spiky crest
    rows: ['..o.o.', '...xx.', '..xxxx', '..xxxx', '.xxxxx', '.xxxxx', '..xxxx', '.oxxxx', '..xxxx', '.oxxxx', '..xxxo', '.xx.x.'],
    eyes: 4,
    mouth: 6,
  },
  {
    // long neck
    rows: ['...oxx', '...xxx', '...xxx', '....xx', '....xx', '...xxx', '..xxxx', '.xxxxx', '.xxxxx', '..xxxx', '..xxxo', '..xx..'],
    eyes: 2,
    mouth: 3,
  },
  {
    // stocky, short legs
    rows: ['......', '..oxxx', '.xxxxx', '.xxxxx', 'xxxxxx', 'xxxxxx', 'xxxxxx', 'oxxxxx', 'xxxxxx', 'xxxxxx', '.xxxxo', '.x..x.'],
    eyes: 4,
    mouth: 6,
  },
  {
    // twin antennae
    rows: ['.o..o.', '..x.x.', '..xxx.', '..xxxx', '.xxxxx', '.xxxxx', '..xxxx', '..xxxx', '.oxxxx', '..xxxx', '..xxxo', '.xx.x.'],
    eyes: 4,
    mouth: 6,
  },
  {
    // hunched, broad shoulders
    rows: ['......', '...oxx', '..xxxx', '..xxxx', '.xxxxx', 'xxxxxx', 'xxxxxx', '.xxxxx', '..xxxx', '..xxxx', '.oxxxo', '.xx.x.'],
    eyes: 4,
    mouth: 6,
  },
];

// Decorative markings, applied before the face is carved so eyes and mouth always
// win. Coordinates are [x, y] in the left half and get mirrored like everything
// else; `add` means the marking may light a cell the silhouette left empty (a horn
// changes the outline, which is the point). Six silhouettes × four optional cells ×
// six markings is what pushes the catalogue past one distinct sprite per repo.
const MARKINGS = [
  null,
  { cells: [[5, 0]], shade: 1, add: true }, // horn
  { cells: [[5, 2]], shade: 1 }, // forehead blaze
  { cells: [[5, 7], [5, 8]], shade: 3 }, // chest stripe
  { cells: [[1, 6], [1, 7]], shade: 3 }, // flank patch
  { cells: [[4, 10], [5, 10]], shade: 1 }, // pale belly band
  { cells: [[2, 1], [2, 2]], shade: 3 }, // dark brow
  { cells: [[5, 5], [5, 6]], shade: 1 }, // pale bib
  { cells: [[1, 9], [2, 9]], shade: 1 }, // pale hocks
  { cells: [[5, 3], [4, 4]], shade: 3 }, // cheek slash
];

// A 10×10 creature. Returns one SVG path per shade (1..3 = the type's
// light/base/dark) so the template emits three <path>s and CSS owns the colours.
function spritePaths(name) {
  const half = SPRITE / 2;
  const hash = fnv1a(name);
  const rand = seeded(hash);
  const shape = SILHOUETTES[hash % SILHOUETTES.length];
  const grid = Array.from({ length: SPRITE }, () => new Array(SPRITE).fill(0));

  // Light from the top: a fixed three-band gradient, never hashed. Randomising the
  // shading is what makes pixel art look broken — the light source has to hold
  // still across all 69 sprites.
  const shadeFor = (y) => (y <= 3 ? 1 : y <= 8 ? 2 : 3);
  const belly = hash % 3 !== 0; // lighter patch on the torso, on for two in three

  for (let y = 0; y < SPRITE; y++) {
    for (let x = 0; x < half; x++) {
      const cell = shape.rows[y][x];
      if (cell === '.') continue;
      if (cell === 'o' && rand() < 0.45) continue;
      let shade = shadeFor(y);
      if (belly && y >= 6 && y <= 9 && x >= 4) shade = Math.max(1, shade - 1);
      grid[y][x] = shade;
      grid[y][SPRITE - 1 - x] = shade;
    }
  }

  const marking = MARKINGS[fnv1a(`${name}:mark`) % MARKINGS.length];
  if (marking) {
    for (const [x, y] of marking.cells) {
      if (!marking.add && !grid[y][x]) continue;
      grid[y][x] = marking.shade;
      grid[y][SPRITE - 1 - x] = marking.shade;
    }
  }

  // Carve the face back out. Two eyes always, and a mouth two pixels wide astride
  // the axis, so every sprite has something to look back at you with.
  //
  // The eyes get a hashed height (one or two pixels tall) purely for entropy: with
  // a single eye style, two of seventy repos produced a byte-identical sprite AND
  // the same type, so two cards in the binder were indistinguishable. Salted
  // separately from the silhouette so it varies independently of it.
  const tallEyes = fnv1a(`${name}:eye`) % 2 === 0;
  for (const eyeX of [3, SPRITE - 1 - 3]) {
    grid[shape.eyes][eyeX] = 0;
    if (tallEyes && shape.eyes + 1 < SPRITE) grid[shape.eyes + 1][eyeX] = 0;
  }
  grid[shape.mouth][half - 1] = 0;
  grid[shape.mouth][half] = 0;

  // Horizontal run-length encoding: ~3 short paths instead of ~50 <rect>s.
  return [1, 2, 3].map((shade) => {
    let d = '';
    for (let y = 0; y < SPRITE; y++) {
      let x = 0;
      while (x < SPRITE) {
        if (grid[y][x] !== shade) {
          x++;
          continue;
        }
        let len = 0;
        while (x + len < SPRITE && grid[y][x + len] === shade) len++;
        d += `M${x} ${y}h${len}v1h-${len}z`;
        x += len;
      }
    }
    return d;
  });
}

// Type from the language. This is the FALLBACK, and also the secondary type — see
// pokemon() for why it is not the primary one.
// Anything unlisted → normal.
const TYPE_BY_LANGUAGE = {
  TypeScript: 'water',
  JavaScript: 'electric',
  Rust: 'fire',
  Go: 'ice',
  Python: 'grass',
  Shell: 'steel',
  Dockerfile: 'steel',
  Makefile: 'steel',
  Nix: 'steel',
  Java: 'fighting',
  Kotlin: 'dragon',
  Swift: 'flying',
  'Objective-C': 'flying',
  C: 'rock',
  'C++': 'rock',
  'C#': 'rock',
  Ruby: 'poison',
  PHP: 'ghost',
  Solidity: 'ghost',
  HTML: 'ground',
  CSS: 'fairy',
  SCSS: 'fairy',
  Vue: 'grass',
  Svelte: 'fire',
  Lua: 'bug',
  Zig: 'fire',
  Elixir: 'psychic',
  Haskell: 'psychic',
  Jupyter: 'psychic',
};

// Type from what the project DOES. FIRST MATCH WINS, and the order below is the
// whole design: it runs from the most DEFINING topic a repo can carry to the most
// generic, so the topic that actually characterises the project decides its type.
//
// Two earlier versions were wrong in opposite directions:
//
//  - Unordered, first match wins: `ai`/`claude` sit on 24 repos and appeared early,
//    so a third of the catalogue collapsed onto psychic.
//  - Every match a candidate, one picked by hash: varied, but meaningless. ultrasec
//    — a security auditor — came out Dragon, and its printed weakness said Ice.
//    Variety is worthless if the card stops describing the project.
//
// Ordering fixes both without randomness: `appsec` beats `agent-skill`, so ultrasec
// is Dark; `ai` is near the bottom, so it only decides when nothing more specific
// applies. The mapping itself is meant to be guessable — security is Dark, tests are
// Bug, docs are Rock, scraping is Ghost, mobile is Flying, games are Dragon.
const TYPE_BY_TOPIC = [
  // --- what the project is ABOUT: the most defining signal there is -----------
  [/^(security|secrets|secret|encryption|crypto|cryptography|privacy|vulnerability|pentest|appsec|no-tracking|ai-safety)/, 'dark'],
  [/^(trading|finance|stocks|stock-screener|screener|backtest|binance|investing|fundamental-analysis|piotroski)/, 'ground'],
  [/^(game|browser-game|html5-game|rpg|roguelike|monster-taming|creature-collector|pixel-art|turn-based-combat)/, 'dragon'],
  [/^(scraper|scraping|proxy|stealth|undetectable|puppeteer|playwright|devtools|cdp|instagram|private-api|unfollow)/, 'ghost'],
  [/^(test|tests|testing|lint|linter|debug|coverage|a11y|accessibility|wcag|rgaa|audit)/, 'bug'],
  [/^(algorithm|algorithms|math|maths|statistics|statistical|gaussian|pearson|benford|combinatorics|distribution|mean|standard-deviation|entropy)/, 'ice'],
  [/^(machine-learning|neural-network|knn|regression|linear-regression|logistic-regression|lasso|ols|classification)/, 'psychic'],
  [/^(database|sql|duckdb|postgres|sqlite|dataset|csv|json|yaml|toml)/, 'poison'],
  [/^(docs|documentation|markdown|zola|blog|readme|changelog|release-notes)/, 'rock'],
  [/^(condorcet|vote|voting|election|tournament|bracket|brackets|elo|sport)/, 'fighting'],
  // Added after three consecutive Combat cards (ultrai18n, construct, reconstruct):
  // all three fell through to the generic `cli` rule because nothing described what
  // they actually do. `search` also rescues ultrasearch, which was Steel by way of
  // `zero-dependencies` — a poor label for a web-search engine.
  [/^(search|web-search|serp|research|deep-research|literature-review|rag|citations)/, 'psychic'],
  [/^(i18n|internationalization|localization|l10n|translation|locale)/, 'fairy'],
  [/^(prd|spec|specs|requirements|product-management|greenfield|roadmap)/, 'rock'],
  [/^(code-generation|codegen|scaffold|scaffolding|generator|codemod)/, 'steel'],
  // --- what shape it takes ----------------------------------------------------
  // Mobile outranks date/time on purpose: rn-date is a React Native library that
  // happens to parse dates, and "Vol" describes it better than "Roche".
  [/^(react-native|android|ios|mobile|expo)$/, 'flying'],
  [/^(date|time|calendar|timezone|duration)/, 'rock'],
  [/^(github-pages|pages|deploy|deployment|hosting|serverless|edge|vercel|netlify)/, 'electric'],
  [/^(local-first|offline-first|no-backend|self-hosted|indexeddb|storage|cache|sync)/, 'grass'],
  [/^(github-action|github-actions|actions|ci|cd|devops|automation|bundler|swc|esbuild)/, 'steel'],
  [/^(cli|tui|terminal|command-line|shell|bash|zsh|homebrew|brew)$/, 'fighting'],
  [/^(pwa|web|webapp|frontend|ui|ux|css|design|nextjs|vue|svelte|astro|react|hooks|component|components)/, 'fairy'],
  [/^(async|promise|concurrency|async-hooks|async-local-storage|context|worker|queue)/, 'flying'],
  [/^(framework|engine|monorepo|platform|orchestration|compiler|parser|git|commit|push|branch|merge|rebase)/, 'dragon'],
  // --- generic ecosystem signals: only decide when nothing above applied ------
  [/^(ai|llm|gpt|prompt|prompt-engineering|inference|embedding|ai-agent|ai-agents|agent|agents|agent-skill|agent-skills|agents-md|skill|skills|claude|claude-code|anthropic|openai|codex|copilot|cursor|mcp)/, 'psychic'],
  [/^(rust|performance|benchmark|apple-silicon|native|wasm)/, 'fire'],
  [/^(zero-dependency|zero-dependencies|minimal|minimalist|lightweight)/, 'steel'],
  [/^(typescript|types|type-safe|npm|node|nodejs|bun|deno|library|lib|sdk|api|javascript|esm|cjs)$/, 'water'],
];

const WEAKNESS = {
  normal: 'fighting',
  fire: 'water',
  water: 'grass',
  electric: 'ground',
  grass: 'fire',
  ice: 'fire',
  fighting: 'psychic',
  poison: 'psychic',
  ground: 'water',
  flying: 'electric',
  psychic: 'dark',
  bug: 'flying',
  rock: 'water',
  ghost: 'dark',
  dragon: 'ice',
  dark: 'fighting',
  steel: 'fire',
  fairy: 'steel',
};

// Fixed thresholds, deliberately not percentiles: with percentiles one repo
// gaining a single star would reshuffle the rarity of every other repo, and the
// nightly diff would be unreadable.
function rarity(stars) {
  if (stars >= 30) return 'holo';
  if (stars >= 10) return 'rare';
  if (stars >= 2) return 'uncommon';
  return 'common';
}

// `descLen` is the length of the repo's curated English description — a genuine
// proxy for how much there is to a project, and the only signal besides age that
// varies across the ~42 repos created this year with no stars yet. Without it, HP
// and level were flat: 55 of 70 cards read "30 PV" or "40 PV", and every recent
// repo was "niv 3", so the numbers said nothing and the cards felt interchangeable.
function pokemon(repo, now, topicFreq, descLen) {
  const topics = repo.topics || [];

  // The PRIMARY type comes from what the project does, not from what it is written
  // in — and the card's whole colour scheme follows it.
  //
  // Language first was the obvious reading and measurably too uniform: 36 of 70
  // repos are TypeScript, so half the binder came out one shade of blue. The
  // language stays on the card as the secondary type and spelled out in full.
  //
  // The winner is decided by TYPE_BY_TOPIC's order, not by the order this repo
  // happens to list its topics in — otherwise two repos with the same topics in a
  // different order would get different types. See that table for the ordering.
  const langType = TYPE_BY_LANGUAGE[repo.language] || 'normal';
  let topicType = null;
  for (const [re, type] of TYPE_BY_TOPIC) {
    if (topics.some((topic) => re.test(topic))) {
      topicType = type;
      break;
    }
  }
  const type1 = topicType || langType;
  const type2 = langType !== type1 ? langType : null;

  const created = new Date(repo.created_at);
  const months = Math.max(
    0,
    (now.getUTCFullYear() - created.getUTCFullYear()) * 12 + (now.getUTCMonth() - created.getUTCMonth())
  );

  // Attacks are the repo's own topics, picked RAREST FIRST across the whole
  // catalogue. Taking the first two alphabetically stamped "agent skill" and "ai
  // agent" onto most of the agent-skills family, so nine cards listed the same two
  // moves; the rarest topics are the ones that actually distinguish a repo, which
  // makes the cards both more varied and more informative.
  // Damage is mostly hashed from the move name: deriving it from stars or forks
  // alone stamped a flat "10" on the ~45 repos that have neither.
  const distinctive = topics
    .slice()
    .sort((a, b) => (topicFreq.get(a) || 0) - (topicFreq.get(b) || 0) || a.localeCompare(b));
  const moves = (distinctive.length ? distinctive.slice(0, 2) : [repo.language || 'commit']).map((name) => ({
    name: String(name).replace(/-/g, ' '),
    dmg: clampNum(
      10 + (fnv1a(`${repo.name}:${name}`) % 6) * 10 + Math.min(repo.stargazers_count, 3) * 10,
      10,
      90
    ),
  }));

  return {
    type1,
    type2,
    // Stars dominate, so a popular repo still gets the biggest number, but forks,
    // topic count and description length keep the rest from collapsing onto one
    // value. Multiples of ten, because that is what a card prints.
    // Measured over the catalogue: 13 distinct values, none on more than 16 cards
    // (was 9 values with 32 cards sharing one).
    hp: clampNum(
      Math.round(
        (10 + repo.stargazers_count * 10 + repo.forks_count * 10 + topics.length * 5 + descLen / 3) / 10
      ) * 10,
      30,
      250
    ),
    // Age still leads — a level is meant to read as maturity — but alone it made
    // every 2026 repo the same level. 30 distinct values, none on more than 7 cards.
    level: clampNum(
      Math.round(months * 0.7 + repo.stargazers_count * 1.5 + repo.forks_count * 2 + topics.length + descLen / 12),
      1,
      100
    ),
    rarity: rarity(repo.stargazers_count),
    weakness: WEAKNESS[type1],
    moves,
    sprite: spritePaths(repo.name),
  };
}

function buildData(repos, now) {
  const groups = groupedRepos(repos);
  // Slugs become anchor ids, so they have to be unique. projects.json already
  // ships a category called "Other" and the fallback group would collide with it
  // if either were hardcoded — hence slugify-then-dedupe.
  const seen = new Set();
  const categories = groups.map(({ cat }) => {
    const base = slugify(groupTitle(cat, 'en')) || 'group';
    let slug = base;
    for (let n = 2; seen.has(slug); n++) slug = `${base}-${n}`;
    seen.add(slug);
    return { fr: groupTitle(cat, 'fr'), en: groupTitle(cat, 'en'), slug };
  });

  // How common each topic is across the catalogue — pokemon() uses it to pick the
  // rarest, i.e. most distinguishing, topics as a repo's attacks.
  const topicFreq = new Map();
  for (const { picked } of groups) {
    for (const repo of picked) for (const t of repo.topics || []) topicFreq.set(t, (topicFreq.get(t) || 0) + 1);
  }

  const out = [];
  groups.forEach(({ picked }, catIndex) => {
    for (const repo of picked) {
      const d = (CONFIG.descriptions || {})[repo.name] || {};
      const home = (repo.homepage || '').trim();
      const descEn = (d.en || repo.description || 'No description.').trim();
      out.push({
        name: repo.name,
        url: repo.html_url,
        home: home || null,
        homeLabel: home ? { fr: T.fr.labels[linkKey(home)], en: T.en.labels[linkKey(home)] } : null,
        desc: {
          fr: (d.fr || repo.description || 'Sans description.').trim(),
          en: descEn,
        },
        cat: catIndex,
        dex: out.length + 1,
        // Zero-padded here because Tera v2 has no padStart and the dex number is
        // meant to read as "#007", not "#7".
        dexLabel: String(out.length + 1).padStart(3, '0'),
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language || null,
        // Capped at 8: the views show at most four, and the full ~16 would triple
        // this file for nothing.
        topics: (repo.topics || []).slice(0, 8),
        created: ym(repo.created_at),
        pushed: ym(repo.pushed_at),
        license: (repo.license && repo.license.spdx_id !== 'NOASSERTION' && repo.license.spdx_id) || null,
        poke: pokemon(repo, now, topicFreq, descEn.length),
      });
    }
  });

  // Pre-aggregated for the filter control on /projects-cards. Built here, not in
  // the template, because Tera v2 dropped both macros and the `concat` filter, so
  // "collect the distinct values" is genuinely awkward in a template — and doing
  // it here means the dropdown can never offer a language no repo actually uses.
  const counts = new Map();
  for (const r of out) if (r.language) counts.set(r.language, (counts.get(r.language) || 0) + 1);
  const languages = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  // Chronological index for /projects-timeline, grouped by creation year. Indices
  // into `repos`, not copies: the timeline wants the same records in a different
  // order, and duplicating seventy objects would double the file for nothing.
  const byYear = new Map();
  out.forEach((repo, i) => {
    const year = (repo.created || '????').slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(i);
  });
  const timeline = [...byYear.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, indices]) => ({
      year,
      repos: indices.sort(
        (a, b) =>
          (out[a].created || '').localeCompare(out[b].created || '') ||
          out[a].name.localeCompare(out[b].name)
      ),
    }));

  return {
    generated: ym(now.toISOString()),
    totals: { repos: repos.length, stars: repos.reduce((a, r) => a + r.stargazers_count, 0) },
    languages,
    categories,
    timeline,
    repos: out,
  };
}

async function main() {
  CONFIG = await loadConfig();
  const repos = await allOwnedRepos();
  writeFileSync(join(REPO_ROOT, 'content', 'projects.md'), buildPage(repos, 'fr'));
  writeFileSync(join(REPO_ROOT, 'content', 'projects.en.md'), buildPage(repos, 'en'));
  writeFileSync(join(REPO_ROOT, 'content', 'cv-projects.md'), buildCvPage(repos, 'fr'));
  writeFileSync(join(REPO_ROOT, 'content', 'cv-projects.en.md'), buildCvPage(repos, 'en'));

  // Read the clock once, so a run straddling midnight on the 1st cannot give two
  // repos levels computed against different months.
  const now = new Date();
  mkdirSync(join(REPO_ROOT, 'data'), { recursive: true });
  writeFileSync(
    join(REPO_ROOT, 'data', 'projects.json'),
    `${JSON.stringify(buildData(repos, now), null, 2)}\n`
  );

  const src = process.env.PROJECTS_CONFIG_FILE || `${CONFIG_REPO}/${CONFIG_PATH}`;
  console.log(`Generated projects pages: ${repos.length} repos, CV + data included (config: ${src}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
