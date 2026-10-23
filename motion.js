// Site-wide motion layer, loaded on every page: F1 shift lights as scroll progress, a nav that
// shrinks and hides on scroll with a pill that follows the hovered link, word-split heading
// reveals, cursor follower, magnetic buttons, tilt cards, copy-to-clipboard chips.
// Cursor, magnetic and tilt only run with a fine pointer and without reduced motion.
(() => {
  "use strict";

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- shift lights: 5 green, 5 red, 5 blue, lit by scroll progress ----------
  const shift = document.createElement("div");
  shift.className = "shift";
  shift.setAttribute("aria-hidden", "true");
  shift.innerHTML = "<i></i>".repeat(15);
  document.body.prepend(shift);
  const leds = [...shift.children];

  // ---------- nav: shrink after 40px, hide while scrolling down, back on scroll up ----------
  const nav = document.querySelector(".nav");
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    if (nav) {
      nav.classList.toggle("is-scrolled", y > 40);
      if (y > 400 && y > lastY + 2) nav.classList.add("is-hidden");
      else if (y < lastY - 2 || y <= 400) nav.classList.remove("is-hidden");
    }
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    const lit = Math.round((max > 0 ? y / max : 0) * leds.length);
    leds.forEach((l, i) => l.classList.toggle("on", i < lit));
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  // keyboard users tabbing into a hidden nav should see it
  nav?.addEventListener("focusin", () => nav.classList.remove("is-hidden"));

  // ---------- menu-follow pill: slides under the hovered link, rests on the current page ----------
  const links = nav?.querySelector(".nav__links");
  if (links) {
    const pill = document.createElement("span");
    pill.className = "nav__pill";
    pill.setAttribute("aria-hidden", "true");
    links.prepend(pill);
    const home = links.querySelector("[aria-current]");
    const moveTo = (a) => {
      $$("a", links).forEach((l) => l.classList.toggle("is-pill", l === a));
      if (!a) return links.style.setProperty("--o", 0);
      links.style.setProperty("--x", `${a.offsetLeft}px`);
      links.style.setProperty("--y", `${a.offsetTop}px`);
      links.style.setProperty("--w", `${a.offsetWidth}px`);
      links.style.setProperty("--h", `${a.offsetHeight}px`);
      links.style.setProperty("--o", 1);
    };
    $$("a", links).forEach((a) => {
      a.addEventListener("pointerenter", () => moveTo(a));
      a.addEventListener("focus", () => moveTo(a));
    });
    links.addEventListener("pointerleave", () => moveTo(home));
    links.addEventListener("focusout", (e) => links.contains(e.relatedTarget) || moveTo(home));
    addEventListener("resize", () => moveTo(home));
    // fonts change link widths, so place the resting pill once they have loaded
    document.fonts.ready.then(() => moveTo(home));
  }

  // ---------- word-split headings: each word of each text node rises out of its own mask ----------
  for (const el of $$("[data-split]")) {
    el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
    let i = 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const frag = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          frag.append(" ");
          continue;
        }
        const outer = document.createElement("span");
        outer.className = "split-word";
        outer.setAttribute("aria-hidden", "true");
        const inner = document.createElement("span");
        inner.style.setProperty("--i", i++);
        inner.textContent = part;
        outer.append(inner);
        frag.append(outer);
      }
      node.replaceWith(frag);
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  $$("[data-reveal], [data-split], [data-inview]").forEach((el) => io.observe(el));

  // ---------- petals inside a [data-petals] box (count = attribute value) ----------
  if (!reduce) {
    for (const box of $$("[data-petals]")) {
      const n = Number(box.dataset.petals) || 10;
      for (let i = 0; i < n; i++) {
        const p = document.createElement("span");
        p.className = "petal";
        p.style.cssText = `--x:${Math.round(Math.random() * box.clientWidth)}px;--dur:${10 + Math.random() * 10}s;--delay:${-Math.random() * 20}s;scale:${0.5 + Math.random() * 0.7}`;
        box.append(p);
      }
    }
  }

  // ---------- copy to clipboard ----------
  const copyables = $$("[data-copy]");
  if (copyables.length) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
    let timer = 0;
    for (const el of copyables) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        try {
          await navigator.clipboard.writeText(el.dataset.copy);
          toast.textContent = `${el.dataset.copyDone || "copied"}: ${el.dataset.copy}`;
        } catch {
          toast.textContent = el.dataset.copy;
        }
        toast.classList.add("is-on");
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove("is-on"), 1800);
      });
    }
  }

  if (reduce || !finePointer) return;

  // ---------- cursor follower: dot snaps, ring trails; grows on links, shows data-cursor labels ----------
  document.documentElement.classList.add("has-cursor");
  const cur = document.createElement("div");
  cur.className = "cursor";
  cur.setAttribute("aria-hidden", "true");
  cur.innerHTML = '<div class="cursor__ring"><span></span></div><div class="cursor__dot"></div>';
  document.body.append(cur);
  const [ring, dot] = cur.children;
  const label = ring.firstChild;
  let mx = -100, my = -100, rx = mx, ry = my, moving = 0;
  addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
    const t = e.target.closest?.("[data-cursor], a, button, [role=button], input, select, textarea");
    const text = t?.dataset.cursor || "";
    cur.classList.toggle("is-label", !!text);
    cur.classList.toggle("is-hover", !!t && !text);
    if (text) label.textContent = text;
    if (!moving) moving = requestAnimationFrame(follow);
  });
  document.addEventListener("pointerleave", () => cur.classList.add("is-gone"));
  document.addEventListener("pointerenter", () => cur.classList.remove("is-gone"));
  // the ring eases toward the pointer and the loop stops once it has caught up
  function follow() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    moving = Math.abs(mx - rx) + Math.abs(my - ry) > 0.3 ? requestAnimationFrame(follow) : 0;
  }

  // ---------- magnetic: buttons lean toward the pointer ----------
  for (const el of $$("[data-magnetic], .btn")) {
    const pull = Number(el.dataset.magnetic) || 0.25;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.classList.add("is-pulling");
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * pull}px, ${(e.clientY - r.top - r.height / 2) * pull}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.classList.remove("is-pulling");
      el.style.transform = "";
    });
  }

  // ---------- tilt cards: lean toward the pointer, a soft light follows it ----------
  for (const el of $$("[data-tilt]")) {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--rx", `${(0.5 - py) * 6}deg`);
      el.style.setProperty("--ry", `${(px - 0.5) * 8}deg`);
      el.style.setProperty("--lx", `${px * 100}%`);
      el.style.setProperty("--ly", `${py * 100}%`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  }
})();
