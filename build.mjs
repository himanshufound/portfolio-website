// Builds the deployable site into dist/: copies the static site as-is, then renders
// Markdown from content/ into /blog, /blog/<slug>, /work-with-me, /products, /disclosure,
// plus rss.xml and sitemap.xml. Run: npm run build
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { marked } from "marked";

const SITE = "https://himanshufr.me";
const AUTHOR = "Himanshu Rawat";
const OUT = "dist";

// Never copied into dist/: dotfiles (.git, .wrangler, ...), tooling, source content, docs,
// and Vercel-only config.
const SKIP = new Set([
  "node_modules", "content", OUT, "build.mjs", "package.json", "package-lock.json", "vercel.json",
]);

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const hash = (f) => createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 8);
const fmtDate = (d) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
// Affiliate links go through /go/<tool> (see _redirects) and must be marked as paid links.
const sponsor = (html) => html.replaceAll('<a href="/go/', '<a rel="sponsored nofollow" href="/go/');

// Minimal front matter: `key: value` lines between --- fences; `tags: [a, b]` or `tags: a, b`.
function parse(file) {
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing --- front matter ---`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 1) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  for (const k of ["title", "description"]) if (!meta[k]) throw new Error(`${file}: front matter needs "${k}"`);
  meta.tags = (meta.tags || "").replace(/^\[|\]$/g, "").split(",").map((t) => t.trim()).filter(Boolean);
  meta.draft = meta.draft === "true";
  return { meta, html: sponsor(marked.parse(m[2])) };
}

const NEWSLETTER = `
      <!-- NEWSLETTER PLACEHOLDER: replace the <p class="newsletter__soon"> line with your provider's
           embed form (Buttondown / Kit / beehiiv). Same block lives in index.html and zh.html. -->
      <section class="newsletter" id="newsletter" aria-labelledby="newsletter-heading">
        <p class="section-tag">newsletter</p>
        <h2 id="newsletter-heading" class="newsletter__title">One useful email when I ship or learn something.</h2>
        <p class="newsletter__copy">Fast websites, small AI automations, and the tools behind them. No spam, unsubscribe any time.</p>
        <p class="newsletter__soon">Sign-up opens soon. Until then, <a href="mailto:rawat.himanshu2211@gmail.com?subject=Add%20me%20to%20the%20newsletter">email me</a> and I&rsquo;ll add you.</p>
      </section>`;

const v = {
  fonts: hash("fonts/fonts.css"),
  styles: hash("styles.css"),
  prose: hash("prose.css"),
};

function layout({ title, description, urlPath, body, type = "website" }) {
  const url = SITE + urlPath;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1a1418" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="${AUTHOR}" />
    <meta property="og:image" content="${SITE}/images/og.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="alternate" type="application/rss+xml" title="${AUTHOR} — blog" href="${SITE}/rss.xml" />
    <link rel="preload" href="/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/fonts/fonts.css?v=${v.fonts}" />
    <link rel="stylesheet" href="/styles.css?v=${v.styles}" />
    <link rel="stylesheet" href="/prose.css?v=${v.prose}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  </head>
  <body>
    <div class="grain" aria-hidden="true"></div>
    <header class="nav">
      <a href="/" class="nav__mark" aria-label="Home">
        <span class="nav__mark-glyph">花</span>
        <span class="nav__mark-name">himanshu</span>
      </a>
      <nav class="nav__links" aria-label="Primary">
        <a href="/#work">work</a>
        <a href="/blog">blog</a>
        <a href="/work-with-me">work with me</a>
      </nav>
    </header>
    <main class="page">
${body}
      <footer class="site-foot">
        <a href="/blog">blog</a>
        <a href="/work-with-me">work with me</a>
        <a href="/products">products</a>
        <a href="/disclosure">disclosure &amp; privacy</a>
        <a href="/rss.xml">rss</a>
      </footer>
    </main>
  </body>
</html>
`;
}

// 1. Copy the static site.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const name of fs.readdirSync(".")) {
  if (SKIP.has(name) || name.startsWith(".") || name.endsWith(".md")) continue;
  fs.cpSync(name, path.join(OUT, name), {
    recursive: true,
    filter: (src) => path.basename(src) !== ".DS_Store",
  });
}
const write = (rel, html) => {
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), html);
};

// 2. Blog posts -> dist/blog/<slug>.html, served at /blog/<slug>.
const posts = fs
  .readdirSync("content/blog")
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const { meta, html } = parse(`content/blog/${f}`);
    const date = new Date(meta.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || isNaN(date)) {
      throw new Error(`content/blog/${f}: date must be YYYY-MM-DD, got "${meta.date}"`);
    }
    return { ...meta, date, html, slug: f.replace(/\.md$/, "") };
  })
  .filter((p) => !p.draft)
  .sort((a, b) => b.date - a.date);

const tagList = (tags) =>
  tags.length ? `<ul class="tags">${tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "";

for (const p of posts) {
  write(
    `blog/${p.slug}.html`,
    layout({
      title: `${p.title} — ${AUTHOR}`,
      description: p.description,
      urlPath: `/blog/${p.slug}`,
      type: "article",
      body: `      <article class="post">
        <p class="section-tag"><a href="/blog">blog</a> &middot; <time datetime="${p.date.toISOString().slice(0, 10)}">${fmtDate(p.date)}</time></p>
        <h1 class="page__title">${esc(p.title)}</h1>
        ${tagList(p.tags)}
        <div class="prose">
${p.html}
        </div>
      </article>
${NEWSLETTER}`,
    }),
  );
}

write(
  "blog.html",
  layout({
    title: `Blog — ${AUTHOR}`,
    description: "Notes on building fast websites, small AI automations, and the tools behind them.",
    urlPath: "/blog",
    body: `      <header>
        <p class="section-tag">blog</p>
        <h1 class="page__title">Notes from building in public.</h1>
      </header>
      <ul class="post-list">
${posts
  .map(
    (p) => `        <li>
          <a href="/blog/${p.slug}">
            <time datetime="${p.date.toISOString().slice(0, 10)}">${fmtDate(p.date)}</time>
            <span class="post-list__title">${esc(p.title)}</span>
            <span class="post-list__desc">${esc(p.description)}</span>
          </a>
          ${tagList(p.tags)}
        </li>`,
  )
  .join("\n")}
      </ul>
${NEWSLETTER}`,
  }),
);

// 3. Standalone pages -> dist/<slug>.html, served at /<slug>.
const pages = fs.readdirSync("content/pages").filter((f) => f.endsWith(".md"));
for (const f of pages) {
  const slug = f.replace(/\.md$/, "");
  const { meta, html } = parse(`content/pages/${f}`);
  write(
    `${slug}.html`,
    layout({
      title: `${meta.title} — ${AUTHOR}`,
      description: meta.description,
      urlPath: `/${slug}`,
      body: `      <article class="post">
        <p class="section-tag">${esc(meta.tag || slug.replaceAll("-", " "))}</p>
        <h1 class="page__title">${esc(meta.heading || meta.title)}</h1>
        <div class="prose">
${html}
        </div>
      </article>${meta.newsletter === "true" ? NEWSLETTER : ""}`,
    }),
  );
}

// 4. RSS + sitemap.
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${AUTHOR} — blog</title>
    <link>${SITE}/blog</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Notes on building fast websites, small AI automations, and the tools behind them.</description>
    <language>en</language>
${posts
  .map(
    (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${p.slug}</link>
      <guid>${SITE}/blog/${p.slug}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
${p.tags.map((t) => `      <category>${esc(t)}</category>`).join("\n")}
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;
write("rss.xml", rss);

const urls = [
  ["/", "1.0"],
  ["/zh", "0.8"],
  ["/blog", "0.8"],
  ...pages.map((f) => [`/${f.replace(/\.md$/, "")}`, "0.6"]),
  ...posts.map((p) => [`/blog/${p.slug}`, "0.7", p.date.toISOString().slice(0, 10)]),
];
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ([u, pr, lastmod]) =>
      `  <url>\n    <loc>${SITE}${u}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}    <priority>${pr}</priority>\n  </url>`,
  )
  .join("\n")}
</urlset>
`,
);

console.log(`built ${OUT}/: ${posts.length} post(s), ${pages.length} page(s), rss.xml, sitemap.xml`);
