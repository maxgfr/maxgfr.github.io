#!/usr/bin/env node
// Generates the bilingual "Projects" pages (content/projects.md FR +
// content/projects.en.md EN) for this Zola site from the live GitHub API.
// Zero dependencies (Node 18+ global fetch). Driven by .github/projects.json.
// Run from .github/workflows/update-projects.yml or locally.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const USER = 'maxgfr';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const CONFIG = JSON.parse(readFileSync(join(HERE, '..', 'projects.json'), 'utf8'));

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': `${USER}-site-bot` };
if (token) headers.Authorization = `Bearer ${token}`;

const T = {
  fr: {
    title: 'Mes projets',
    intro: 'Une sélection de mes projets open source, mise à jour automatiquement depuis mon [GitHub](https://github.com/maxgfr).',
    stats: (n, s) => `**📦 ${n} dépôts publics · ⭐ ${s} étoiles**`,
    all: 'Voir tous mes dépôts sur GitHub →',
    labels: { npm: 'npm', marketplace: 'marketplace', demo: 'démo', site: 'site' },
  },
  en: {
    title: 'Projects',
    intro: 'A selection of my open-source projects, auto-updated from my [GitHub](https://github.com/maxgfr).',
    stats: (n, s) => `**📦 ${n} public repos · ⭐ ${s} stars**`,
    all: 'See all my repositories on GitHub →',
    labels: { npm: 'npm', marketplace: 'marketplace', demo: 'demo', site: 'site' },
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
  return out.filter(
    (r) => !r.private && !r.fork && !r.archived && !(CONFIG.exclude || []).includes(r.name)
  );
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

function buildPage(repos, lang) {
  const t = T[lang];
  const byName = new Map(repos.map((r) => [r.name, r]));
  const used = new Set();
  const sections = [];
  for (const cat of CONFIG.categories) {
    const title = lang === 'fr' ? cat.title_fr : cat.title_en;
    const lines = [];
    for (const name of cat.repos) {
      const r = byName.get(name);
      if (!r) continue;
      used.add(name);
      lines.push(bullet(r, lang));
    }
    if (lines.length) sections.push(`## ${title}\n\n${lines.join('\n')}`);
  }
  const leftover = repos
    .filter((r) => !used.has(r.name))
    .sort((a, b) => b.stargazers_count - a.stargazers_count);
  if (leftover.length) {
    sections.push(`## ${CONFIG.fallback[lang]}\n\n${leftover.map((r) => bullet(r, lang)).join('\n')}`);
  }

  const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);
  const fm = `+++\ntitle = "${t.title}"\n+++`;
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

async function main() {
  const repos = await allOwnedRepos();
  writeFileSync(join(REPO_ROOT, 'content', 'projects.md'), buildPage(repos, 'fr'));
  writeFileSync(join(REPO_ROOT, 'content', 'projects.en.md'), buildPage(repos, 'en'));
  console.log(`Generated projects pages: ${repos.length} repos.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
