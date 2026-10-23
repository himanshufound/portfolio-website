# Portfolio Website

Personal portfolio of Himanshu Rawat — a catalog of projects and ideas.
Soft like sakura, fast like Ferrari.

**Live:** https://himanshufr.me/

## Stack

Vanilla HTML, CSS, and JavaScript — no framework. One small build step
(`build.mjs`, uses `marked`) renders the blog and extra pages from `content/` into `dist/`.
Moving from Vercel to Cloudflare Pages — see `DEPLOY.md`.

## Run locally

```bash
npm run dev
```

Serves the repo root at http://localhost:4173 via `npx serve` (home pages only).
`npm run preview` builds `dist/` and serves it like Cloudflare Pages at http://localhost:8788.

Once per clone, enable the hook that stamps asset hashes into `index.html`
(CSS/JS are cached for a year, so their `?v=` must change with their content):

```bash
git config core.hooksPath .githooks
```

## Structure

- `index.html` — single-page site (hero, about, work, contact)
- `zh.html` — simplified Chinese copy of `index.html`, served at `/zh`; JS strings switch on `<html lang="zh-CN">`
- `styles.css` — all styling (design tokens, layout, animations)
- `script.js` — petals, smooth scroll, scroll reveals, music player (home pages)
- `motion.js` — every page: F1 shift-light scroll progress, nav that shrinks/hides with a follow pill, heading reveals, cursor follower, magnetic buttons
- `work-with-me.css`, `work-with-me.js` — loaded only by `/work-with-me`
- `images/` — hero art (PNG + optimized JPEG)
- `audio/` — playlist tracks for the floating music player
- `content/blog/*.md` — blog posts (front matter: title, description, date, tags)
- `content/pages/*.md` — `/products`, `/disclosure` (Markdown, rendered as prose)
- `content/pages/work-with-me.html` — `/work-with-me`, hand-built markup inside the shared layout
- `build.mjs` — builds `dist/` (static copy + blog, pages, `rss.xml`, `sitemap.xml`)
- `prose.css` — styles for the generated pages
- `_redirects` — `/go/<tool>` affiliate redirects (Cloudflare Pages)
- `_headers` — cache headers (Cloudflare Pages)
