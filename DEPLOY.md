# Deploying to Cloudflare Pages

The site is plain HTML plus a small build step (`build.mjs`). The build turns Markdown in `content/` into `/blog`, the posts, `/work-with-me`, `/products` and `/disclosure`, and writes `rss.xml` and `sitemap.xml`. Everything goes into `dist/`.

## Local

```bash
npm install          # once: installs marked
npm run build        # writes dist/
npm run preview      # build, then serve dist/ the way Cloudflare does: http://localhost:8788
npm run dev          # old preview of the repo root (no blog pages)
```

`npm run preview` runs `wrangler pages dev`. It honours `_redirects` and `_headers` and needs no Cloudflare account.

## Cloudflare Pages settings

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | from `.node-version` (24) |

## Steps (dashboard)

Do these in order. Nothing breaks if you stop half-way.

1. **Commit and push** all of this work to `main` as **one commit**. A partial commit would ship the new nav links without the pages they point to.
   1. Make sure the asset-hash hook is on: `git config core.hooksPath` should print `.githooks`.
   2. After committing, check that the `styles.css?v=` value changed in both `index.html` and `zh.html`.
   3. Vercel also builds this push, because `vercel.json` now runs `npm run build` and serves `dist/`. That should put `/blog` and `/work-with-me` live on the current site straight away. This hasn't been tested on Vercel yet, so open `himanshufr.me/blog` and `/work-with-me` after the push to confirm.
   4. `/go/*` links work only on Cloudflare.
2. **Create a Cloudflare account** at dash.cloudflare.com (free plan).
3. **Create the Pages project:**
   1. Go to **Workers & Pages**, then **Create application**, then the **Pages** tab, then **Import an existing Git repository**.
   2. Authorize GitHub and pick this repo, then **Begin setup**.
   3. Fill in the table above, then **Save and Deploy**.
4. **Check the preview.** Open `https://<project>.pages.dev` and confirm all of these work:
   - `/`, `/zh`, `/blog`, a post, `/work-with-me`, `/products`, `/disclosure`, `/rss.xml`, `/sitemap.xml`
   - `/go/cloudflare`, which should redirect to cloudflare.com
5. **Move DNS for himanshufr.me to Cloudflare:**
   1. In the dashboard, choose **Add a domain**, enter `himanshufr.me`, and pick the Free plan.
   2. Cloudflare scans your existing records. **Check this list before you change nameservers:**
      - [ ] `aimpact` CNAME `cname.vercel-dns.com`, set to **DNS only** (grey cloud)
      - [ ] `flow` CNAME `cname.vercel-dns.com`, **DNS only**
      - [ ] `yuno` CNAME `cname.vercel-dns.com`, **DNS only**
      - [ ] Any MX and TXT records (email, domain verification) from your current DNS
   3. At your domain registrar, change the nameservers to the two that Cloudflare shows you. The change usually takes effect within an hour, but can take up to 24 hours.
6. **Attach the domain:**
   1. Go to **Workers & Pages**, open your project, then **Custom domains**, then **Set up a custom domain**.
   2. Add `himanshufr.me`. Cloudflare replaces the old Vercel record for you.
   3. Add `www.himanshufr.me` too if you use it.
7. **Analytics.** In the Pages project, open **Metrics** and enable **Web Analytics**. It's cookieless and needs no code. The old `/_vercel/insights` tag has already been removed from both pages.
8. **Retire the portfolio on Vercel.** Once himanshufr.me serves from Cloudflare, remove the domain from the *portfolio* Vercel project, or delete that project. Leave the aimpact, flow and yuno projects alone.

## Day-to-day

- **New post:** add `content/blog/<slug>.md` and push. The front matter looks like this:
  ```
  ---
  title: Post title
  description: One sentence for search results and RSS.
  date: 2026-10-22
  tags: [websites, automation]
  draft: false
  ---
  ```
  The URL becomes `/blog/<slug>`. A bad or missing `date`, `title` or `description` fails the build on purpose.
- **Affiliate link:**
  1. Add a line to `_redirects`: `/go/<tool>  <affiliate URL>  302`.
  2. Link to `/go/<tool>` in a post. The build adds `rel="sponsored nofollow"` to it.
  3. Say near the top of the post that it contains affiliate links.
  4. Unknown `/go/*` links redirect to `/blog`.
- **Newsletter:** pick a provider (Buttondown, Kit, beehiiv). Replace the `<p class="newsletter__soon">` placeholder in three places: `index.html`, `zh.html` and the `NEWSLETTER` string in `build.mjs`.
- **Booking link:** in `content/pages/work-with-me.md`, swap the `mailto:` button for your Cal.com or Calendly URL.

## Known gaps

- Cloudflare's `_headers` matches paths only, so the year-long cache on `styles.css?v=…`, `script.js?v=…`, `demos.js?v=…` and `fonts/fonts.css?v=…` from `vercel.json` can't be ported. Those files fall back to Cloudflare's default cache, which revalidates each time and stays correct. Fonts, images and audio keep their year-long immutable cache.
- `vercel.json` stays in place as a bridge until step 8. Delete it after the cutover.
