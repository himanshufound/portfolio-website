// Builds the deployable site into dist/: copies the static site as-is, then renders
// Markdown from content/ into /blog, /blog/<slug>, /work-with-me, /products, /disclosure,
// plus rss.xml and sitemap.xml. Run: npm run build
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { marked } from "marked";

const SITE = "https://himanshufr.me";
const AUTHOR = "Himanshu Rawat";
const OUT = "dist";

// The only repo-root entries that get published. An allowlist, so private or scratch files
// dropped in the folder (invoices, notes, CSVs) never reach dist/. Add new public files here.
const PUBLIC = [
  "index.html", "zh.html", "styles.css", "script.js", "demos.js", "motion.js", "prose.css",
  "work-with-me.css", "work-with-me.js",
  "favicon.svg", "apple-touch-icon.png", "resume.pdf", "robots.txt", "llms.txt", "_redirects", "_headers",
  "fonts", "images", "audio",
];

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const hash = (f) => createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 8);
const fmtDate = (d) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
// Last commit date (YYYY-MM-DD) of a source file, for sitemap <lastmod> and dateModified.
// Undefined for uncommitted files, so the sitemap never claims a date it can't back up.
// ponytail: a shallow clone reports its tip date for every file; build from a full clone.
const gitDate = (file) => {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
};
const latest = (...dates) => dates.filter(Boolean).sort().at(-1);
// JSON-LD inside <script>: escape "<" so a "</script>" in a title can't close the tag.
const ldJson = (data) => JSON.stringify(data, null, 2).replaceAll("<", "\\u003c");
// The Person node lives on the home page; other pages point at it by @id.
const PERSON = { "@type": "Person", "@id": `${SITE}/#person`, name: AUTHOR, url: `${SITE}/` };
const breadcrumbs = (trail) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map(([name, urlPath], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item: SITE + urlPath,
  })),
});
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
  meta.noindex = meta.noindex === "true";
  // .html pages are hand-built markup: used as-is, not run through Markdown
  return { meta, html: sponsor(file.endsWith(".html") ? m[2] : marked.parse(m[2])) };
}

const NEWSLETTER = `
      <!-- NEWSLETTER (Kit form 10085622). Copy lives here, in zh.html and in build.mjs NEWSLETTER. -->
      <section class="newsletter" id="newsletter" aria-labelledby="newsletter-heading">
        <p class="section-tag">newsletter</p>
        <h2 id="newsletter-heading" class="newsletter__title">Real projects built with AI coding tools.</h2>
        <p class="newsletter__copy">One email a week. No spam, unsubscribe any time.</p>
        <form class="newsletter__form" action="https://app.kit.com/forms/10085622/subscriptions" method="post">
          <label for="newsletter-email" class="visually-hidden">Email address</label>
          <input id="newsletter-email" class="newsletter__input" type="email" name="email_address" required placeholder="you@example.com" autocomplete="email" />
          <button class="btn btn--primary" type="submit">Subscribe</button>
        </form>
      </section>`;

const v = {
  fonts: hash("fonts/fonts.css"),
  styles: hash("styles.css"),
  prose: hash("prose.css"),
  motion: hash("motion.js"),
};

const NAV = [
  ["/#work", "work"],
  ["/blog", "blog"],
  ["/work-with-me", "work with me"],
];

// `assets` names a root-level <name>.css / <name>.js pair that only this page loads.
// `jsonld` is a list of schema.org objects; `noindex` keeps thin pages out of search.
function layout({ title, description, urlPath, body, type = "website", assets, mainClass = "page", jsonld = [], noindex = false }) {
  const url = SITE + urlPath;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1a1418" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${url}" />${noindex ? '\n    <meta name="robots" content="noindex, follow" />' : ""}
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
    <link rel="stylesheet" href="/prose.css?v=${v.prose}" />${
      assets ? `\n    <link rel="stylesheet" href="/${assets}.css?v=${hash(`${assets}.css`)}" />` : ""
    }
    <script src="/motion.js?v=${v.motion}" defer></script>${
      assets ? `\n    <script src="/${assets}.js?v=${hash(`${assets}.js`)}" defer></script>` : ""
    }
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />${jsonld
      .map((d) => `\n    <script type="application/ld+json">\n${ldJson(d)}\n    </script>`)
      .join("")}
  </head>
  <body>
    <div class="grain" aria-hidden="true"></div>
    <header class="nav">
      <a href="/" class="nav__mark" aria-label="Home">
        <span class="nav__mark-glyph">花</span>
        <span class="nav__mark-name">himanshu</span>
      </a>
      <nav class="nav__links" aria-label="Primary">
${NAV.map(([href, label]) => `        <a href="${href}"${href === urlPath ? ' aria-current="page"' : ""}>${label}</a>`).join("\n")}
      </nav>
    </header>
    <main class="${mainClass}">
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
for (const name of PUBLIC) {
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
    const slug = f.replace(/\.md$/, "");
    const iso = meta.date;
    return { ...meta, date, iso, modified: latest(iso, gitDate(`content/blog/${f}`)), html, slug };
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
      jsonld: [
        {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: p.title,
          description: p.description,
          datePublished: p.iso,
          dateModified: p.modified,
          author: PERSON,
          publisher: PERSON,
          image: `${SITE}/images/og.jpg`,
          mainEntityOfPage: `${SITE}/blog/${p.slug}`,
          inLanguage: "en",
          ...(p.tags.length && { keywords: p.tags.join(", ") }),
        },
        breadcrumbs([["Home", "/"], ["Blog", "/blog"], [p.title, `/blog/${p.slug}`]]),
      ],
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
    jsonld: [breadcrumbs([["Home", "/"], ["Blog", "/blog"]])],
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
const pages = fs
  .readdirSync("content/pages")
  .filter((f) => /\.(md|html)$/.test(f))
  .map((f) => ({ f, slug: f.replace(/\.(md|html)$/, ""), ...parse(`content/pages/${f}`) }));
for (const { f, slug, meta, html } of pages) {
  if (f.endsWith(".html")) {
    write(
      `${slug}.html`,
      layout({
        title: `${meta.title} — ${AUTHOR}`,
        description: meta.description,
        urlPath: `/${slug}`,
        noindex: meta.noindex,
        body: html,
        assets: slug,
        mainClass: slug,
      }),
    );
    continue;
  }
  write(
    `${slug}.html`,
    layout({
      title: `${meta.title} — ${AUTHOR}`,
      description: meta.description,
      urlPath: `/${slug}`,
      noindex: meta.noindex,
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

// A 404.html makes Cloudflare Pages (and Vercel) return a real 404 for unknown paths,
// instead of serving the home page with a 200.
write(
  "404.html",
  layout({
    title: `Page not found — ${AUTHOR}`,
    description: "This page doesn't exist.",
    urlPath: "/404",
    noindex: true,
    body: `      <article class="post">
        <p class="section-tag">404</p>
        <h1 class="page__title">This page doesn&rsquo;t exist.</h1>
        <div class="prose">
          <p>Try the <a href="/">home page</a>, the <a href="/blog">blog</a>, or <a href="/work-with-me">work with me</a>.</p>
        </div>
      </article>`,
  }),
);

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

// [path, lastmod]. Noindexed pages stay out: a sitemap should list only pages meant to rank.
const urls = [
  ["/", gitDate("index.html")],
  ["/zh", gitDate("zh.html")],
  ["/blog", latest(...posts.map((p) => p.modified))],
  ...pages.filter((p) => !p.meta.noindex).map((p) => [`/${p.slug}`, gitDate(`content/pages/${p.f}`)]),
  ...posts.map((p) => [`/blog/${p.slug}`, p.modified]),
];
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ([u, lastmod]) => `  <url>\n    <loc>${SITE}${u}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}  </url>`,
  )
  .join("\n")}
</urlset>
`,
);

console.log(`built ${OUT}/: ${posts.length} post(s), ${pages.length} page(s), rss.xml, sitemap.xml`);
