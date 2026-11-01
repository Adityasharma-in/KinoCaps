/* KinoCaps — popup logic: quick controls + live preview.
   Shared constants and the preview painter come from ../src/shared.js.
   Full editing + named styles live on the options page. */
(() => {
  "use strict";

  const {
    DEFAULTS,
    THEMES,
    FONTS,
    FORMATS,
    normalizeSettings,
    paintCaption,
    fillFontSelect,
    fillThemeGrid,
    layoutAllSegs,
    layoutTabs,
    syncRangeFills,
  } = window.MC;

  const $ = (id) => document.getElementById(id);
  const PREVIEW_TEXT = "Every word lands with a little spring";
  const AVATAR_STAGGER_CAP = 8; // matches the content script's MAX_STAGGER

  // Custom-only keys: touching one auto-switches to the Custom theme.
  // `font` / `weight` / `italic` are deliberately absent — type applies to
  // every theme, so editing it must not clobber the user's chosen theme.
  const CUSTOM_KEYS = new Set([
    "text", "bgc", "accent", "lh", "ls",
    "radius", "padY", "padX", "borderW", "maxW", "align", "vpos",
    "gap", "edge", "edgeStrength", "glow", "speed", "stagger",
  ]);

  let state = { ...DEFAULTS };
  let saveTimer = 0;
  let pending = {};
  let paintQueued = false;
  let paintRaf = 0;
  let paintTimer = 0;
  let previewSignature = "";

  /* ---------- paint ---------- */

  function paint() {
    document.querySelectorAll("[data-key]").forEach((el) => {
      const k = el.dataset.key;
      if (!(k in state)) return;
      if (el.type === "checkbox") el.checked = !!state[k];
      else el.value = state[k];
      const val = $(`${k}Val`);
      if (val && FORMATS[k]) val.textContent = FORMATS[k](state[k]);
    });

    document.querySelectorAll("#themes .theme").forEach((b) => {
      const on = b.dataset.theme === state.theme;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    document.querySelectorAll("[data-seg]").forEach((seg) => {
      const k = seg.dataset.seg;
      seg.querySelectorAll("button").forEach((b) =>
        b.classList.toggle("is-active", b.dataset.val === String(state[k]))
      );
    });

    $("shapeWrap").style.display = state.theme === "custom" ? "none" : "";
    $("customNotice").hidden = state.theme === "custom";

    const pill = $("previewPill");
    pill.dataset.theme = state.theme;
    pill.dataset.anim = state.anim;
    pill.style.setProperty("--pw-speed", String(state.speed));
    paintCaption(pill, state, 14);
    paintPreview(false);

    const glyph = $("typeGlyph");
    if (glyph) {
      glyph.style.fontFamily = FONTS[state.font] || FONTS.inter;
      glyph.style.fontWeight = String(state.weight);
      glyph.style.fontStyle = state.italic ? "italic" : "normal";
      const picked = $("font").selectedOptions[0];
      $("typeName").textContent = picked ? picked.textContent : "Inter";
    }

    layoutAllSegs(document);
    layoutTabs(document.querySelector(".tabs"));
    syncRangeFills(document);
  }

  // rAF coalesces slider drags; the timer covers a throttled/backgrounded
  // frame so a storage change still lands.
  function schedulePaint() {
    if (paintQueued) return;
    paintQueued = true;
    const run = () => {
      if (!paintQueued) return;
      paintQueued = false;
      cancelAnimationFrame(paintRaf);
      clearTimeout(paintTimer);
      paint();
    };
    paintRaf = requestAnimationFrame(run);
    paintTimer = setTimeout(run, 90);
  }

  /* Word-by-word demo of the entrance setting. Rebuilt only when something
     that affects the entrance changes (or on demand), so dragging a slider
     doesn't restart the animation on every frame. */
  function paintPreview(force) {
    const signature = `${state.theme}|${state.anim}|${state.speed}|${state.stagger}`;
    if (!force && signature === previewSignature) return;
    previewSignature = signature;

    const pill = $("previewPill");
    const words = PREVIEW_TEXT.split(/\s+/).filter(Boolean);
    const frag = document.createDocumentFragment();
    words.forEach((word, i) => {
      if (i > 0) frag.appendChild(document.createTextNode(" "));
      const span = document.createElement("span");
      span.className = "pw";
      span.textContent = word;
      const step = Math.min(i, AVATAR_STAGGER_CAP);
      if (state.anim !== "none" && step > 0 && state.stagger > 0) {
        span.style.animationDelay = `${step * state.stagger}ms`;
      }
      frag.appendChild(span);
    });
    pill.textContent = "";
    pill.appendChild(frag);
  }

  /* ---------- save ---------- */

  function queueSave(patch) {
    Object.assign(pending, patch);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 200);
  }

  function flashSaved(error) {
    const el = $("saved");
    el.classList.toggle("error", !!error);
    $("savedLabel").textContent = error ? "Sync full" : "Saved";
    el.classList.add("show");
    clearTimeout(flashSaved.timer);
    flashSaved.timer = setTimeout(() => el.classList.remove("show"), 1400);
  }

  function flush() {
    clearTimeout(saveTimer);
    saveTimer = 0;
    const patch = pending;
    pending = {};
    if (!Object.keys(patch).length) return;
    try {
      chrome.storage.sync.set(patch, () => {
        if (chrome.runtime.lastError) {
          flashSaved(true);
          return;
        }
        flashSaved(false);
      });
    } catch {
      flashSaved(true);
    }
  }

  function update(patch, keepTheme) {
    if (!keepTheme) {
      for (const key of Object.keys(patch)) {
        if (CUSTOM_KEYS.has(key) && state.theme !== "custom") {
          patch.theme = "custom";
          break;
        }
      }
    }
    Object.assign(state, normalizeSettings({ ...state, ...patch }));
    queueSave(patch);
    schedulePaint();
  }

  /* ---------- events ---------- */

  function onField(e) {
    const el = e.target.closest("[data-key]");
    if (!el) return;
    const k = el.dataset.key;
    const v =
      el.type === "checkbox" ? el.checked : el.type === "range" ? Number(el.value) : el.value;
    if (String(state[k]) === String(v)) return;
    update({ [k]: v });
  }
  document.addEventListener("input", onField);
  document.addEventListener("change", onField); // selects in some engines

  document.addEventListener("click", (e) => {
    const themeBtn = e.target.closest("#themes [data-theme]");
    if (themeBtn) {
      if (themeBtn.dataset.theme !== state.theme) update({ theme: themeBtn.dataset.theme }, true);
      return;
    }
    const segBtn = e.target.closest("[data-seg] [data-val]");
    if (segBtn) {
      const segKey = segBtn.closest("[data-seg]").dataset.seg;
      update({ [segKey]: segBtn.dataset.val }, segKey === "shape" || segKey === "anim");
    }
  });

  $("replay").addEventListener("click", () => paintPreview(true));
  $("reset").addEventListener("click", () => update({ ...DEFAULTS }, true));
  $("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Flush a pending write if the popup is dismissed mid-drag.
  window.addEventListener("pagehide", flush);

  /* ---------- tabs ---------- */

  const tabNav = document.querySelector(".tabs");
  const tabs = Array.from(document.querySelectorAll(".tab"));

  function selectTab(name, focus) {
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === name;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    document.querySelectorAll(".panel").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === name);
    });
    $("panels").scrollTop = 0;
    layoutTabs(tabNav);
  }

  tabNav.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (tab) selectTab(tab.dataset.tab, false);
  });

  tabNav.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const index = tabs.findIndex((t) => t.classList.contains("is-active"));
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabs[next].dataset.tab, true);
  });

  /* ---------- init ---------- */

  // Themes and fonts come from the shared catalogues (src/shared.js) so this
  // panel and the options page always offer the same looks and faces.
  fillThemeGrid($("themes"), true);
  fillFontSelect($("font"), DEFAULTS.font);
  $("themeCount").textContent = `${THEMES.length - 1} + custom`;
  layoutTabs(tabNav);

  chrome.storage.sync
    .get(DEFAULTS)
    .then((stored) => {
      state = normalizeSettings({ ...DEFAULTS, ...stored });
      paint();
    })
    .catch(() => {
      state = { ...DEFAULTS };
      paint();
    });

  // Adopt edits made on the options page while the popup is open.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const patch = {};
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (!(key in DEFAULTS) || key in pending) continue;
      patch[key] = newValue;
    }
    if (!Object.keys(patch).length) return;
    state = normalizeSettings({ ...state, ...patch });
    schedulePaint();
  });
})();
