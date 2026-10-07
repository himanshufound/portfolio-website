# Portfolio Website

Personal portfolio of Himanshu Rawat — a catalog of projects and ideas.
Soft like sakura, fast like Ferrari.

**Live:** https://himanshufr.me/

## Stack

Vanilla HTML, CSS, and JavaScript — no framework, no build step.
Hosted on Vercel.

## Run locally

```bash
npm run dev
```

Serves the site at http://localhost:4173 via `npx serve`.

Once per clone, enable the hook that stamps asset hashes into `index.html`
(CSS/JS are cached for a year, so their `?v=` must change with their content):

```bash
git config core.hooksPath .githooks
```

## Structure

- `index.html` — single-page site (hero, about, work, contact)
- `styles.css` — all styling (design tokens, layout, animations)
- `script.js` — petals, smooth scroll, scroll reveals, music player
- `images/` — hero art (PNG + optimized JPEG)
- `audio/` — playlist tracks for the floating music player
