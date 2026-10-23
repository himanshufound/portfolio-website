// /work-with-me only: the self-building hero, the timeline arc, the Yuno card parallax and the
// preview card that trails the pointer over the "I also build" chips. motion.js runs the rest.
(() => {
  "use strict";

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const title = document.querySelector(".wm-title");

  // ---------- hero: lights out, car drives the load bar, the site builds itself ----------
  const build = document.querySelector(".wm-build");
  const bulbs = [...build.querySelectorAll(".wm-start i")];
  const img = build.querySelector(".wm-img");
  for (let i = 0; i < 9; i++) {
    const p = document.createElement("span");
    const a = (i / 9) * Math.PI * 2;
    p.className = "petal";
    p.style.cssText = `--dx:${Math.cos(a) * 140}px;--dy:${Math.sin(a) * 110}px`;
    img.append(p);
  }
  let timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const play = () => {
    timers.forEach(clearTimeout);
    timers = [];
    build.classList.remove("is-go", "is-built", "is-extra");
    title.classList.remove("is-circled");
    bulbs.forEach((b) => b.classList.remove("on"));
    if (reduce) {
      build.classList.add("is-go", "is-built", "is-extra");
      return title.classList.add("is-circled");
    }
    bulbs.forEach((b, i) => at(500 + i * 280, () => b.classList.add("on")));
    const out = 500 + 5 * 280 + 380;
    at(out, () => {
      bulbs.forEach((b) => b.classList.remove("on"));
      build.classList.add("is-go");
    });
    at(out + 700, () => build.classList.add("is-built"));
    at(out + 1500, () => build.classList.add("is-extra"));
    at(out + 1900, () => title.classList.add("is-circled"));
  };
  build.addEventListener("click", play);
  play();

  // ---------- timeline arc and yuno card parallax, both driven by scroll ----------
  const time = document.querySelector(".wm-time");
  const arc = time.querySelector(".done");
  const moon = time.querySelector(".moon");
  const yuno = document.querySelector(".wm-yuno");
  const yImg = yuno.querySelector("img");
  const frame = () => {
    const r = time.getBoundingClientRect();
    const tp = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height * 0.95)));
    arc.style.strokeDashoffset = 1 - tp;
    const pt = arc.getPointAtLength(arc.getTotalLength() * tp);
    moon.setAttribute("cx", pt.x);
    moon.setAttribute("cy", pt.y);

    const yr = yuno.getBoundingClientRect();
    yImg.style.setProperty("--by", `${(yr.top - innerHeight / 2) * -0.08}px`);
  };
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => (frame(), (ticking = false)));
  }, { passive: true });
  addEventListener("resize", frame);
  frame();

  // ---------- preview card trailing the pointer over the "I also build" chips ----------
  if (!matchMedia("(pointer: fine)").matches) return;
  const peek = document.querySelector(".wm-peek");
  let x = 0, y = 0, px = 0, py = 0, raf = 0;
  const loop = () => {
    px += (x - px) * 0.16;
    py += (y - py) * 0.16;
    peek.style.transform = `translate(${px + 20}px, ${py - 130}px)`;
    raf = requestAnimationFrame(loop);
  };
  for (const chip of document.querySelectorAll("[data-peek]")) {
    chip.addEventListener("pointerenter", (e) => {
      peek.textContent = chip.dataset.peek;
      if (!peek.classList.contains("is-on")) (px = e.clientX), (py = e.clientY);
      peek.classList.add("is-on");
      if (!raf) loop();
    });
    chip.addEventListener("pointermove", (e) => ((x = e.clientX), (y = e.clientY)));
    chip.addEventListener("pointerleave", () => peek.classList.remove("is-on"));
  }
  document.querySelector(".wm-chips").addEventListener("pointerleave", () => {
    cancelAnimationFrame(raf);
    raf = 0;
  });
})();
