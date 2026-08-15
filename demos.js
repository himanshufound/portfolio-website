/*
 * Interactive project previews.
 *
 * Each demo is a tiny step machine: JS owns the step number, CSS owns every
 * transition keyed off [data-step]. The markup ships in step 0, so the page
 * looks right with JS disabled or still loading.
 */
(function () {
  "use strict";

  /* ---------- shared ---------- */

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = motionQuery.matches;
  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", (e) => {
      reduceMotion = e.matches;
    });
  }

  // Crossfading text: exactly one .swap__item holds .is-active, and the
  // inactive copies leave the accessibility tree so they aren't read twice.
  const swapTo = (group, index) => {
    if (!group) return;
    const items = group.querySelectorAll(":scope > .swap__item");
    items.forEach((item, i) => {
      const active = i === index;
      item.classList.toggle("is-active", active);
      if (active) item.removeAttribute("aria-hidden");
      else item.setAttribute("aria-hidden", "true");
    });
  };

  const swapText = (group, index) => {
    if (!group) return "";
    const item = group.querySelectorAll(":scope > .swap__item")[index];
    return item ? item.textContent.replace(/\s+/g, " ").trim() : "";
  };

  // Run cb only while el is on screen; used for continuous animation loops.
  // threshold 0, not a fraction: a control the user can physically press must
  // never be classified as off-screen.
  const gate = (el, onEnter, onExit) => {
    if (!el || !("IntersectionObserver" in window)) {
      onEnter();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) onEnter();
          else onExit();
        });
      },
      { threshold: 0 },
    );
    io.observe(el);
  };

  /**
   * @param {HTMLElement} root  element carrying [data-demo] and [data-step]
   * @param {{steps: Array}} spec
   */
  function createDemo(root, spec) {
    const live = root.querySelector("[data-live]");
    const hint = root.querySelector("[data-hint]");
    const replay = root.querySelector("[data-replay]");
    const steps = spec.steps;

    let step = 0;
    let timer = 0;

    const clearTimer = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
    };

    const api = {
      root,
      // assign unconditionally: a stale confirmation left in the region
      // describes a state the UI no longer shows
      say(text) {
        if (live) live.textContent = text || "";
      },
      setHint(text) {
        if (!hint) return;
        hint.textContent = text || "";
        hint.hidden = !text;
      },
      get step() {
        return step;
      },
      get reduceMotion() {
        return reduceMotion;
      },
      goTo(index, options) {
        const opts = options || {};
        clearTimer();
        step = Math.max(0, Math.min(steps.length - 1, index));
        root.dataset.step = String(step);

        const s = steps[step];
        if (s.enter) s.enter(api);
        if (!opts.silent)
          api.say(typeof s.say === "function" ? s.say() : s.say);
        api.setHint(typeof s.hint === "function" ? s.hint() : s.hint);
        if (replay) replay.hidden = !s.replay;

        if (s.next) {
          // The dwell is reading time, not motion — reduced motion is handled
          // entirely in CSS. Shortening it here would collide two polite
          // status messages into one announcement window. The exception is a
          // dwell that exists to outlast an animation, which passes a function.
          const delay =
            typeof s.next.delay === "function" ? s.next.delay() : s.next.delay;
          timer = window.setTimeout(() => api.goTo(s.next.step), delay);
        }
      },
      clearTimer,
    };

    if (replay) {
      replay.addEventListener("click", () => {
        // move focus before goTo hides this button, or focus lands on <body>
        const first = root.querySelector("[data-demo-start]");
        if (first) first.focus();
        api.goTo(0);
      });
    }

    // these controls do nothing until this file runs, so they only join the
    // tab order once it has
    root.querySelectorAll("[data-needs-js]").forEach((el) => {
      el.removeAttribute("tabindex");
    });

    root.classList.add("is-interactive");
    api.goTo(0, { silent: true });
    return api;
  }

  /* ---------- pillybot: a dose, taken, and a family quietly told ---------- */

  // Each demo mounts inside its own try: the three are sequential statements in
  // one IIFE, so an unguarded throw in the first would leave the others static
  // with their controls still pulled out of the tab order.
  const mount = (name, fn) => {
    try {
      fn();
    } catch (err) {
      if (window.console) window.console.error(`${name} demo failed`, err);
    }
  };

  const pilly = document.querySelector('[data-demo="pilly"]');

  mount("pillybot", () => {
    if (pilly) {
      const dose = pilly.querySelector("[data-dose]");
      const doseAction = pilly.querySelector("[data-dose-action]");
      const chat = pilly.querySelector("[data-chat]");
      const doseMeta = pilly.querySelector('[data-swap="dose-meta"]');
      const family = pilly.querySelector('[data-swap="family"]');
      const chatSwap = pilly.querySelector('[data-swap="chat"]');
      const chatCount = chatSwap
        ? chatSwap.querySelectorAll(":scope > .swap__item").length
        : 0;

      let chatIndex = 0;
      let demo = null; // assigned below; step 0 runs during createDemo()

      const labelChat = () => {
        if (!chat) return;
        chat.setAttribute(
          "aria-label",
          swapText(chatSwap, chatIndex) + " — show the next message",
        );
      };

      const showChat = (index, announce) => {
        chatIndex = ((index % chatCount) + chatCount) % chatCount;
        swapTo(chatSwap, chatIndex);
        labelChat();
        if (announce && demo) demo.say(swapText(chatSwap, chatIndex));
      };

      demo = createDemo(pilly, {
        steps: [
          {
            say: "Reminder reset. Donepezil is due after breakfast.",
            hint: "try the reminder",
            enter() {
              swapTo(doseMeta, 0);
              swapTo(family, 0);
              showChat(0, false);
              if (dose) dose.removeAttribute("aria-disabled");
              // the button's name comes from its own visible text; this prefix
              // only supplies the verb, so "1 tab" stays in the name (WCAG 2.5.3)
              if (doseAction) doseAction.textContent = "Mark as taken:";
            },
          },
          {
            say: "Ticked off today's list.",
            hint: "",
            next: { step: 2, delay: 1150 },
            enter() {
              swapTo(doseMeta, 1);
              if (dose) dose.setAttribute("aria-disabled", "true");
              if (doseAction) doseAction.textContent = "Taken:";
            },
          },
          {
            say: "Mom notified. pillybot sent the family a quiet update.",
            hint: "try the message",
            replay: true,
            enter() {
              swapTo(family, 1);
              showChat(1, false);
            },
          },
        ],
      });

      if (dose) {
        dose.setAttribute("data-demo-start", "");
        dose.addEventListener("click", () => {
          if (dose.getAttribute("aria-disabled") === "true") return;
          demo.goTo(1);
        });
      }

      if (chat) {
        // no live announcement: the message body IS this button's accessible
        // name, so renaming the focused element already reads it out once
        chat.addEventListener("click", () => showChat(chatIndex + 1, false));
      }
    }
  });

  /* ---------- focusflow: a lap, a stall, a nudge that earns its place ---------- */

  const flow = document.querySelector('[data-demo="flow"]');

  mount("focusflow", () => {
    if (flow) {
      const startBtn = flow.querySelector("[data-start]");
      const startLabel = flow.querySelector("[data-start-label]");
      const timeNode = flow.querySelector("[data-time]");
      const lapNode = flow.querySelector("[data-lap]");
      const bars = Array.from(flow.querySelectorAll("[data-bars] > span"));
      const focusSwap = flow.querySelector('[data-swap="focus"]');
      const claudeSwap = flow.querySelector('[data-swap="claude"]');
      const splitAction = flow.querySelector("[data-split-action]");
      const origin = flow.querySelector("[data-origin]");
      const splits = flow.querySelector("[data-splits]");
      const originInner = origin.querySelector(".dashboard__collapse-inner");
      const splitsInner = splits.querySelector(".dashboard__collapse-inner");
      const tasks = Array.from(flow.querySelectorAll("[data-task]"));

      const LAP_SECONDS = 25 * 60;
      const RESTING = bars.map((bar) =>
        bar.style.getPropertyValue("--h").trim(),
      );
      const INITIAL_DONE = tasks.map(
        (task) => task.getAttribute("aria-pressed") === "true",
      );
      // scripted telemetry: strong start, a stall around bar 7, recovery after the split
      const BASE = [34, 52, 61, 74, 82, 88, 44, 36, 62, 70];
      const RECOVERED = [34, 52, 61, 74, 82, 88, 44, 36, 84, 96];
      const DIP_AT = 0.64; // ~16 minutes in, matching claude's line

      let demo = null;
      let raf = 0;
      let last = 0;
      let elapsed = 0;
      let paused = false;
      let didSplit = false;
      let nudged = false;
      let offScreen = false;
      let wantsRun = false;
      // pinned when the lap starts: if the motion preference flipped mid-lap,
      // a changing denominator would jump the clock to the finish
      let lapDuration = 15000;

      const lapMs = () => lapDuration;

      // Lap length is pacing, not animation. Reduced motion gets a shorter lap,
      // but not so short that the ~36% after the dip leaves no time to notice
      // the nudge and act on it.
      const chooseLapDuration = () => (reduceMotion ? 6000 : 15000);

      // hiding a focused control drops focus on <body>; hand it back first
      const hideSplit = () => {
        if (!splitAction || splitAction.hidden) return;
        if (document.activeElement === splitAction && startBtn)
          startBtn.focus();
        splitAction.hidden = true;
      };

      const clock = (secs) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      };

      const setLabel = () => {
        if (!startLabel) return;
        if (flow.dataset.step === "2") startLabel.textContent = "run it again";
        else if (flow.dataset.step === "1")
          startLabel.textContent = paused ? "resume" : "pause";
        else startLabel.textContent = "start the lap";
      };

      const paintBars = (progress) => {
        const profile = didSplit ? RECOVERED : BASE;
        bars.forEach((bar, i) => {
          const from = i / bars.length;
          const span = 1 / bars.length;
          let local = (progress - from) / span;
          local = Math.min(1, Math.max(0, local));
          // reduced motion: bars land rather than climb
          if (reduceMotion) local = local > 0 ? 1 : 0;
          const height = 4 + (profile[i] - 4) * local;
          bar.style.setProperty("--h", `${height.toFixed(1)}%`);
        });
      };

      const restBars = () => {
        bars.forEach((bar, i) => bar.style.setProperty("--h", RESTING[i]));
      };

      const openNudge = () => {
        nudged = true;
        flow.dataset.nudge = "open";
        swapTo(focusSwap, 2);
        swapTo(claudeSwap, 1);
        if (splitAction) splitAction.hidden = false;
        if (demo)
          demo.say("Momentum dropped. Claude suggests splitting the task.");
      };

      const applySplit = () => {
        if (didSplit) return;
        didSplit = true;
        // the row about to collapse may hold focus; hand it to its replacement
        // rather than dropping the user back on <body>
        const hadFocus =
          origin.contains(document.activeElement) ||
          document.activeElement === splitAction;
        flow.dataset.nudge = "resolved";
        origin.classList.add("is-closed");
        originInner.setAttribute("inert", "");
        splits.classList.remove("is-closed");
        splitsInner.removeAttribute("inert");
        swapTo(focusSwap, 1);
        swapTo(claudeSwap, 2);
        if (splitAction) splitAction.hidden = true;
        if (hadFocus) {
          const heir = splits.querySelector("[data-task]");
          if (heir) heir.focus();
        }
        if (demo) demo.say("Task split in two. Focus back to deep.");
      };

      // claude's closing line has to match what the visitor actually ticked
      const NUMBER = ["no", "one", "two", "three", "four", "five"];
      const live = (task) => {
        const wrap = task.closest(".dashboard__collapse");
        return !(wrap && wrap.classList.contains("is-closed"));
      };

      const writeTally = () => {
        const shown = tasks.filter(live);
        const done = shown.filter(
          (task) => task.getAttribute("aria-pressed") === "true",
        ).length;
        const line = claudeSwap.querySelectorAll(":scope > .swap__item")[3];
        if (!line) return;
        const word = (n) => NUMBER[n] || String(n);
        line.textContent =
          done === 0
            ? "nothing ticked. the lap still counts."
            : `${word(done)} of ${word(shown.length)} done. that’s a lap.`;
      };

      const stop = () => {
        if (raf) {
          window.cancelAnimationFrame(raf);
          raf = 0;
        }
        last = 0;
      };

      const frame = (now) => {
        raf = 0;
        if (paused || offScreen) return;
        if (!last) last = now;
        // a backgrounded tab can hand back a huge delta; don't let it skip the lap
        const dt = Math.min(100, now - last);
        last = now;
        elapsed = Math.min(lapMs(), elapsed + dt);

        const progress = elapsed / lapMs();
        timeNode.textContent = clock(Math.ceil(LAP_SECONDS * (1 - progress)));
        paintBars(progress);
        if (!nudged && progress >= DIP_AT) openNudge();

        if (elapsed >= lapMs()) {
          if (demo) demo.goTo(2);
          return;
        }
        raf = window.requestAnimationFrame(frame);
      };

      const run = () => {
        stop();
        if (offScreen) return;
        raf = window.requestAnimationFrame(frame);
      };

      demo = createDemo(flow, {
        steps: [
          {
            enter() {
              wantsRun = false;
              stop();
              elapsed = 0;
              paused = false;
              didSplit = false;
              nudged = false;
              flow.classList.remove("is-paused");
              flow.dataset.nudge = "idle";
              timeNode.textContent = clock(LAP_SECONDS);
              lapNode.textContent = "lap 03 / 04";
              restBars();
              swapTo(focusSwap, 0);
              swapTo(claudeSwap, 0);
              hideSplit();
              origin.classList.remove("is-closed");
              originInner.removeAttribute("inert");
              splits.classList.add("is-closed");
              splitsInner.setAttribute("inert", "");
              tasks.forEach((task, i) =>
                task.setAttribute("aria-pressed", String(INITIAL_DONE[i])),
              );
              setLabel();
            },
          },
          {
            say: "Lap started. 25 minutes.",
            enter() {
              lapDuration = chooseLapDuration();
              wantsRun = true;
              lapNode.textContent = "lap 04 / 04";
              swapTo(focusSwap, 1);
              paintBars(0);
              setLabel();
              run();
            },
          },
          {
            say: "Lap complete.",
            enter() {
              wantsRun = false;
              stop();
              elapsed = lapMs();
              timeNode.textContent = "00:00";
              paintBars(1);
              writeTally();
              swapTo(focusSwap, 3);
              swapTo(claudeSwap, 3);
              flow.dataset.nudge = "idle";
              hideSplit();
              setLabel();
            },
          },
        ],
      });

      if (startBtn) {
        startBtn.addEventListener("click", () => {
          const step = flow.dataset.step;
          if (step === "0") {
            demo.goTo(1);
          } else if (step === "1") {
            paused = !paused;
            wantsRun = !paused;
            flow.classList.toggle("is-paused", paused);
            setLabel();
            if (paused) {
              stop();
              demo.say("Lap paused.");
            } else {
              run();
              demo.say("Lap resumed.");
            }
          } else {
            demo.goTo(0);
            demo.goTo(1);
          }
        });
      }

      if (splitAction) splitAction.addEventListener("click", applySplit);

      tasks.forEach((task) => {
        task.addEventListener("click", () => {
          const done = task.getAttribute("aria-pressed") === "true";
          task.setAttribute("aria-pressed", String(!done));
          const label = task.querySelector(".dashboard__task-label");
          const name = label ? label.textContent.trim() : "task";
          demo.say(done ? `${name} reopened.` : `${name} done.`);
        });
      });

      // a lap that keeps ticking off-screen is wasted work. `wantsRun` is the
      // single source of truth for "should the clock be moving" — inferring it
      // from step + paused + raf duplicated state across three places.
      gate(
        flow,
        () => {
          offScreen = false;
          if (wantsRun) run();
        },
        () => {
          offScreen = true;
          stop();
        },
      );
    }
  });

  /* ---------- aimpact: human or agent, both end at the same person ---------- */

  const board = document.querySelector('[data-demo="board"]');

  mount("aimpact", () => {
    if (board) {
      const go = board.querySelector("[data-go]");
      const rail = board.querySelector("[data-rail]");
      const token = board.querySelector("[data-token]");
      const fill = board.querySelector(".rail__fill");
      const stops = Array.from(board.querySelectorAll(".rail__stop"));
      const chipSwap = board.querySelector('[data-swap="chip"]');
      const noteSwap = board.querySelector('[data-swap="note"]');
      const openNode = board.querySelector("[data-open]");
      const laneBtns = Array.from(board.querySelectorAll("[data-lane-btn]"));

      const LAST = stops.length - 1;
      let demo = null;

      const lane = () => board.dataset.lane;

      const tokenLabel = (step) => {
        if (step >= 3) return "live";
        if (step === 2) return "the work";
        return lane() === "agent" ? "agent" : "you";
      };

      // measured rather than computed: the rail is fluid and the pill's width
      // changes with its label
      const placeToken = () => {
        const step = Number(board.dataset.step) || 0;
        const target = stops[Math.min(step, LAST)];
        const dot = target && target.querySelector(".rail__dot");
        if (!dot || !rail || !token) return;
        const railBox = rail.getBoundingClientRect();
        const dotBox = dot.getBoundingClientRect();
        const centre = dotBox.left + dotBox.width / 2 - railBox.left;
        token.style.setProperty(
          "--x",
          `${(centre - token.offsetWidth / 2).toFixed(1)}px`,
        );
      };

      const paintRail = (step) => {
        stops.forEach((stop, i) => {
          stop.classList.toggle("is-done", i < step);
          stop.classList.toggle("is-current", i === step);
        });
        if (fill) fill.style.setProperty("--f", String(step / LAST));
        if (token) token.textContent = tokenLabel(step);
        placeToken();
      };

      const setGo = (label, blocked) => {
        if (!go) return;
        go.textContent = label;
        if (blocked) go.setAttribute("aria-disabled", "true");
        else go.removeAttribute("aria-disabled");
      };

      demo = createDemo(board, {
        steps: [
          {
            say: "Task posted, unclaimed.",
            enter() {
              swapTo(chipSwap, 0);
              swapTo(noteSwap, 0);
              if (openNode) openNode.textContent = "12";
              paintRail(0);
              setGo(lane() === "agent" ? "send an agent" : "claim it", false);
            },
          },
          {
            say: () =>
              lane() === "agent"
                ? "An AI agent claimed the task."
                : "You claimed the task.",
            enter() {
              swapTo(chipSwap, 1);
              swapTo(noteSwap, lane() === "agent" ? 2 : 1);
              paintRail(1);
              setGo("hand in the work", false);
            },
          },
          {
            say: "Handed in. A human at Clean Water Trust is reviewing it.",
            next: { step: 3, delay: 1900 },
            enter() {
              swapTo(noteSwap, 3);
              paintRail(2);
              setGo("a human is reviewing", true);
            },
          },
          {
            say: "Approved by a person, then shipped. Eleven tasks left open.",
            enter() {
              swapTo(noteSwap, 4);
              if (openNode) openNode.textContent = "11";
              paintRail(3);
              setGo("run it again", false);
            },
          },
        ],
      });

      if (go) {
        go.addEventListener("click", () => {
          if (go.getAttribute("aria-disabled") === "true") return;
          const step = Number(board.dataset.step) || 0;
          demo.goTo(step >= 3 ? 0 : step + 1);
        });
      }

      // Both lane buttons ship as tabindex="-1" so they aren't announced as
      // operable before this file runs; chooseLane owns the roving tabindex from
      // here on, and is called once at init to establish it.
      const syncLanes = (name) => {
        laneBtns.forEach((btn) => {
          const on = btn.dataset.laneBtn === name;
          btn.setAttribute("aria-checked", String(on));
          btn.tabIndex = on ? 0 : -1;
        });
      };

      const chooseLane = (name, focusIt) => {
        board.dataset.lane = name;
        syncLanes(name);
        if (focusIt) {
          const on = laneBtns.find((btn) => btn.dataset.laneBtn === name);
          if (on) on.focus();
        }
        // switching who takes it restarts the journey, so the two lanes are
        // genuinely comparable
        demo.goTo(0, { silent: true });
        demo.say(
          name === "agent"
            ? "An AI agent will take it. The journey resets."
            : "A human will take it. The journey resets.",
        );
      };

      laneBtns.forEach((btn, i) => {
        btn.addEventListener("click", () =>
          chooseLane(btn.dataset.laneBtn, false),
        );
        btn.addEventListener("keydown", (e) => {
          const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
          const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
          if (!forward && !back) return;
          // held arrow keys would otherwise reset the journey at the OS repeat
          // rate and flood the live region
          if (e.repeat) return;
          e.preventDefault();
          const next =
            laneBtns[
              (i + (forward ? 1 : -1) + laneBtns.length) % laneBtns.length
            ];
          chooseLane(next.dataset.laneBtn, true);
        });
      });

      syncLanes(board.dataset.lane);

      if (rail && "ResizeObserver" in window) {
        new ResizeObserver(placeToken).observe(rail);
      } else {
        window.addEventListener("resize", placeToken);
      }
      // web fonts land after first paint and change the pill's width
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(placeToken);
      }
    }
  });

  /* ---------- slipstream: a call, a read, and one recommendation ---------- */

  const radio = document.querySelector('[data-demo="radio"]');

  mount("slipstream", () => {
    if (radio) {
      // Real readings from the demo session (2024 Hungarian GP, Norris), so the
      // mockup can't claim anything the tool doesn't actually output. The comms
      // budget is deliberately identical across all three: the tool never holds
      // a call back on a weak reading, and flattening that would misrepresent it.
      const CALLS = [
        {
          stamp: "lap 61 · 14:28:17z",
          clip: "Team radio clip, 6.7 seconds",
          quote: "“yeah, tell him to catch up then, please.”",
          state: "energised",
          z: "+1.69σ",
          conf: "0.67",
          voice: "energised at 0.67 confidence",
          car: "brake variance 42.6",
          time: "blue flag · car 24",
          agree: "3 of 3 channels agree.",
          budget: "26 words · a full briefing fits",
        },
        {
          stamp: "lap 70 · 14:43:14z",
          clip: "Team radio clip, 11.2 seconds",
          quote: "“well done, good one, two, good load of points. congrats, t.”",
          state: "fatigued",
          z: "−1.36σ",
          conf: "0.48",
          voice: "fatigued at 0.48 confidence",
          car: "brake variance 36.0",
          time: "no race control for this call",
          agree: "2 of 3 channels agree.",
          budget: "26 words · this reading is too weak to hold a call back",
        },
        {
          stamp: "lap 56 · 14:20:31z",
          clip: "Team radio clip, 16.1 seconds",
          quote: "“doesn’t matter. i mean, it does. for me, maybe.”",
          state: "uncertain",
          z: "−1.18σ",
          conf: "0.00",
          voice: "refused · under 1.5s of voiced audio",
          car: "brake variance 43.3",
          time: "blue flag · car 20",
          agree: "The state reading was refused, not produced.",
          budget: "26 words · state refused, listen to the clip yourself",
        },
      ];

      const go = radio.querySelector("[data-go]");
      const wave = radio.querySelector("[data-wave]");
      const callBtns = Array.from(radio.querySelectorAll("[data-call]"));
      const out = {
        stamp: radio.querySelector("[data-stamp]"),
        quote: radio.querySelector("[data-quote]"),
        state: radio.querySelector("[data-state]"),
        z: radio.querySelector("[data-z]"),
        conf: radio.querySelector("[data-conf]"),
        voice: radio.querySelector("[data-ch-voice]"),
        car: radio.querySelector("[data-ch-car]"),
        time: radio.querySelector("[data-ch-time]"),
        verdict: radio.querySelector("[data-verdict]"),
        budget: radio.querySelector("[data-budget]"),
      };

      let index = 0;
      let demo = null;

      const call = () => CALLS[index];

      const write = (node, text) => {
        if (node) node.textContent = text;
      };

      // Only the clip and the transcript are known before the pipeline runs;
      // everything downstream of the read stays blank rather than stale.
      const paintIdle = () => {
        const c = call();
        write(out.stamp, c.stamp);
        write(out.quote, c.quote);
        write(out.state, "—");
        write(out.z, "—");
        write(out.conf, "—");
        write(out.voice, "not read yet");
        write(out.car, c.car);
        write(out.time, c.time);
        write(out.verdict, "—");
        write(out.budget, "waiting on the clip");
        if (wave) wave.setAttribute("aria-label", c.clip);
      };

      const paintRead = () => {
        const c = call();
        write(out.state, c.state);
        write(out.z, c.z);
        write(out.conf, c.conf);
      };

      const paintComms = () => {
        const c = call();
        write(out.voice, c.voice);
        write(out.verdict, "safe to talk");
        write(out.budget, c.budget);
      };

      const setGo = (label, blocked) => {
        if (!go) return;
        go.textContent = label;
        if (blocked) go.setAttribute("aria-disabled", "true");
        else go.removeAttribute("aria-disabled");
      };

      // The sweep is CSS; this only has to outlast it. Reduced motion collapses
      // the animation to nothing, so the dwell shrinks to reading time alone.
      const clipMs = () => (reduceMotion ? 700 : 2650);

      demo = createDemo(radio, {
        steps: [
          {
            say: () => `${call().stamp}. Clip loaded, not yet read.`,
            hint: "three calls flagged — try another",
            enter() {
              paintIdle();
              setGo("play the call", false);
            },
          },
          {
            say: () => `Playing. ${call().quote}`,
            hint: "",
            next: { step: 2, delay: clipMs },
            enter() {
              setGo("reading the clip", true);
            },
          },
          {
            say: () =>
              `Read: ${call().state}, ${call().z} against his own baseline, confidence ${call().conf}.`,
            hint: "",
            next: { step: 3, delay: 950 },
            enter() {
              paintRead();
            },
          },
          {
            say: () =>
              `${call().agree} Comms: safe to talk, ${call().budget.split(" · ")[0]}.`,
            hint: "",
            enter() {
              paintComms();
              setGo("run it again", false);
            },
          },
        ],
      });

      if (go) {
        go.addEventListener("click", () => {
          if (go.getAttribute("aria-disabled") === "true") return;
          if (Number(radio.dataset.step) >= 3) demo.goTo(0, { silent: true });
          demo.goTo(1);
        });
      }

      // Same roving-tabindex radiogroup as the aimpact lanes: the queue rows
      // ship as tabindex="-1" so they aren't announced as operable before this
      // file runs, and chooseCall owns the tabindex from here on.
      const syncCalls = () => {
        callBtns.forEach((btn, i) => {
          const on = i === index;
          btn.setAttribute("aria-checked", String(on));
          btn.tabIndex = on ? 0 : -1;
        });
      };

      const chooseCall = (i, focusIt) => {
        index = i;
        syncCalls();
        if (focusIt) callBtns[i].focus();
        // a different clip is a different reading; nothing from the last one survives
        demo.goTo(0, { silent: true });
        demo.say(`${call().stamp} loaded. Play it to read the clip.`);
      };

      callBtns.forEach((btn, i) => {
        btn.addEventListener("click", () => chooseCall(i, false));
        btn.addEventListener("keydown", (e) => {
          const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
          const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
          if (!forward && !back) return;
          // held arrow keys would reload the clip at the OS repeat rate
          if (e.repeat) return;
          e.preventDefault();
          chooseCall(
            (i + (forward ? 1 : -1) + callBtns.length) % callBtns.length,
            true,
          );
        });
      });

      syncCalls();
    }
  });
})();
