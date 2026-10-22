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

  // zh.html sets lang="zh-CN"; any string missing here stays English
  const zh = document.documentElement.lang === "zh-CN";
  const ZH = zh
    ? {
        " — show the next message": "，点一下看下一条",
        "Reminder reset. Donepezil is due after breakfast.": "提醒已重置。早饭后该吃多奈哌齐了。",
        "try the reminder": "点一下提醒",
        "Mark as taken:": "标记为已服用：",
        "Ticked off today's list.": "今天的清单已勾掉。",
        "Taken:": "已服用：",
        "Mom notified. pillybot sent the family a quiet update.": "已通知妈妈。pillybot 悄悄给家人发了一条更新。",
        "try the message": "点一下消息",
        "run it again": "再来一次",
        "resume": "继续",
        "pause": "暂停",
        "start the lap": "开始这一圈",
        "Momentum dropped. Claude suggests splitting the task.": "节奏掉了。Claude 建议把任务拆开。",
        "Task split in two. Focus back to deep.": "任务一分为二。专注回到深度状态。",
        "nothing ticked. the lap still counts.": "一个都没勾。这一圈照样算数。",
        "lap 03 / 04": "第 03 / 04 圈",
        "lap 04 / 04": "第 04 / 04 圈",
        "Lap started. 25 minutes.": "这一圈开始了。25 分钟。",
        "Lap complete.": "这一圈完成。",
        "Lap paused.": "这一圈已暂停。",
        "Lap resumed.": "这一圈已继续。",
        "task": "任务",
        live: "上线",
        "the work": "作品",
        agent: "智能体",
        you: "你",
        "Task posted, unclaimed.": "任务已发布，暂无人认领。",
        "send an agent": "派一个智能体",
        "claim it": "认领它",
        "An AI agent claimed the task.": "一个 AI 智能体认领了任务。",
        "You claimed the task.": "你认领了任务。",
        "hand in the work": "提交作品",
        "Handed in. A human at Clean Water Trust is reviewing it.": "已提交。清水信托的一位工作人员正在审核。",
        "a human is reviewing": "人工审核中",
        "Approved by a person, then shipped. Eleven tasks left open.": "人工审核通过后上线。还有十一个任务待认领。",
        "An AI agent will take it. The journey resets.": "交给 AI 智能体。流程重新开始。",
        "A human will take it. The journey resets.": "交给真人。流程重新开始。",
        "Team radio clip, 6.7 seconds": "车队无线电片段，6.7 秒",
        "Team radio clip, 11.2 seconds": "车队无线电片段，11.2 秒",
        "Team radio clip, 16.1 seconds": "车队无线电片段，16.1 秒",
        energised: "亢奋",
        fatigued: "疲惫",
        uncertain: "不确定",
        "energised at 0.67 confidence": "亢奋，置信度 0.67",
        "fatigued at 0.48 confidence": "疲惫，置信度 0.48",
        "refused · under 1.5s of voiced audio": "拒绝判断 · 有效语音不足 1.5 秒",
        "brake variance 42.6": "刹车方差 42.6",
        "brake variance 36.0": "刹车方差 36.0",
        "brake variance 43.3": "刹车方差 43.3",
        "blue flag · car 24": "蓝旗 · 24 号车",
        "blue flag · car 20": "蓝旗 · 20 号车",
        "no race control for this call": "这次通话没有赛事干预",
        "3 of 3 channels agree.": "三个信号源全部一致。",
        "2 of 3 channels agree.": "三个信号源中两个一致。",
        "The state reading was refused, not produced.": "状态判断被拒绝，没有给出结果。",
        "26 words · a full briefing fits": "26 字 · 完整简报放得下",
        "26 words · this reading is too weak to hold a call back": "26 字 · 这次判断太弱，不足以压下一次通话",
        "26 words · state refused, listen to the clip yourself": "26 字 · 状态拒绝判断，请自己听片段",
        "not read yet": "尚未判断",
        "waiting on the clip": "等待片段",
        "safe to talk": "可以通话",
        "three calls flagged — try another": "标记了三段通话，换一段试试",
        "play the call": "播放通话",
        "reading the clip": "正在判断片段",
      }
    : {};
  const tr = (s) => ZH[s] || s;

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
          swapText(chatSwap, chatIndex) + tr(" — show the next message"),
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
            say: tr("Reminder reset. Donepezil is due after breakfast."),
            hint: tr("try the reminder"),
            enter() {
              swapTo(doseMeta, 0);
              swapTo(family, 0);
              showChat(0, false);
              if (dose) dose.removeAttribute("aria-disabled");
              // the button's name comes from its own visible text; this prefix
              // only supplies the verb, so "1 tab" stays in the name (WCAG 2.5.3)
              if (doseAction) doseAction.textContent = tr("Mark as taken:");
            },
          },
          {
            say: tr("Ticked off today's list."),
            hint: "",
            next: { step: 2, delay: 1150 },
            enter() {
              swapTo(doseMeta, 1);
              if (dose) dose.setAttribute("aria-disabled", "true");
              if (doseAction) doseAction.textContent = tr("Taken:");
            },
          },
          {
            say: tr("Mom notified. pillybot sent the family a quiet update."),
            hint: tr("try the message"),
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
        if (flow.dataset.step === "2") startLabel.textContent = tr("run it again");
        else if (flow.dataset.step === "1")
          startLabel.textContent = tr(paused ? "resume" : "pause");
        else startLabel.textContent = tr("start the lap");
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
          demo.say(tr("Momentum dropped. Claude suggests splitting the task."));
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
        if (demo) demo.say(tr("Task split in two. Focus back to deep."));
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
            ? tr("nothing ticked. the lap still counts.")
            : zh
              ? `完成 ${done} / ${shown.length}。这就是一圈。`
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
              lapNode.textContent = tr("lap 03 / 04");
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
            say: tr("Lap started. 25 minutes."),
            enter() {
              lapDuration = chooseLapDuration();
              wantsRun = true;
              lapNode.textContent = tr("lap 04 / 04");
              swapTo(focusSwap, 1);
              paintBars(0);
              setLabel();
              run();
            },
          },
          {
            say: tr("Lap complete."),
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
              demo.say(tr("Lap paused."));
            } else {
              run();
              demo.say(tr("Lap resumed."));
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
          const name = label ? label.textContent.trim() : tr("task");
          demo.say(
            zh
              ? `${name}，${done ? "已重新打开" : "已完成"}。`
              : done ? `${name} reopened.` : `${name} done.`,
          );
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
        if (step >= 3) return tr("live");
        if (step === 2) return tr("the work");
        return tr(lane() === "agent" ? "agent" : "you");
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
            say: tr("Task posted, unclaimed."),
            enter() {
              swapTo(chipSwap, 0);
              swapTo(noteSwap, 0);
              if (openNode) openNode.textContent = "12";
              paintRail(0);
              setGo(tr(lane() === "agent" ? "send an agent" : "claim it"), false);
            },
          },
          {
            say: () =>
              tr(
                lane() === "agent"
                  ? "An AI agent claimed the task."
                  : "You claimed the task.",
              ),
            enter() {
              swapTo(chipSwap, 1);
              swapTo(noteSwap, lane() === "agent" ? 2 : 1);
              paintRail(1);
              setGo(tr("hand in the work"), false);
            },
          },
          {
            say: tr("Handed in. A human at Clean Water Trust is reviewing it."),
            next: { step: 3, delay: 1900 },
            enter() {
              swapTo(noteSwap, 3);
              paintRail(2);
              setGo(tr("a human is reviewing"), true);
            },
          },
          {
            say: tr("Approved by a person, then shipped. Eleven tasks left open."),
            enter() {
              swapTo(noteSwap, 4);
              if (openNode) openNode.textContent = "11";
              paintRail(3);
              setGo(tr("run it again"), false);
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
          tr(
            name === "agent"
              ? "An AI agent will take it. The journey resets."
              : "A human will take it. The journey resets.",
          ),
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
          clip: tr("Team radio clip, 6.7 seconds"),
          quote: "“yeah, tell him to catch up then, please.”",
          state: tr("energised"),
          z: "+1.69σ",
          conf: "0.67",
          voice: tr("energised at 0.67 confidence"),
          car: tr("brake variance 42.6"),
          time: tr("blue flag · car 24"),
          agree: tr("3 of 3 channels agree."),
          budget: tr("26 words · a full briefing fits"),
        },
        {
          stamp: "lap 70 · 14:43:14z",
          clip: tr("Team radio clip, 11.2 seconds"),
          quote: "“well done, good one, two, good load of points. congrats, t.”",
          state: tr("fatigued"),
          z: "−1.36σ",
          conf: "0.48",
          voice: tr("fatigued at 0.48 confidence"),
          car: tr("brake variance 36.0"),
          time: tr("no race control for this call"),
          agree: tr("2 of 3 channels agree."),
          budget: tr("26 words · this reading is too weak to hold a call back"),
        },
        {
          stamp: "lap 56 · 14:20:31z",
          clip: tr("Team radio clip, 16.1 seconds"),
          quote: "“doesn’t matter. i mean, it does. for me, maybe.”",
          state: tr("uncertain"),
          z: "−1.18σ",
          conf: "0.00",
          voice: tr("refused · under 1.5s of voiced audio"),
          car: tr("brake variance 43.3"),
          time: tr("blue flag · car 20"),
          agree: tr("The state reading was refused, not produced."),
          budget: tr("26 words · state refused, listen to the clip yourself"),
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
        write(out.voice, tr("not read yet"));
        write(out.car, c.car);
        write(out.time, c.time);
        write(out.verdict, tr("—"));
        write(out.budget, tr("waiting on the clip"));
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
        write(out.verdict, tr("safe to talk"));
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
            say: () =>
              zh
                ? `${call().stamp}。片段已载入，尚未判断。`
                : `${call().stamp}. Clip loaded, not yet read.`,
            hint: tr("three calls flagged — try another"),
            enter() {
              paintIdle();
              setGo(tr("play the call"), false);
            },
          },
          {
            say: () => `${zh ? "播放中。" : "Playing. "}${call().quote}`,
            hint: "",
            next: { step: 2, delay: clipMs },
            enter() {
              setGo(tr("reading the clip"), true);
            },
          },
          {
            say: () =>
              zh
                ? `判断：${call().state}，相对他自己的基线 ${call().z}，置信度 ${call().conf}。`
                : `Read: ${call().state}, ${call().z} against his own baseline, confidence ${call().conf}.`,
            hint: "",
            next: { step: 3, delay: 950 },
            enter() {
              paintRead();
            },
          },
          {
            say: () =>
              zh
                ? `${call().agree}通话：可以说话，${call().budget.split(" · ")[0]}。`
                : `${call().agree} Comms: safe to talk, ${call().budget.split(" · ")[0]}.`,
            hint: "",
            enter() {
              paintComms();
              setGo(tr("run it again"), false);
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
        demo.say(
          zh
            ? `${call().stamp} 已载入。播放即可判断。`
            : `${call().stamp} loaded. Play it to read the clip.`,
        );
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
