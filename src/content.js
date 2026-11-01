/* KinoCaps — content script.
   Watches YouTube's native caption nodes and re-skins them:
   - pushes user settings onto <html> as vars / data-attributes (see styles.css)
   - wraps each caption word in .mc-word so new words can pop in with stagger
   YouTube's own caption engine keeps running untouched — we only re-style.
   Shared constants (DEFAULTS, FONTS, normalizeSettings) come from src/shared.js,
   loaded first. */

(() => {
  "use strict";

  const { DEFAULTS, FONTS, normalizeSettings } = globalThis.MC;

  const root = document.documentElement;
  const PLAYER_SEL = "#movie_player, .html5-video-player";

  let state = { ...DEFAULTS };
  let staggerMs = DEFAULTS.stagger;
  let observer = null;
  let observedEl = null;
  let watchdog = 0;
  let scheduled = false;

  /* ---------- settings bridge ---------- */

  // Only touch a custom property when its value actually changed: every write
  // to <html> invalidates style for the whole document, and a slider drag in
  // the popup emits one storage change per step.
  function setVar(name, value) {
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
  }
  function setData(name, value) {
    if (root.dataset[name] !== value) root.dataset[name] = value;
  }

  /** Push settings onto <html> where styles.css reads them. */
  function applySettings(next) {
    const s = normalizeSettings(next);
    state = s;

    root.classList.toggle("mc-enabled", s.enabled);
    setData("mcTheme", s.theme);
    setData("mcShape", s.shape);
    setData("mcAnim", s.anim);
    setData("mcAlign", s.align);
    setData("mcVpos", s.vpos);
    setData("mcEdge", s.edge);
    setVar("--mc-scale", String(s.size));
    setVar("--mc-bg-alpha", String(s.bg));
    setVar("--mc-blur", `${s.blur}px`);
    setVar("--mc-offset", `${s.offset}px`);
    setVar("--mc-weight", String(s.weight));
    setVar("--mc-text", s.text);
    setVar("--mc-bghex", s.bgc);
    setVar("--mc-accent", s.accent);
    // Font + slant are written for every theme (styles.css reads them off the
    // base pill rule), not just Custom.
    setVar("--mc-font", FONTS[s.font] || FONTS.inter);
    setVar("--mc-style", s.italic ? "italic" : "normal");
    setVar("--mc-lh", String(s.lh));
    setVar("--mc-ls", `${s.ls}em`);
    setVar("--mc-radius", `${s.radius}px`);
    setVar("--mc-pad-y", `${s.padY}em`);
    setVar("--mc-pad-x", `${s.padX}em`);
    setVar("--mc-border-w", `${s.borderW}px`);
    setVar("--mc-maxw", `${s.maxW}%`);
    setVar("--mc-gap", `${s.gap}px`);
    setVar("--mc-edge", ((s.edgeStrength / 100) * 3).toFixed(2));
    setVar("--mc-tshadow", (s.edgeStrength / 100).toFixed(2));
    setVar("--mc-glow", `${s.glow}px`);
    setVar("--mc-speed", String(s.speed));
    staggerMs = s.stagger;

    // Disabled means zero work: no observer, no timers, no DOM writes.
    if (s.enabled) attach();
    else stop();
  }

  async function loadSettings() {
    let stored;
    try {
      stored = await chrome.storage.sync.get(DEFAULTS);
    } catch {
      // storage unavailable (e.g. restricted page) — still style with defaults
      stored = DEFAULTS;
    }
    applySettings({ ...DEFAULTS, ...stored });
  }

  // Merge the changed keys locally instead of re-reading the whole sync area:
  // this listener fires on every popup/option change.
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== "sync") return;
    const next = { ...state };
    let touched = false;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in DEFAULTS) {
        next[key] = newValue;
        touched = true;
      }
    }
    if (touched) applySettings(next);
  });

  /* ---------- observation ---------- */

  // Watch the player only, not all of document.body: YouTube mutates comments,
  // chat and the live timecode constantly, and every one of those records used
  // to run the caption scan. The body is only observed (childList alone) while
  // waiting for a player to exist, which is also when there are no captions.
  function attach() {
    if (!state.enabled) return;
    if (!document.body) {
      window.addEventListener("DOMContentLoaded", attach, { once: true });
      return;
    }
    const player = document.querySelector(PLAYER_SEL);
    const target = player || document.body;
    if (observedEl === target && observer) return;

    observer?.disconnect();
    observedEl = target;
    observer = new MutationObserver(handle);
    observer.observe(
      target,
      player
        ? { childList: true, characterData: true, subtree: true }
        : { childList: true, subtree: true }
    );

    // Picks up a player created on SPA navigation, and a player that YouTube
    // replaces underneath us. A single selector per second is negligible, and
    // it keeps the body-observer window (childList only) as short as possible.
    if (!watchdog) watchdog = setInterval(attach, 1000);
    processAll();
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    observedEl = null;
    clearInterval(watchdog);
    watchdog = 0;
  }

  /* ---------- word wrapping for entrance animation ---------- */

  // segment -> { full: string, words: string[] } so only *new* words animate
  const seen = new WeakMap();
  const MAX_STAGGER = 8;

  // Once a streaming word's entrance finishes it is static forever —
  // dropping the class means later re-renders can't replay the animation
  // on settled words, which is what read as a blink/flicker.
  function settle(el) {
    el.classList.remove("mc-new");
    el.style.animationDelay = "";
  }

  function wordSpans(seg) {
    return Array.from(seg.children).filter(
      (el) => el.classList && el.classList.contains("mc-word")
    );
  }

  // Fresh build of every word, always settled/static and instantly visible.
  // A wholesale cue swap must NOT replay the entrance: fading a whole line
  // in from opacity 0 right after the previous line vanished is exactly the
  // blink on every line change. Only streaming continuations (the
  // incremental path in processSegment) animate their newly arrived words.
  function buildAll(seg, words) {
    seg.textContent = "";
    const frag = document.createDocumentFragment();
    words.forEach((w, i) => {
      if (i > 0) frag.appendChild(document.createTextNode(" "));
      const span = document.createElement("span");
      span.className = "mc-word";
      span.textContent = w;
      frag.appendChild(span);
    });
    seg.appendChild(frag);
  }

  function watchSettle(span) {
    // Single-shot per node: on `none` there is no animation to end on,
    // so settle on the next frame instead.
    if (state.anim === "none" && state.theme !== "karaoke") {
      requestAnimationFrame(() => settle(span));
      return;
    }
    // Karaoke runs entrance + sheen stacked: wait for the sheen (the
    // longer of the two) so settling doesn't chop the shimmer mid-sweep.
    // Plain themes settle on the single entrance finishing.
    const want = state.theme === "karaoke" ? "mc-sheen" : null;
    const onEnd = (e) => {
      if (!want || e.animationName === want) {
        span.removeEventListener("animationend", onEnd);
        settle(span);
      }
    };
    span.addEventListener("animationend", onEnd);
    // Safety net: if the event never fires (tab hidden, animation
    // suppressed), don't leave stale delays/classes behind.
    setTimeout(() => {
      span.removeEventListener("animationend", onEnd);
      settle(span);
    }, 1600);
  }

  // Cue words, read markup-aware. YouTube — most often auto-translate /
  // auto-generated tracks — streams a cue as nested spans joined by <br>
  // or by bare element edges with no whitespace text between them:
  //   <span class="ytp-caption-segment">line one<br>line two</span>
  //   <span class="ytp-caption-segment">was<span>fun</span><span>watching</span>…</span>
  // Naive textContent drops <br> and glues bare edges, fusing the words on
  // either side into one token ("wasfunwatching…") — the missing-spaces bug.
  // So walk the DOM and restore a gap wherever markup, not whitespace, is the
  // only thing between two words. Adjacent *text* nodes still glue (YouTube
  // can split a word mid-stream across them), and interior whitespace
  // collapses in the split, so extra padding here is harmless.
  function extractWords(seg) {
    let buf = "";
    let boundary = false; // crossed an element edge since text last ran
    const endsMidWord = () => /[^\s​]/.test(buf[buf.length - 1] || "");
    const startsWord = (t) => /[^\s​]/.test(t[0] || "");
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          const t = child.data;
          if (t && boundary && endsMidWord() && startsWord(t)) buf += " ";
          buf += t;
          if (t) boundary = false;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName === "BR") {
            buf += " ";
            boundary = false;
          } else {
            if (buf) boundary = true;
            walk(child);
          }
        }
      }
    };
    walk(seg);
    return buf.split(/[\s​]+/).filter(Boolean);
  }

  function processSegment(seg) {
    const words = extractWords(seg);
    if (!words.length) return;
    // Normalized (single-spaced) so a YouTube re-render with different
    // markup but identical words still hits the settled fast path below.
    const text = words.join(" ");
    const prev = seen.get(seg);

    if (prev && prev.full === text) {
      // Already styled — unless YouTube clobbered our spans, then quietly
      // restore them as settled words (no animation replay, no blink).
      if (wordSpans(seg).length) return;
      buildAll(seg, words);
      return;
    }

    const oldWords = prev ? prev.words : [];

    // common-prefix length: everything after it is new and should fade in
    let common = 0;
    while (common < oldWords.length && common < words.length && oldWords[common] === words[common]) {
      common++;
    }

    // Incremental update: leave the settled prefix's DOM nodes completely
    // untouched (re-creating them every word re-rasterizes settled text and
    // re-samples the backdrop blur behind the pill — that full-pill repaint
    // is the subtle blink on each incoming word/line). Only the changed
    // tail is touched.
    const existing = wordSpans(seg);
    let prefixIntact = common > 0 && existing.length >= common;
    if (prefixIntact) {
      for (let i = 0; i < common; i++) {
        if (existing[i].textContent !== words[i]) {
          prefixIntact = false;
          break;
        }
      }
    }

    if (prefixIntact) {
      // Streaming continuation: leave the settled nodes untouched — only
      // append the newly arrived word(s). There is no visible change to old
      // text, so nothing can blink.
      let node = existing[common - 1].nextSibling;
      while (node) {
        const next = node.nextSibling;
        node.remove();
        node = next;
      }
      const frag = document.createDocumentFragment();
      for (let i = common; i < words.length; i++) {
        frag.appendChild(document.createTextNode(" "));
        const span = document.createElement("span");
        span.className = "mc-word mc-new";
        span.textContent = words[i];
        const step = Math.min(i - common, MAX_STAGGER);
        if (step > 0 && staggerMs > 0) span.style.animationDelay = `${step * staggerMs}ms`;
        watchSettle(span);
        frag.appendChild(span);
      }
      seg.appendChild(frag);
    } else {
      // No settled prefix to keep (brand-new segment, line rolled over, or a
      // line edit that rewrote settled words): build fresh, instantly
      // visible. Entrances only play on streaming continuations above —
      // a wholesale swap always means brand-new words, so replaying there
      // would animate on EVERY line change (the blink). Karaoke gets no
      // fresh-line shimmer for the same reason; its streaming tail above
      // still shimmers as words arrive.
      buildAll(seg, words);
    }
    seen.set(seg, { full: text, words });
  }

  function processAll() {
    if (!state.enabled) return;
    // YouTube can render several windows (e.g. dual-language); style them all.
    const scope = observedEl && observedEl !== document.body ? observedEl : document;
    scope.querySelectorAll(".ytp-caption-segment").forEach(processSegment);
  }

  // Caption mutations are processed synchronously (no rAF throttle). The
  // microtask still runs before the next paint, so the first paint already has
  // the final word spans and entrances start from opacity 0 — there is never a
  // frame of raw unwrapped text. Deferring to rAF was a frame late: every new
  // word painted once as plain text, then vanished and faded back in.
  // Coalescing into one microtask collapses the several records YouTube emits
  // for a single cue update into one scan.
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      try {
        processAll();
      } catch {
        /* player mid-teardown; next mutation will retry */
      }
    });
  }

  const CAPTION_SEL =
    ".ytp-caption-window-container, .caption-window, .capt-window, .ytp-caption-segment";

  function recordTouchesCaptions(record) {
    const t = record.target;
    const el = t instanceof Element ? t : t?.parentElement;
    if (el && el.closest && el.closest(CAPTION_SEL)) return true;
    for (const list of [record.addedNodes, record.removedNodes]) {
      if (!list) continue;
      for (const node of list) {
        if (!(node instanceof Element)) continue;
        if (node.matches(CAPTION_SEL) || node.querySelector(CAPTION_SEL)) return true;
      }
    }
    return false;
  }

  function handle(records) {
    if (!state.enabled) return;
    for (const record of records) {
      if (recordTouchesCaptions(record)) {
        schedule();
        return;
      }
    }
  }

  loadSettings();
})();
