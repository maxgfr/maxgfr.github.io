#!/usr/bin/env node
// Renders the site's /cv and /en/cv pages to PDF with headless Chrome.
// Zero dependencies (Node 18+). Used unchanged by BOTH .github/workflows/deploy.yml
// and the local `cv` skill, so what you tune locally is exactly what ships.
//
//   node .github/scripts/render-cv-pdf.mjs [--out <dir>] [--keep]
//
// --out   where the PDFs land (default: public/)
// --keep  keep the temporary build + print the served URL, for debugging
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, mkdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir, homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

const argv = process.argv.slice(2);
const outDir = resolve(REPO_ROOT, argv[argv.indexOf('--out') + 1] ?? 'public');
const keep = argv.includes('--keep');

// FR is the default language (served at /cv), EN lives under /en.
//
// `locale` is load-bearing, not cosmetic. static/js/language.js redirects a
// visitor whose navigator.languages disagrees with the path they are on, and a
// fresh headless profile has an empty localStorage, so it always fires. Left to
// the runner's default (en-US) it would rewrite /cv -> /en/cv and emit an
// ENGLISH document under the French filename, with a zero exit code. Telling
// Chrome which locale it is browsing as makes the site's own logic keep us on
// the intended page. Verified both ways: en-US on /cv/ does flip to English.
const TARGETS = [
  { name: 'fr-1p', path: '/cv-1page/', locale: 'fr-FR,fr', maxPages: 1 },
  { name: 'fr-full', path: '/cv/', locale: 'fr-FR,fr' },
  { name: 'en-1p', path: '/en/cv-1page/', locale: 'en-US,en', maxPages: 1 },
  { name: 'en-full', path: '/en/cv/', locale: 'en-US,en' },
];

const CHROME_TIMEOUT_MS = 90_000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.ogg': 'audio/ogg',
};

/** First existing Chrome/Chromium binary, or null. */
function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;

  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const which = spawnSync('sh', ['-c', `command -v ${name}`], { encoding: 'utf8' });
    if (which.status === 0 && which.stdout.trim()) return which.stdout.trim().split('\n')[0];
  }

  const fixed = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  for (const p of fixed) if (existsSync(p)) return p;

  // Browsers already downloaded by Playwright / Puppeteer, if any.
  const caches = [
    { dir: join(homedir(), 'Library', 'Caches', 'ms-playwright'), rel: ['chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome'] },
    { dir: join(homedir(), '.cache', 'ms-playwright'), rel: ['chrome-linux/chrome'] },
    { dir: join(homedir(), '.cache', 'puppeteer'), rel: ['chrome-linux64/chrome', 'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'] },
  ];
  for (const { dir, rel } of caches) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir).sort().reverse()) {
      for (const r of rel) {
        const p = join(dir, entry, r);
        if (existsSync(p)) return p;
      }
    }
  }
  return null;
}

/** Serve `root` on a free loopback port. Resolves to { origin, close }. */
function serve(root) {
  return new Promise((ok, fail) => {
    const server = createServer((req, res) => {
      let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = join(root, rel);
      // `connection: close` is not a nicety. Node keeps HTTP/1.1 sockets alive
      // by default; headless Chrome treats a live socket as a pending fetch, so
      // --virtual-time-budget never expires and the browser writes the PDF and
      // then hangs forever. Closing each response is what lets Chrome exit.
      // Never serve outside the build directory.
      if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404, { connection: 'close' }).end('not found');
        return;
      }
      res.writeHead(200, {
        'content-type': MIME[extname(file)] ?? 'application/octet-stream',
        connection: 'close',
      });
      createReadStream(file).pipe(res);
    });
    server.keepAliveTimeout = 0;
    server.on('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      ok({
        origin: `http://127.0.0.1:${port}`,
        // closeAllConnections() is required: Chrome leaves keep-alive sockets
        // open and server.close() would otherwise wait for them forever.
        close: () =>
          new Promise((r) => {
            server.closeAllConnections();
            server.close(r);
          }),
      });
    });
  });
}

function run(cmd, args, label) {
  const res = spawnSync(cmd, args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (res.error) throw new Error(`${label} failed to start: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`${label} exited ${res.status}\n${res.stdout}${res.stderr}`);
  return res.stdout;
}

/** Number of pages in a PDF, or null if it cannot be determined. */
function pageCount(file) {
  const buf = readFileSync(file).toString('latin1');
  const types = buf.match(/\/Type\s*\/Page[^s]/g);
  if (types?.length) return types.length;
  const counts = [...buf.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return counts.length ? Math.max(...counts) : null;
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    throw new Error(
      'No Chrome/Chromium found. Set CHROME_BIN=/path/to/chrome, or install Google Chrome.\n' +
        'On GitHub-hosted ubuntu runners `google-chrome` is preinstalled.'
    );
  }

  const build = mkdtempSync(join(tmpdir(), 'cv-site-'));
  let server;

  try {
    // Build against a loopback base_url. This is not optional: get_url() bakes
    // absolute URLs into every <link>/<script>, so a site built for
    // https://maxgfr.github.io would pull its CSS from the LIVE site and the
    // stylesheet changes you are trying to preview would silently not apply.
    const port0 = await serve(build); // reserve a port first so --base-url matches
    const origin = port0.origin;
    await port0.close();

    run('zola', ['build', '--base-url', origin, '--output-dir', build, '--force'], 'zola build');
    server = await serve(build);
    if (server.origin !== origin) {
      // Port was taken in between; rebuild against the one we actually got.
      run('zola', ['build', '--base-url', server.origin, '--output-dir', build, '--force'], 'zola build');
    }

    mkdirSync(outDir, { recursive: true });
    const results = [];

    for (const { name, path, locale, maxPages } of TARGETS) {
      const out = join(outDir, `maxime-golfier-cv-${name}.pdf`);
      process.stdout.write(`rendering ${path.padEnd(16)} (${locale.split(',')[0]}) … `);
      rmSync(out, { force: true });
      // Chrome writes the PDF and then, in some configurations, lingers. Since
      // the artifact is what we actually care about, a timeout is only fatal if
      // no valid PDF landed — checked after this block.
      await new Promise((settle) => {
        const child = spawn(
          chrome,
          [
            '--headless',
            '--disable-gpu',
            '--no-sandbox', // required on ubuntu-24.04 runners; harmless locally
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-extensions',
            '--hide-scrollbars',
            '--force-color-profile=srgb', // keep CI and macOS output comparable
            // Incognito, NOT --user-data-dir. Both give the empty localStorage
            // we need (no stale `theme: dark` or `lang-preference` leaking into
            // the render), but on macOS --user-data-dir makes Chrome write the
            // PDF and then never exit — measured, and not fixable with
            // --disable-background-networking / --disable-component-update /
            // --no-first-run. Incognito exits in about a second.
            '--incognito',
            `--lang=${locale.split(',')[0]}`,
            `--accept-lang=${locale}`,
            '--run-all-compositor-stages-before-draw',
            '--virtual-time-budget=15000',
            // Page size and margins come from @page in static/css/cv.css:
            // headless Chrome hardcodes preferCSSPageSize:true, so there is
            // nothing to pass here.
            '--no-pdf-header-footer',
            `--print-to-pdf=${out}`,
            `${server.origin}${path}`,
          ],
          { stdio: ['ignore', 'ignore', 'pipe'] }
        );
        child.stderr.resume(); // drain: Chrome is chatty on stderr even when fine
        child.on('error', () => settle());
        // Without a hard cap, a lingering Chrome would stall a CI job until the
        // 6h workflow timeout.
        const killer = setTimeout(() => child.kill('SIGKILL'), CHROME_TIMEOUT_MS);
        child.on('exit', () => {
          clearTimeout(killer);
          settle();
        });
      });

      // The exit code is deliberately not the gate: Chrome can exit 0 having
      // written nothing, and can write a perfectly good PDF before being killed
      // for lingering. The artifact is what matters.
      if (!existsSync(out)) {
        throw new Error(
          `Chrome produced no PDF for ${path}.\n` +
            'If a Chrome window is open, close it, or set CHROME_BIN to another Chromium build.'
        );
      }
      if (readFileSync(out).subarray(0, 4).toString('latin1') !== '%PDF') {
        throw new Error(`${out} is not a PDF — the page probably failed to load.`);
      }
      const pages = pageCount(out);
      results.push({ name, out, pages, bytes: statSync(out).size, maxPages });
      console.log(`ok — ${pages ?? '?'} page(s)`);
    }

    console.log('');
    for (const r of results) {
      console.log(`${r.name.padEnd(8)} ${String(r.pages ?? '?').padStart(2)} page(s)  ${String((r.bytes / 1024).toFixed(0)).padStart(4)} KB  ${r.out}`);
    }

    // A "one-page CV" that quietly runs to two pages is worse than useless: it
    // gets sent out before anyone notices. Fail loudly instead.
    const overflowed = results.filter((r) => r.maxPages && r.pages && r.pages > r.maxPages);
    if (overflowed.length) {
      throw new Error(
        `\n${overflowed.map((r) => `${r.name} is ${r.pages} pages, expected ${r.maxPages}`).join('\n')}\n` +
          'Trim content in content/*.md, or tighten static/css/cv-compact.css.'
      );
    }
    if (keep) console.log(`\nBuild kept at ${build} (served at ${server.origin})`);
  } finally {
    await server?.close();
    if (!keep) rmSync(build, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
