(function () {
  "use strict";

  const yearNode = document.querySelector("[data-year]");
  if (yearNode) yearNode.textContent = String(new Date().getFullYear());

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
