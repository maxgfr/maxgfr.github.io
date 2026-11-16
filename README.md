# Maxime Golfier - Personal Website

A minimalist personal website built with [Zola](https://www.getzola.org).

## Features

- **Minimalist Design**: Clean, content-focused layout with minimal JavaScript
- **Dark/Light Theme**: Automatic theme detection with manual toggle
- **Fast Performance**: Lightweight CSS and minimal dependencies
- **Responsive**: Works seamlessly on all devices
- **SEO Optimized**: Proper meta tags, sitemap, and RSS feed

## Project Structure

```
.
├── config.toml          # Zola configuration
├── content/             # Site content (Markdown files)
│   ├── _index.md       # Home page
│   ├── experience.md   # Professional experience
│   ├── education.md    # Academic background
│   └── contact.md      # Contact information
├── static/             # Static assets (CSS, JS, images)
├── templates/          # Custom templates (if needed)
├── themes/             # Installed themes
│   └── anemone/       # Anemone theme
└── public/             # Generated site (built output)
```

## Development

### Prerequisites

- [Zola](https://www.getzola.org/documentation/getting-started/installation/) (v0.22.0 or later)

### Build the site

```bash
zola build
```

### Serve locally

```bash
zola serve
```

Then open http://127.0.0.1:1111 in your browser.

### Create new content

Add new Markdown files in the `content/` directory. Each file should start with frontmatter:

```toml
+++
title = "Page Title"
+++

Your content here...
```

French is the default language (`/x`), English lives in the `.en.md` twin (`/en/x`).
`static/js/language.js` redirects between the two, so every page needs both files: a missing
twin is a 404, not a fallback.

### Write an article

Articles live in `content/articles/` and are listed, newest first, at `/articles` and
`/en/articles` (templates `templates/articles.html` and `templates/article.html`, styles
`static/css/articles.css`). They are also the entries of the site's Atom feeds, `/atom.xml`
and `/en/atom.xml` (only dated pages are entries, and only articles carry a date).

1. Create both twins with the same file name: `content/articles/<slug>.md` (French) and
   `content/articles/<slug>.en.md` (English). The file name is the URL
   (`/articles/<slug>/`, `/en/articles/<slug>/`); do not set `slug` or `path` in the front
   matter, or the language switch will point at a page that does not exist.
2. Front matter:

   ```toml
   +++
   title = "Titre de l’article"
   date = 2026-11-16                # sorts the list, dates the feed entry
   description = "Résumé en une ligne."   # list summary, feed summary, meta description
   # updated = 2026-12-01          # optional, shown as "mis à jour le …"
   draft = true                     # remove to publish
   # include_in_feeds = false       # optional, keeps it out of the feeds

   [extra]
   toc = true                       # optional table of contents from ## and ### headings
   +++
   ```

3. Start sections at `##` (the title is the page's only `#`). Markdown tables, code blocks
   and footnotes (`text[^id]` then `[^id]: note`) need nothing special: tables scroll sideways
   on a phone, footnotes are gathered at the end with a link back.
4. Put images in `static/articles/<slug>/` and use the components (Zola 0.23 replaced
   shortcodes with Tera components, defined in `templates/components/`):

   ```jinja
   {{ <figure src="/articles/<slug>/image.svg" alt="What it shows" caption="Figure 1. *Markdown* caption." width={640} height={360} /> }}

   {% <note title="À retenir"> %}
   Body in **Markdown**, any number of paragraphs.
   {% </note> %}
   ```

   `alt` is required (`""` only for a decorative image); `caption`, `width`, `height` and
   `title` are optional. Numbers go in braces, strings in double quotes.
5. Every page is a Tera template since Zola 0.23: literal `{{` or `{%` in the text or in a
   code block must be wrapped in `{% raw %}…{% endraw %}`.
6. Preview drafts with `zola serve --drafts`; a draft is in no build without `--drafts`
   (no page, no list entry, no feed entry, no sitemap or search entry).

## Customization

### Navigation

Edit the `header_nav` section in `config.toml`:

```toml
[extra]
header_nav = [
  { url = "/", name_en = "/home/", name_fr = "/accueil/" },
  { url = "/experience", name_en = "/experience/", name_fr = "/experience/" },
  { url = "/education", name_en = "/education/", name_fr = "/education/" },
  { url = "/contact", name_en = "/contact/", name_fr = "/contact/" },
  # Add more links...
]
```

### Theme Colors

The Anemone theme uses CSS variables for theming. You can customize colors by creating `static/css/custom.css`.

### Site Information

Update site metadata in `config.toml`:

```toml
[languages.en]
title = "Your Name"
description = "Your site description"

[extra]
author = "Your Name"
favicon = "favicon.ico"
```

## Deployment

The site is ready for GitHub Pages. The `public/` directory contains the built site that should be deployed.

### GitHub Pages

1. Push the repository to GitHub
2. Enable GitHub Pages in repository settings
3. Set source to `gh-pages` branch or use a workflow to deploy from `main`

## Credits

- Built with [Zola](https://www.getzola.org)
- Theme: [Anemone](https://github.com/Speyll/anemone) by Speyll
- CSS Framework: [suCSS](https://speyll.github.io/suCSS/)

## License

This project is open source and available under the [GPLv3 License](themes/anemone/LICENSE).

## Agent skill

`skills/cv` is a dev-only skill for working on this repo (generate, preview and refine the CV
PDFs). Install the repo's skills for your agent with `npx skills add .` (pick the agent when
prompted, or pass `-a <agent>`, e.g. `-a claude-code` or `-a codex`). The install output is
gitignored.

Invoke it explicitly with `/cv` in Claude Code and OpenCode, or `$cv` in Codex. Claude Code and
OpenCode read `disable-model-invocation: true` in `SKILL.md` and never select it on their own;
Codex has no equivalent setting in the skill, so it may still pick the skill implicitly.
