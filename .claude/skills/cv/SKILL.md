---
name: cv
description: "Use when working on Maxime's CV on the maxgfr.github.io Zola site — generate or regenerate the CV PDFs, preview them, check how many pages they run to, shorten or rebalance a section, make the one-page version fit again, or change how the CV is laid out. Triggers: 'génère mon CV', 'régénère le PDF', 'mon CV tient plus en une page', 'raccourcis la partie IBM', 'optimise mon CV', 'regenerate my resume'."
---

# CV PDFs for maxgfr.github.io

Eight PDFs are published at every deploy, rendered by headless Chrome from the
site's own pages — two formats × two languages × two typefaces, named
`maxime-golfier-cv-{fr|en}-{1p|full}-{sans|mono}.pdf`:

| Route | Rendered as | Pages |
|---|---|---|
| `/cv-1page`, `/en/cv-1page` | `…-1p-sans`, `…-1p-mono` | exactly 1 — enforced |
| `/cv`, `/en/cv` | `…-full-sans`, `…-full-mono` | as many as needed |

The typeface comes from `?font=sans` / `?font=mono` on the URL, read by an inline
`<head>` script in `templates/cv.html`. That query is how `render-cv-pdf.mjs`
asks for each variant, and it is the *only* thing that restyles the page.

The radios in `.cv-actions` deliberately do not: they swap which file the
download buttons point at and nothing else. Browsing `/cv` leaves the page
monospace like the rest of the site. Do not "improve" this into a live preview —
it was built that way once and reverted, because a download preference that
silently reskins the page you are reading reads as a bug.

`sans` is the default the download buttons ship with: this CV is read by résumé
parsers and recruiters, and the site's monospace is a strong stylistic signal.
It also sets narrower and shorter, so it gets its own `font-size` in
`cv-compact.css` — otherwise it finished a seventh of the way up the page.
**The monospace is the binding constraint when trimming**: it is the wider of
the two, so make it fit and the sans-serif follows.

## The one rule

**The CV is a render of the site, not a document.** `templates/cv.html` pulls the
already-rendered HTML of `content/experience*.md`, `education*.md`, `skills*.md`,
`cv-profile*.md`, `cv-stack*.md` and `cv-projects*.md` via `get_page()`. To change
what the CV says, change those source pages — never the template, and never a PDF.

Three of those pages exist only for the CV and are not in `config.extra.header_nav`,
so they add no site navigation: `cv-profile` (the ATS summary), `cv-stack` (the
categorised technical-skills block) and `cv-projects` (generated). The first two
are hand-edited; `cv-projects` is not — see the hard rules.

The one-page variant is the same DOM as the full one; `static/css/cv-compact.css`
only *hides* and *collapses*. That is why the two can never disagree about a date
or a job title.

## Generate

```bash
node .github/scripts/render-cv-pdf.mjs --out ./tmp-cv
open tmp-cv/maxime-golfier-cv-fr-1p.pdf
```

The script prints a page count per PDF and **exits non-zero if a one-page CV no
longer fits on one page**. That failure is the signal to trim, not something to
work around — the same check runs in CI and will block the deploy.

`--keep` leaves the temporary build in place and prints its URL, for inspecting
the HTML that Chrome actually saw.

Preflight, only if something fails:
- `zola --version` — needs ≥ 0.22 (`brew install zola`).
- Chrome: set `CHROME_BIN` if it is not on `PATH` or in `/Applications`.

## Iterate live

```bash
zola serve   # http://127.0.0.1:1111/cv and /cv-1page
```

`/cv-1page` in the browser is the one-page CV; use the browser's print preview
(Cmd+P) for a fast read on pagination, then re-run the render script for the
real artifact. Editing `content/` or `static/css/` live-reloads.

## Making the one-pager fit

In order of preference — earlier options preserve more information:

1. **Collapse, don't cut.** A heading and the `<p>` right after it can share a
   line (`display: inline` on both, `" — "` via the `<p>`'s `::before`, a forced
   `"\A"` newline via its `::after`). Experience, education and languages all do
   this; it is worth ~11 lines and loses nothing.
2. Hide something redundant in `cv-compact.css` — an older role's prose, a
   per-role technology line already covered by `#cv-stack`. Costs nothing on the
   full CV.
3. Tighten `line-height`, `@page` margin or `font-size` in that file's
   `@media print` block. Below ~8pt it stops being readable.
4. Shorten `content/cv-profile*.md` or `cv-stack*.md` — CV-only pages, so this
   does not touch the website.
5. Shorten the prose in `content/experience*.md` — this *does* change the
   website, so only when the text is genuinely flabby.

Two traps, both already handled — do not undo them:

- `cv.css` sets `content: none !important` on every heading `::before` and
  `::after` (to strip suCSS's `'# '`). Separators and line breaks for a collapsed
  pair therefore have to hang off the `<p>`, never the heading.
- Do **not** set `body { display: block }` to reclaim the width suCSS's grid
  leaves unused: it was measured and it *adds* a page. The compact print block
  instead overrides `grid-template-columns: 0 100% 0`, which keeps the grid and
  widened the text column from ~146mm to 188mm — worth 8 lines.

## ATS constraints

The PDFs are parsed by résumé software, so the one-pager is bound by more than
page count. Verify with `pdftotext <pdf> - ` — the extraction is what an ATS
sees, and it must read top to bottom with nothing out of order:

- **One column.** No `column-count` anywhere. Two columns look fine on paper and
  come out interleaved.
- **Never collapse sibling headings against each other.** Headings carry their
  own `line-height` and the medal emoji takes a fallback font with its own
  baseline, so the runs come out of the PDF scrambled. Heading + `<p>` is safe;
  heading + heading is not. This was measured, not assumed.
- Generated content (`::before`/`::after`) may carry punctuation only, never a
  word — a parser that strips it must still read every fact.

## Hard rules

- Never hand-edit `content/projects*.md` or `content/cv-projects*.md`. They are
  generated by `.github/scripts/generate-projects.mjs` and overwritten by a
  daily cron. The CV list is **exhaustive** — every public repo, grouped by
  `maxgfr/maxgfr`'s `.github/projects.json` themes in that file's order,
  most-starred first within a theme, uncategorised ones in the fallback theme.
  To change what appears, edit that JSON (it lives in the other repo), not the
  generated Markdown. Only the full CV renders it; the one-pager hides the
  section outright.
- **Any content edit is made in French and English together** (`experience.md`
  *and* `experience.en.md`, …). A change to one only is a bug: the two CVs
  silently diverge. The test is meaning, not wording — a wording fix that only
  one language needs is fine when it makes the two *agree*. UQAC is the standing
  example: the FR page says "Baccalauréat en informatique (équivalent licence)"
  because in French *baccalauréat* reads as the school-leaving exam, while the
  EN page's "Bachelor in Computer Science" already says exactly that. Do not
  "restore parity" by adding the gloss to the English page.
- Never add a route in one language only — `static/js/language.js` redirects
  between `/x` and `/en/x`, so a missing twin is a 404.
- Never commit the PDFs. They are built into the Pages artifact on every deploy;
  `tmp-cv/` is gitignored.
- After any change, re-run the render script and report the new page counts
  before calling the work done.

## Where things live

| Path | Role |
|---|---|
| `templates/cv.html` | assembles both variants from the source pages |
| `static/css/cv.css` | screen layout + shared `@media print` rules |
| `static/css/cv-compact.css` | one-page variant: hides and tightens |
| `content/cv.md`, `cv-1page.md` (+ `.en.md`) | the four carrier pages |
| `content/cv-profile.md`, `cv-stack.md` (+ `.en.md`) | CV-only: ATS summary and categorised skills. Hand-edited, both languages together. |
| `config.toml` `[extra.cv]` | job title, location, email and links — the only CV data not already on the site. Email but **no phone**: `/cv` is public, so anything here is scrapable and the PDF's URL is public too. Everything else still goes through `/contact`. |
| `.github/scripts/render-cv-pdf.mjs` | the renderer, used identically by CI and locally |
