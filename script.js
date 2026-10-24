(function () {
  "use strict";

  const yearNode = document.querySelector("[data-year]");
  if (yearNode) yearNode.textContent = String(new Date().getFullYear());

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const zh = document.documentElement.lang === "zh-CN";
  const typer = document.querySelector("[data-typer]");
  if (typer && !reduceMotion) {
    const lines = zh ? [
      "claude，这个网站能帮我拿到实习吗",
      "claude，有多少人在看我的作品集",
      "claude，我该不该改学 ai",
      "我现在也会说中文了",
    ] : [
      "hey claude, how many people viewing my portfolio",
      "claude, will this website land me an internship",
      "hey claude, should i major in ai instead",
      "i\u2019m now available in mandarin",
    ];
    let line = 0;
    let shown = 0;
    let deleting = false;
    const tick = () => {
      const text = lines[line];
      shown += deleting ? -1 : 1;
      typer.textContent = text.slice(0, shown);
      let wait = deleting ? 22 : 45 + Math.random() * 45;
      if (!deleting && shown === text.length) {
        deleting = true;
        wait = 2400;
      } else if (deleting && shown === 0) {
        deleting = false;
        line = (line + 1) % lines.length;
        wait = 400;
      }
      setTimeout(tick, wait);
    };
    setTimeout(tick, 2400);
  }

  const petalField = document.querySelector(".petals");

  if (petalField && !reduceMotion) {
    const COUNT = 14;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < COUNT; i++) {
      const petal = document.createElement("span");
      petal.className = "petal";
      const x = Math.random() * 100;
      const dur = 12 + Math.random() * 12;
      const delay = -Math.random() * dur;
      const scale = 0.6 + Math.random() * 0.8;
      petal.style.setProperty("--x", `${x}vw`);
      petal.style.setProperty("--dur", `${dur}s`);
      petal.style.setProperty("--delay", `${delay}s`);
      petal.style.transform = `translate3d(${x}vw, -10vh, 0) scale(${scale})`;
      fragment.appendChild(petal);
    }
    petalField.appendChild(fragment);

    document.addEventListener("visibilitychange", () => {
      const state = document.hidden ? "paused" : "running";
      petalField.querySelectorAll(".petal").forEach((p) => {
        p.style.animationPlayState = state;
      });
    });
  }

  // smooth in-page links with header offset
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  // subtle reveal on first paint for hero meta
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      )
    : null;

  if (io) {
    document
      .querySelectorAll(".section-title, .case, .about__grid, .hero__meta")
      .forEach((el) => io.observe(el));
  }
})();
