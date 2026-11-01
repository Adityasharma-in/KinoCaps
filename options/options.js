/* KinoCaps — options page: full editor + named styles library.
   Every edit repaints the mock-player preview, saves (debounced) to
   chrome.storage.sync, and therefore applies live to open YouTube tabs. */
(() => {
  "use strict";

  const {
    DEFAULTS,
    THEMES,
    FORMATS,
    PRESETS_KEY,
    normalizeSettings,
    isSafeStyleName,
    paintCaption,
    getPresets,
    setPresets,
    extractSettings,
    fillFontSelect,
    fillThemeGrid,
    layoutAllSegs,
    syncRangeFills,
  } = window.MC;

  // Custom-only keys: touching one auto-switches to the Custom theme.
  // `font` / `weight` / `italic` are deliberately absent — type now applies to
  // every theme, so editing it must not clobber the user's chosen theme.
  const CUSTOM_KEYS = new Set([
    "text", "bgc", "accent", "lh", "ls",
    "radius", "padY", "padX", "borderW", "maxW", "align", "vpos",
    "gap", "edge", "edgeStrength", "glow", "speed", "stagger",
  ]);

  const WORD_STAGGER_CAP = 8; // matches the content script's MAX_STAGGER

  const $ = (id) => document.getElementById(id);
  let state = { ...DEFAULTS };
  let presets = {};
  let saveTimer = 0;
  let pending = {};
  let paintQueued = false;
  let paintRaf = 0;
  let paintTimer = 0;
  let fitTimer = 0;
  let toastHideTimer;

  function toast(msg, tone) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.toggle("bad", tone === "bad");
    t.classList.add("show");
    clearTimeout(toastHideTimer);
    toastHideTimer = setTimeout(() => t.classList.remove("show"), 2000);
  }

  /* ---------- preview stage ---------- */

  function fillWords(line, text, s) {
    line.textContent = "";
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    const frag = document.createDocumentFragment();
    words.forEach((w, i) => {
      if (i > 0) frag.appendChild(document.createTextNode(" "));
      const sp = document.createElement("span");
      sp.className = "w";
      sp.textContent = w;
      if (s.theme === "karaoke") sp.classList.add("w-karaoke");
      if (s.anim === "rise" || s.anim === "fade") {
        sp.classList.add(s.anim === "rise" ? "w-rise" : "w-fade");
        // Custom themes own their speed; presets keep their designed timing.
        if (s.theme === "custom") {
          sp.style.animationDuration = `${0.32 / (s.speed || 1)}s`;
        }
        const step = Math.min(i, WORD_STAGGER_CAP);
        if (step > 0 && s.stagger > 0) sp.style.animationDelay = `${step * s.stagger}ms`;
      }
      frag.appendChild(sp);
    });
    line.appendChild(frag);
  }

  function fitStage() {
    const wrap = $("stageCaptions");
    const custom = state.theme === "custom";
    const maxW = custom ? state.maxW : 86;
    const gap = custom ? state.gap : 8;
    const lines = [$("capLine1"), $("capLine2")];

    /* The mock frame is only ~400px wide, so a long line at a large size can
       grow taller than the 16:9 area. Shrink the preview type until both pills
       fit instead of clipping the top line behind the player chrome. This only
       affects the mock frame — YouTube renders the true stored size. */
    let previewSize = state.size;
    for (let attempt = 0; attempt < 6; attempt++) {
      lines.forEach((line) => {
        paintCaption(line, { ...state, size: previewSize }, 15);
        line.style.maxWidth = `${maxW}%`;
        line.style.textAlign = custom ? state.align : "center";
      });
      const cs = getComputedStyle(wrap);
      const avail =
        wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const needed = lines.reduce((n, line) => n + line.offsetHeight, 0) + gap;
      if (needed <= avail || previewSize <= 0.5) break;
      previewSize = Math.max(0.5, previewSize * 0.9);
    }
  }

  function paintStage() {
    const wrap = $("stageCaptions");
    const custom = state.theme === "custom";
    wrap.style.justifyContent = state.vpos === "top" ? "flex-start" : "flex-end";
    wrap.style.alignItems =
      state.align === "left" ? "flex-start" : state.align === "right" ? "flex-end" : "center";
    wrap.style.gap = custom ? `${state.gap}px` : "8px";
    /* Clear the mock player's own chrome (top title bar / bottom controls)
       so captions never slide underneath it — mirrors real YouTube, where
       Lift is measured from above the control bar. */
    wrap.style.padding =
      state.vpos === "top"
        ? `${state.offset + 40}px 20px 12px`
        : `12px 20px ${state.offset + 46}px`;
    const maxW = custom ? state.maxW : 86;
    const lines = [$("capLine1"), $("capLine2")];
    lines.forEach((line) => {
      fillWords(line, line.dataset.text, state);
      line.style.maxWidth = `${maxW}%`;
      line.style.textAlign = custom ? state.align : "center";
    });
    fitStage();
  }

  /* ---------- paint / save ---------- */

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
    paintStage();
    layoutAllSegs(document);
    syncRangeFills(document);
    if (window.__mcSyncAir) window.__mcSyncAir();
  }

  // Sliders emit input events faster than a frame; one repaint per frame keeps
  // the stage live without rebuilding the preview several times per tick.
  // The timer is a fallback: a backgrounded tab can starve rAF entirely, and a
  // settings change should still repaint before the tab is next looked at.
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

  function queueSave(patch) {
    Object.assign(pending, patch);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 220);
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
          toast("Couldn't save — sync storage may be full", "bad");
          return;
        }
        toast("Saved ✓");
      });
    } catch {
      toast("Couldn't save — sync storage may be full", "bad");
    }
  }

  function update(patch, keepTheme) {
    if (!keepTheme) {
      for (const k of Object.keys(patch)) {
        if (CUSTOM_KEYS.has(k) && state.theme !== "custom") {
          patch.theme = "custom";
          break;
        }
      }
    }
    Object.assign(state, normalizeSettings({ ...state, ...patch }));
    queueSave(patch);
    schedulePaint();
  }

  /* ---------- named styles ---------- */

  function renderStyles() {
    const list = $("stylesList");
    list.textContent = "";
    const names = Object.keys(presets).sort(
      (a, b) => (presets[b].updatedAt || 0) - (presets[a].updatedAt || 0)
    );
    $("noStyles").style.display = names.length ? "none" : "";
    names.forEach((name) => {
      const item = document.createElement("div");
      item.className = "style-item";

      const apply = document.createElement("button");
      apply.type = "button";
      apply.className = "style-name";
      apply.textContent = name;
      apply.title = `Apply “${name}”`;
      apply.addEventListener("click", () => {
        const p = presets[name];
        if (!p) return;
        update({ ...DEFAULTS, ...p.settings }, true);
        toast(`Applied “${name}” ✓`);
      });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "style-del";
      del.textContent = "×";
      del.title = `Delete “${name}”`;
      del.setAttribute("aria-label", `Delete ${name}`);
      del.addEventListener("click", async () => {
        if (!confirm(`Delete style “${name}”?`)) return;
        const next = await getPresets();
        delete next[name];
        try {
          await setPresets(next);
          presets = next;
          renderStyles();
          toast(`Deleted “${name}”`);
        } catch {
          toast("Couldn't delete — sync storage may be full", "bad");
        }
      });

      item.append(apply, del);
      list.appendChild(item);
    });
  }

  async function refreshPresets() {
    presets = await getPresets();
    renderStyles();
  }

  async function saveCurrentAsPreset() {
    const input = $("styleName");
    const name = input.value.trim().slice(0, 60);
    if (!name) {
      toast("Type a name for the style first");
      input.focus();
      return;
    }
    if (!isSafeStyleName(name)) {
      toast("Pick a different name", "bad");
      input.focus();
      return;
    }
    try {
      const next = await getPresets();
      next[name] = { settings: extractSettings(state), updatedAt: Date.now() };
      await setPresets(next);
      presets = next;
      renderStyles();
      input.value = "";
      toast(`Style “${name}” saved ✓`);
    } catch {
      toast("Couldn't save — sync storage may be full", "bad");
    }
  }

  function exportPresets() {
    const names = Object.keys(presets);
    if (!names.length) {
      toast("No saved styles to export");
      return;
    }
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kinocaps-styles.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function importPresets(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        // Imported JSON is untrusted: only safe names and known settings pass.
        const entries = Object.entries(data || {}).filter(
          ([n, p]) => isSafeStyleName(n) && p && typeof p.settings === "object"
        );
        if (!entries.length) {
          toast("No valid styles in that file", "bad");
          return;
        }
        const next = await getPresets();
        const now = Date.now();
        entries.forEach(([n, p]) => {
          const clean = {};
          for (const k of Object.keys(DEFAULTS)) if (k in p.settings) clean[k] = p.settings[k];
          next[n.slice(0, 60)] = { settings: normalizeSettings(clean), updatedAt: now };
        });
        await setPresets(next);
        presets = next;
        renderStyles();
        toast(`Imported ${entries.length} style${entries.length > 1 ? "s" : ""} ✓`);
      } catch {
        toast("Couldn't import — file invalid or sync storage full", "bad");
      }
    };
    reader.readAsText(file);
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
      // shape/anim apply to every theme; align/vpos/edge are custom-only
      // and should auto-switch to Custom like the other custom controls.
      const keep = segKey === "shape" || segKey === "anim";
      update({ [segKey]: segBtn.dataset.val }, keep);
    }
  });

  // Preview sample text (preview-only, never synced).
  [["prevLine1", "capLine1"], ["prevLine2", "capLine2"]].forEach(([inputId, lineId]) => {
    $(inputId).addEventListener("input", (e) => {
      $(lineId).dataset.text = e.target.value;
      paintStage();
    });
  });

  $("replay").addEventListener("click", paintStage);
  $("saveStyle").addEventListener("click", saveCurrentAsPreset);
  $("styleName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveCurrentAsPreset();
  });
  $("exportStyles").addEventListener("click", exportPresets);
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => {
    if (e.target.files[0]) importPresets(e.target.files[0]);
    e.target.value = "";
  });
  $("reset").addEventListener("click", () => {
    if (confirm("Reset all settings to defaults? (Saved styles are kept.)")) {
      update({ ...DEFAULTS }, true);
    }
  });

  // The preview frame changes aspect ratio on small screens; re-fit the mock
  // captions after a resize instead of leaving the old font size behind.
  window.addEventListener("resize", () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitStage, 120);
  });

  // Flush a pending write when the tab closes mid-edit.
  window.addEventListener("pagehide", flush);

  // Adopt changes made elsewhere (e.g. the popup) instead of fighting them.
  // Merging the changed keys avoids re-reading the whole sync area on every
  // slider tick from the popup.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (PRESETS_KEY in changes) {
      refreshPresets();
      return;
    }
    const patch = {};
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (!(key in DEFAULTS) || key in pending) continue;
      patch[key] = newValue;
    }
    if (!Object.keys(patch).length) return;
    state = normalizeSettings({ ...state, ...patch });
    schedulePaint();
  });

  /* ---------- init ---------- */

  // Themes and fonts come from the shared catalogues (src/shared.js) so this
  // page and the popup always offer the same looks and faces.
  fillThemeGrid($("themes"), false);
  fillFontSelect($("font"), DEFAULTS.font);
  $("themeCount").textContent = `${THEMES.length} looks`;

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
  refreshPresets();
})();
