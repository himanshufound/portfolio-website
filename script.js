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

  /* ---------- floating music player ---------- */

  // Metadata pulled from each file's ID3 tags. Order here defines play order.
  const TRACKS = [
    { title: "DtMF", artist: "Bad Bunny", src: "audio/Bad Bunny - DtMF.mp3" },
    { title: "Brazil", artist: "Declan McKenna", src: "audio/Declan McKenna - Brazil.mp3" },
    { title: "End of Beginning", artist: "Djo", src: "audio/Djo - End of Beginning.mp3" },
    { title: "A Man Without Love", artist: "Engelbert Humperdinck", src: "audio/Engelbert Humperdinck - A Man Without Love.mp3" },
    { title: "Let's Fall in Love for the Night", artist: "FINNEAS", src: "audio/FINNEAS - Let's Fall in Love for the Night.mp3" },
    { title: "Shelter", artist: "FINNEAS", src: "audio/FINNEAS - Shelter.mp3" },
    { title: "Sign of the Times", artist: "Harry Styles", src: "audio/Harry Styles - Sign of the Times.mp3" },
    { title: "Bound 2", artist: "Kanye West", src: "audio/Kanye West - Bound 2.mp3" },
    { title: "Touch The Sky", artist: "Kanye West, Lupe Fiasco", src: "audio/Kanye West, Lupe Fiasco - Touch The Sky.mp3" },
    { title: "Runaway", artist: "Kanye West, Pusha T", src: "audio/Kanye West, Pusha T - Runaway.mp3" },
    { title: "All Falls Down", artist: "Kanye West, Syleena Johnson", src: "audio/Kanye West, Syleena Johnson - All Falls Down.mp3" },
    { title: "luther", artist: "Kendrick Lamar, SZA", src: "audio/Kendrick Lamar, SZA - luther (with sza).mp3" },
    { title: "What You Saying", artist: "Lil Uzi Vert", src: "audio/Lil Uzi Vert - What You Saying.mp3" },
    { title: "Pasta", artist: "New Rules", src: "audio/New Rules - Pasta.mp3" },
    { title: "Ophelia", artist: "The Lumineers", src: "audio/The Lumineers - Ophelia.mp3" },
  ];

  const root = document.querySelector("[data-player]");

  if (root) {
    const audio = root.querySelector("[data-audio]");
    const fab = root.querySelector("[data-player-toggle]");
    const panel = root.querySelector("#player-panel");
    const closeBtn = root.querySelector("[data-player-close]");
    const toggleBtn = root.querySelector("[data-toggle]");
    const prevBtn = root.querySelector("[data-prev]");
    const nextBtn = root.querySelector("[data-next]");
    const muteBtn = root.querySelector("[data-mute]");
    const nowTitle = root.querySelector("[data-now-title]");
    const nowArtist = root.querySelector("[data-now-artist]");
    const seek = root.querySelector("[data-seek]");
    const seekFill = root.querySelector("[data-seek-fill]");
    const elapsedNode = root.querySelector("[data-elapsed]");
    const durationNode = root.querySelector("[data-duration]");
    const list = root.querySelector("[data-list]");

    let currentIndex = 0;
    let loadedIndex = -1; // which track's src is set on the <audio> element

    const fmt = (secs) => {
      if (!isFinite(secs) || secs < 0) secs = 0;
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${String(s).padStart(2, "0")}`;
    };

    // build the track list once
    const rows = TRACKS.map((track, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "player__track";
      btn.setAttribute("aria-label", `Play ${track.title} by ${track.artist}`);
      btn.innerHTML =
        `<span class="player__track-num">${String(i + 1).padStart(2, "0")}</span>` +
        `<span class="player__track-meta">` +
        `<span class="player__track-title"></span>` +
        `<span class="player__track-artist"></span>` +
        `</span>` +
        `<span class="player__track-eq" aria-hidden="true"><span></span><span></span><span></span></span>`;
      btn.querySelector(".player__track-title").textContent = track.title;
      btn.querySelector(".player__track-artist").textContent = track.artist;
      btn.addEventListener("click", () => selectTrack(i, true));
      li.appendChild(btn);
      list.appendChild(li);
      return btn;
    });

    const markActive = () => {
      rows.forEach((btn, i) => {
        const active = i === currentIndex;
        btn.classList.toggle("is-active", active);
        if (active) btn.setAttribute("aria-current", "true");
        else btn.removeAttribute("aria-current");
      });
    };

    const renderNow = () => {
      const track = TRACKS[currentIndex];
      nowTitle.textContent = track.title;
      nowArtist.textContent = track.artist;
    };

    // Set src only for the active track so preload="none" never fetches all 16.
    const ensureLoaded = () => {
      if (loadedIndex !== currentIndex) {
        audio.src = TRACKS[currentIndex].src;
        loadedIndex = currentIndex;
      }
    };

    const play = () => {
      renderNow();
      ensureLoaded();
      const p = audio.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const selectTrack = (index, autoplay) => {
      currentIndex = (index + TRACKS.length) % TRACKS.length;
      loadedIndex = -1; // force a reload of the new src
      renderNow();
      markActive();
      seekFill.style.width = "0%";
      elapsedNode.textContent = "0:00";
      durationNode.textContent = "0:00";
      seek.setAttribute("aria-valuenow", "0");
      seek.setAttribute("aria-valuetext", "0:00");
      if (autoplay) play();
    };

    // ----- panel open / close -----
    const openPanel = () => {
      root.classList.add("is-open");
      fab.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");
      toggleBtn.focus();
    };

    const closePanel = () => {
      root.classList.remove("is-open");
      fab.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
      fab.focus();
    };

    fab.addEventListener("click", openPanel);
    closeBtn.addEventListener("click", closePanel);

    // ----- transport controls -----
    toggleBtn.addEventListener("click", () => {
      if (audio.paused) play();
      else audio.pause();
    });

    prevBtn.addEventListener("click", () => selectTrack(currentIndex - 1, true));
    nextBtn.addEventListener("click", () => selectTrack(currentIndex + 1, true));

    muteBtn.addEventListener("click", () => {
      audio.muted = !audio.muted;
      root.classList.toggle("is-muted", audio.muted);
      muteBtn.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
    });

    // ----- audio events -----
    audio.addEventListener("play", () => {
      root.classList.add("is-playing");
      toggleBtn.setAttribute("aria-label", "Pause");
    });

    audio.addEventListener("pause", () => {
      root.classList.remove("is-playing");
      toggleBtn.setAttribute("aria-label", "Play");
    });

    audio.addEventListener("loadedmetadata", () => {
      durationNode.textContent = fmt(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      const dur = audio.duration;
      const pct = isFinite(dur) && dur > 0 ? (audio.currentTime / dur) * 100 : 0;
      seekFill.style.width = `${pct}%`;
      elapsedNode.textContent = fmt(audio.currentTime);
      seek.setAttribute("aria-valuenow", String(Math.round(pct)));
      seek.setAttribute("aria-valuetext", fmt(audio.currentTime));
    });

    // auto-advance, wrapping to the first track after the last
    audio.addEventListener("ended", () => selectTrack(currentIndex + 1, true));

    // ----- seek bar -----
    const seekToClientX = (clientX) => {
      const dur = audio.duration;
      if (!isFinite(dur) || dur <= 0) return;
      const rect = seek.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      audio.currentTime = ratio * dur;
    };

    seek.addEventListener("click", (e) => seekToClientX(e.clientX));

    seek.addEventListener("keydown", (e) => {
      const dur = audio.duration;
      if (!isFinite(dur) || dur <= 0) return;
      let handled = true;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        audio.currentTime = Math.min(dur, audio.currentTime + 5);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      } else if (e.key === "Home") {
        audio.currentTime = 0;
      } else if (e.key === "End") {
        audio.currentTime = dur;
      } else {
        handled = false;
      }
      if (handled) e.preventDefault();
    });

    // ----- keyboard: space toggles play/pause only while panel is open -----
    document.addEventListener("keydown", (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (!root.classList.contains("is-open")) return; // don't hijack globally
      // let buttons / slider handle their own activation
      const t = e.target;
      if (t && root.contains(t) && (t.tagName === "BUTTON" || t.hasAttribute("role"))) {
        return;
      }
      e.preventDefault();
      if (audio.paused) play();
      else audio.pause();
    });

    // Escape closes the panel
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.classList.contains("is-open")) closePanel();
    });

    // initial paint (no audio fetched yet — src is set on first play).
    // Leave the "Press play to begin" placeholder until the first play/select.
    markActive();
  }
})();
