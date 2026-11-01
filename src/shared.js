/* KinoCaps — shared settings module.
   Classic script, loaded BEFORE content.js / popup.js / options.js so all
   three read the same DEFAULTS, themes, fonts, formatters and preview painter.
   Exposed as `window.MC` (also `globalThis.MC` for content-script scope). */
(function () {
  "use strict";

  const DEFAULTS = {
    enabled: true,
    theme: "glass", // one of THEMES below
    size: 1, // 0.7 – 1.6 multiplier
    bg: 0.55, // pill background alpha
    blur: 14, // backdrop blur px
    offset: 28, // distance from bottom/top edge px
    weight: 600,
    shape: "pill", // pill | flat (presets only; custom uses radius)
    anim: "rise", // rise | fade | none
    // --- Custom theme ---
    text: "#ffffff",
    bgc: "#0a0a0e", // pill color (alpha comes from `bg`)
    accent: "#22d3ee", // border + glow color
    font: "inter", // key into FONTS
    italic: false,
    lh: 1.45, // line-height
    ls: 0.01, // letter-spacing in em
    radius: 18, // corner radius px
    padY: 0.35, // vertical padding em
    padX: 0.9, // horizontal padding em
    borderW: 0, // border width px (accent colored)
    maxW: 86, // max caption width %
    align: "center", // left | center | right
    vpos: "bottom", // bottom | top
    gap: 8, // gap between caption lines px
    edge: "shadow", // none | shadow | outline
    edgeStrength: 70, // 0-100 (shadow opacity / outline width)
    glow: 0, // accent glow blur px
    speed: 1, // word animation speed multiplier
    stagger: 28, // delay between words ms
  };

  /* Theme catalogue — the single source of truth for the theme pickers in
     the popup and the options page, and for the ids normalizeSettings()
     accepts. `hint` is the one-line description shown in the editors. */
  const THEMES = [
    { id: "glass", label: "Glass", hint: "Frosted pill" },
    { id: "outline", label: "Outline", hint: "Netflix-style" },
    { id: "cream", label: "Cream", hint: "Soft light" },
    { id: "neon", label: "Neon", hint: "Electric edge" },
    { id: "minimal", label: "Minimal", hint: "Bare text" },
    { id: "karaoke", label: "Karaoke", hint: "Sweeping shine" },
    { id: "aurora", label: "Aurora", hint: "Iridescent glow" },
    { id: "sunset", label: "Sunset", hint: "Cinematic ember" },
    { id: "royal", label: "Royal", hint: "Indigo + gold" },
    { id: "social", label: "Social", hint: "Bold TikTok pop" },
    { id: "broadcast", label: "Broadcast", hint: "Sports lower-third" },
    { id: "frost", label: "Frost", hint: "White inverse" },
    { id: "cinema", label: "Cinema", hint: "Letterbox bar" },
    { id: "prism", label: "Prism", hint: "Iridescent edge" },
    { id: "mono", label: "Mono", hint: "Graphite glass" },
    { id: "custom", label: "Custom", hint: "Your lab" },
  ];
  const THEME_IDS = new Set(THEMES.map((t) => t.id));

  /* Font catalogue, grouped for the picker.
     These are *system* stacks only — nothing is bundled and nothing is fetched.
     Content scripts can't load remote stylesheets (MV3 hands them the page's
     CSP, which forbids it), so a downloaded webfont would render identically
     to no font at all; a locally installed face is the only kind that reliably
     reaches the caption. Every stack therefore names a specific face first and
     then widens, so an uninstalled font degrades to the nearest neighbour
     rather than the browser default.

     Keep the seven original ids (inter, system, roboto, arial, verdana,
     georgia, mono) with their original stacks: styles saved before this list
     existed store the id, and swapping a stack would silently restyle them. */
  const FONT_GROUPS = [
    {
      label: "Sans — clean",
      fonts: [
        { id: "inter", label: "Inter", stack: '"Inter", "Segoe UI", Roboto, sans-serif' },
        {
          id: "system",
          label: "System UI",
          stack: '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        {
          id: "segoe",
          label: "Segoe UI",
          stack: '"Segoe UI Variable Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        },
        { id: "roboto", label: "Roboto", stack: 'Roboto, "Segoe UI", Arial, sans-serif' },
        { id: "arial", label: "Arial", stack: "Arial, Helvetica, sans-serif" },
        { id: "verdana", label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
        { id: "tahoma", label: "Tahoma", stack: "Tahoma, Verdana, Geneva, sans-serif" },
        {
          id: "trebuchet",
          label: "Trebuchet MS",
          stack: '"Trebuchet MS", "Lucida Grande", "Segoe UI", sans-serif',
        },
      ],
    },
    {
      label: "Serif — editorial",
      fonts: [
        { id: "georgia", label: "Georgia", stack: 'Georgia, "Times New Roman", serif' },
        { id: "times", label: "Times New Roman", stack: '"Times New Roman", Times, Georgia, serif' },
        { id: "cambria", label: "Cambria", stack: 'Cambria, Constantia, Georgia, "Times New Roman", serif' },
        {
          id: "garamond",
          label: "Garamond",
          stack: 'Garamond, "EB Garamond", Georgia, "Times New Roman", serif',
        },
        {
          id: "palatino",
          label: "Palatino",
          stack: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
        },
        { id: "rockwell", label: "Rockwell", stack: 'Rockwell, "Rockwell Nova", "Courier New", Georgia, serif' },
      ],
    },
    {
      label: "Condensed & display",
      fonts: [
        {
          id: "narrow",
          label: "Arial Narrow",
          stack: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif',
        },
        { id: "impact", label: "Impact", stack: 'Impact, Haettenschweiler, "Arial Narrow", sans-serif' },
        {
          id: "franklin",
          label: "Franklin Gothic",
          stack: '"Franklin Gothic Medium", "Franklin Gothic", "Arial Narrow", Arial, sans-serif',
        },
      ],
    },
    {
      label: "Monospace",
      fonts: [
        {
          id: "mono",
          label: "Cascadia Mono",
          stack: '"Cascadia Mono", Consolas, "Courier New", monospace',
        },
        { id: "courier", label: "Courier New", stack: '"Courier New", Courier, monospace' },
      ],
    },
  ];

  // Flat id -> stack map, derived once so lookups stay O(1) and callers that
  // only need a stack (content.js, paintCaption) don't walk the groups.
  const FONTS = {};
  for (const g of FONT_GROUPS) for (const f of g.fonts) FONTS[f.id] = f.stack;
  const FONT_IDS = new Set(Object.keys(FONTS));

  const FORMATS = {
    size: (v) => `${Math.round(v * 100)}%`,
    bg: (v) => `${Math.round(v * 100)}%`,
    blur: (v) => `${v}px`,
    offset: (v) => `${v}px`,
    weight: (v) => `${v}`,
    text: (v) => String(v).toUpperCase(),
    bgc: (v) => String(v).toUpperCase(),
    accent: (v) => String(v).toUpperCase(),
    italic: (v) => (v ? "On" : "Off"),
    lh: (v) => Number(v).toFixed(2),
    ls: (v) => `${Number(v).toFixed(2)}em`,
    radius: (v) => `${v}px`,
    padY: (v) => `${Number(v).toFixed(2)}em`,
    padX: (v) => `${Number(v).toFixed(2)}em`,
    borderW: (v) => `${v}px`,
    maxW: (v) => `${v}%`,
    gap: (v) => `${v}px`,
    edgeStrength: (v) => `${v}%`,
    glow: (v) => `${v}px`,
    speed: (v) => `${Number(v).toFixed(1)}×`,
    stagger: (v) => `${v}ms`,
  };

  /* ================= settings validation ================= */
  /* Everything that reaches a CSS custom property or an inline style goes
     through here first. Storage and imported style files are untrusted input:
     an unchecked string in `bg` or `accent` would otherwise be concatenated
     into a stylesheet rule (CSS injection), and a wrong type breaks layout. */

  const NUM_BOUNDS = {
    size: [0.7, 1.6],
    bg: [0, 0.9],
    blur: [0, 24],
    offset: [8, 120],
    weight: [400, 800],
    lh: [1, 2],
    ls: [-0.05, 0.2],
    radius: [0, 40],
    padY: [0.1, 0.8],
    padX: [0.3, 1.5],
    borderW: [0, 4],
    maxW: [40, 100],
    gap: [0, 24],
    edgeStrength: [0, 100],
    glow: [0, 40],
    speed: [0.5, 2],
    stagger: [0, 80],
  };

  const ENUMS = {
    theme: THEME_IDS,
    shape: new Set(["pill", "flat"]),
    anim: new Set(["rise", "fade", "none"]),
    align: new Set(["left", "center", "right"]),
    vpos: new Set(["bottom", "top"]),
    edge: new Set(["none", "shadow", "outline"]),
    font: FONT_IDS,
  };

  const COLORS = new Set(["text", "bgc", "accent"]);

  function normHex(value) {
    if (typeof value !== "string") return null;
    const h = value.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(h)) return `#${[...h].map((c) => c + c).join("").toLowerCase()}`;
    if (/^[0-9a-f]{6}$/i.test(h)) return `#${h.toLowerCase()}`;
    return null;
  }

  /** Full, valid settings object. Unknown keys are dropped. */
  function normalizeSettings(input) {
    const out = { ...DEFAULTS };
    if (!input || typeof input !== "object") return out;

    for (const key of Object.keys(DEFAULTS)) {
      if (!(key in input)) continue;
      const value = input[key];

      if (key === "enabled" || key === "italic") {
        out[key] = typeof value === "boolean" ? value : Boolean(value);
        continue;
      }
      if (COLORS.has(key)) {
        const hex = normHex(value);
        if (hex) out[key] = hex;
        continue;
      }
      if (ENUMS[key]) {
        if (typeof value === "string" && ENUMS[key].has(value)) out[key] = value;
        continue;
      }
      const bounds = NUM_BOUNDS[key];
      if (bounds) {
        const n = typeof value === "number" ? value : Number(value);
        if (Number.isFinite(n)) out[key] = Math.min(bounds[1], Math.max(bounds[0], n));
      }
    }
    return out;
  }

  function hexToRgba(hex, a) {
    const safe = normHex(hex) || "#0a0a0e";
    const h = safe.slice(1);
    const n = parseInt(h, 16);
    return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`;
  }

  /* Styles any element exactly like a caption pill for the given state.
     basePx is the reference font size before the size multiplier
     (popup uses 14, options page uses 20). Mirrors src/styles.css. */
  function paintCaption(el, settings, basePx) {
    const s = normalizeSettings(settings);
    const st = el.style;
    st.fontSize = `${(basePx || 14) * s.size}px`;
    st.fontWeight = s.weight;
    // Family + slant are global (every theme), not Custom-only — styles.css
    // reads the same pair off --mc-font / --mc-style. Base values here mirror
    // the content script (src/styles.css) for themes that don't touch type;
    // the Custom branch below overrides line-height and tracking.
    st.fontFamily = FONTS[s.font] || FONTS.inter;
    st.fontStyle = s.italic ? "italic" : "normal";
    st.lineHeight = "1.45";
    st.letterSpacing = "0.01em";
    st.padding = "0.35em 0.9em";
    st.border = "";
    st.borderLeft = "";
    st.borderRadius = s.shape === "pill" ? "999px" : "10px";
    st.backdropFilter = "none";
    st.background = `rgb(10 10 14 / ${s.bg})`;
    st.boxShadow = "";
    st.textShadow = "";
    st.color = "#fff";

    if (s.theme === "glass") {
      st.backdropFilter = `blur(${s.blur}px) saturate(1.3)`;
      st.boxShadow = "0 10px 30px rgb(0 0 0 / 0.38), inset 0 1px 0 rgb(255 255 255 / 0.16)";
    } else if (s.theme === "outline") {
      st.background = "transparent";
      st.borderRadius = "0";
      st.textShadow =
        "-2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000, 0 4px 18px rgb(0 0 0 / 0.8)";
    } else if (s.theme === "cream") {
      st.background = "rgb(255 251 235 / 0.92)";
      st.color = "#1c1917";
      st.boxShadow = "0 10px 30px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.6)";
    } else if (s.theme === "neon") {
      st.backdropFilter = `blur(${s.blur}px) saturate(1.3)`;
      st.border = "1px solid rgb(34 211 238 / 0.55)";
      st.boxShadow = "0 0 24px rgb(34 211 238 / 0.22), 0 10px 30px rgb(0 0 0 / 0.45)";
    } else if (s.theme === "minimal") {
      st.background = "transparent";
      st.borderRadius = "0";
      st.textShadow = "0 2px 12px rgb(0 0 0 / 0.85), 0 1px 3px rgb(0 0 0 / 0.9)";
    } else if (s.theme === "karaoke") {
      st.backdropFilter = `blur(${s.blur}px) saturate(1.3)`;
      st.background = `linear-gradient(100deg, #fff 30%, #fbbf24 50%, #fff 70%), rgb(10 10 14 / ${s.bg})`;
    } else if (s.theme === "aurora") {
      st.backdropFilter = `blur(${s.blur}px) saturate(1.3)`;
      st.background = "linear-gradient(135deg, rgb(124 58 237 / 0.72), rgb(236 72 153 / 0.6) 52%, rgb(34 211 238 / 0.6))";
      st.border = "1px solid rgb(255 255 255 / 0.35)";
      st.boxShadow = "0 10px 34px rgb(124 58 237 / 0.35), 0 10px 30px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.25)";
    } else if (s.theme === "sunset") {
      st.background = "linear-gradient(135deg, rgb(255 59 46 / 0.88), rgb(255 138 0 / 0.88))";
      st.border = "1px solid rgb(255 255 255 / 0.28)";
      st.boxShadow = "0 10px 34px rgb(255 90 0 / 0.35), 0 10px 30px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.3)";
      st.textShadow = "0 1px 8px rgb(0 0 0 / 0.35)";
    } else if (s.theme === "royal") {
      st.backdropFilter = `blur(${s.blur}px) saturate(1.3)`;
      st.background = `rgb(15 12 41 / ${s.bg})`;
      st.color = "#fdf6e3";
      st.border = "1px solid rgb(212 175 55 / 0.65)";
      st.boxShadow = "0 0 24px rgb(212 175 55 / 0.18), 0 10px 30px rgb(0 0 0 / 0.5)";
    } else if (s.theme === "social") {
      st.background = "transparent";
      st.backdropFilter = "none";
      st.boxShadow = "none";
      st.borderRadius = "0";
      st.fontSize = `${(basePx || 14) * s.size * 1.18}px`;
      st.fontWeight = 800;
      st.letterSpacing = "-0.01em";
      st.textShadow =
        "-2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000, 0 4px 16px rgb(0 0 0 / 0.9)";
    } else if (s.theme === "broadcast") {
      st.backdropFilter = `blur(${s.blur}px) saturate(1.3)`;
      st.background = `rgb(8 10 16 / ${s.bg})`;
      st.border = "";
      st.borderLeft = "4px solid #ff3b2e";
      st.borderRadius = "8px";
      st.fontWeight = 700;
      st.letterSpacing = "0.04em";
      st.boxShadow = "0 10px 30px rgb(0 0 0 / 0.5), inset 0 1px 0 rgb(255 255 255 / 0.1)";
    } else if (s.theme === "frost") {
      st.background = "rgb(255 255 255 / 0.78)";
      st.color = "#14141a";
      st.border = "1px solid rgb(255 255 255 / 0.7)";
      st.boxShadow = "0 10px 30px rgb(0 0 0 / 0.3), inset 0 1px 0 #fff";
      st.textShadow = "none";
    } else if (s.theme === "cinema") {
      // Letterbox bar: opaque black, wide tracking, no blur (cheap on video).
      st.background = `rgb(3 3 4 / ${s.bg})`;
      st.color = "#f7f3e9";
      st.borderRadius = "8px";
      st.padding = "0.3em 0.85em";
      st.letterSpacing = "0.02em";
      st.fontWeight = 500;
      st.boxShadow = "0 10px 30px rgb(0 0 0 / 0.45), inset 0 1px 0 rgb(255 255 255 / 0.08)";
      st.textShadow = "0 1px 2px rgb(0 0 0 / 0.6)";
    } else if (s.theme === "prism") {
      // Dark glass with a gradient hairline: two backgrounds, first clipped to
      // the padding box, second to the border box (the border itself is
      // transparent). No animation — a moving gradient re-rasterizes the pill.
      st.backdropFilter = `blur(${s.blur}px) saturate(1.25)`;
      st.border = "1px solid transparent";
      st.background =
        `linear-gradient(rgb(12 12 18 / ${s.bg}), rgb(12 12 18 / ${s.bg})) padding-box, ` +
        "linear-gradient(120deg, #7c3aed, #22d3ee 38%, #ec4899 68%, #fbbf24) border-box";
      st.boxShadow = "0 10px 34px rgb(124 58 237 / 0.28), 0 10px 30px rgb(0 0 0 / 0.4), inset 0 1px 0 rgb(255 255 255 / 0.14)";
    } else if (s.theme === "mono") {
      st.backdropFilter = `blur(${s.blur}px) saturate(1.1)`;
      st.background = `rgb(22 22 24 / ${s.bg})`;
      st.color = "#f2f2f4";
      st.border = "1px solid rgb(255 255 255 / 0.18)";
      st.letterSpacing = "0.015em";
      st.boxShadow = "0 10px 30px rgb(0 0 0 / 0.45), inset 0 1px 0 rgb(255 255 255 / 0.18)";
    } else if (s.theme === "custom") {
      st.lineHeight = String(s.lh);
      st.letterSpacing = `${s.ls}em`;
      st.color = s.text;
      st.background = hexToRgba(s.bgc, s.bg);
      st.backdropFilter = `blur(${s.blur}px) saturate(1.3)`;
      st.borderRadius = `${s.radius}px`;
      st.padding = `${s.padY}em ${s.padX}em`;
      st.border = `${s.borderW}px solid ${s.accent}`;
      const glow = s.glow > 0 ? `0 0 ${s.glow}px ${hexToRgba(s.accent, 0.45)}, ` : "";
      st.boxShadow = `${glow}0 10px 30px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.14)`;
      if (s.edge === "none") {
        st.textShadow = "none";
      } else if (s.edge === "outline") {
        const e = ((s.edgeStrength / 100) * 3).toFixed(1);
        st.textShadow =
          `${e}px 0 0 #000, -${e}px 0 0 #000, 0 ${e}px 0 #000, 0 -${e}px 0 #000, ` +
          "0 4px 18px rgb(0 0 0 / 0.8)";
      } else {
        const t = (s.edgeStrength / 100).toFixed(2);
        st.textShadow = `0 2px 12px rgb(0 0 0 / ${t}), 0 1px 3px rgb(0 0 0 / ${t})`;
      }
    }
  }

  /* Named styles live under one sync key so the flat active-settings keys
     the content script reads are never disturbed. Shape:
     { [name]: { settings: {...}, updatedAt: number } } */
  const PRESETS_KEY = "mcPresets";
  // Storage keys are plain-object keys; these three would mutate a prototype
  // when assigned through brackets, so they are never accepted as names.
  const UNSAFE_NAMES = new Set(["__proto__", "constructor", "prototype"]);

  function isSafeStyleName(name) {
    return typeof name === "string" && name.trim().length > 0 && !UNSAFE_NAMES.has(name);
  }

  async function getPresets() {
    try {
      const r = await chrome.storage.sync.get({ [PRESETS_KEY]: {} });
      const v = r[PRESETS_KEY];
      if (!v || typeof v !== "object") return {};
      const out = {};
      for (const [name, preset] of Object.entries(v)) {
        if (!isSafeStyleName(name) || !preset || typeof preset !== "object") continue;
        if (!preset.settings || typeof preset.settings !== "object") continue;
        out[name] = {
          settings: normalizeSettings(preset.settings),
          updatedAt: Number(preset.updatedAt) || 0,
        };
      }
      return out;
    } catch {
      return {};
    }
  }

  async function setPresets(map) {
    const clean = {};
    for (const [name, preset] of Object.entries(map || {})) {
      if (isSafeStyleName(name)) clean[name] = preset;
    }
    await chrome.storage.sync.set({ [PRESETS_KEY]: clean });
  }

  // Strip anything that isn't a known setting (e.g. future keys, junk).
  function extractSettings(state) {
    const full = normalizeSettings(state);
    const out = {};
    for (const k of Object.keys(DEFAULTS)) out[k] = full[k];
    return out;
  }

  /* Builds the grouped font <select> from FONT_GROUPS so the popup and the
     options page can never drift apart or fall behind a new face.
     Each option renders in its own stack: if a font isn't installed you see
     its fallback, which is exactly what the caption will get — the picker
     never advertises a face the video won't use. */
  function fillFontSelect(select, selected) {
    if (!select) return;
    select.textContent = "";
    for (const group of FONT_GROUPS) {
      const og = document.createElement("optgroup");
      og.label = group.label;
      for (const f of group.fonts) {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = f.label;
        opt.style.fontFamily = f.stack;
        og.appendChild(opt);
      }
      select.appendChild(og);
    }
    // A stored id we no longer ship (hand-edited import, retired face) would
    // otherwise blank the select, since an unknown value selects nothing.
    select.value = selected in FONTS ? selected : DEFAULTS.font;
    // Also adopt the chosen face in the *closed* control: with the list folded
    // away, the closed select is the only thing still on screen, so it's the
    // "what did I pick" readout. Listeners are attached once per element.
    const preview = () => {
      select.style.fontFamily = FONTS[select.value] || FONTS.inter;
    };
    preview();
    if (!select.dataset.mcFontBound) {
      select.addEventListener("change", preview);
      select.dataset.mcFontBound = "1";
    }
  }

  /* Builds the theme buttons from THEMES. Swatch looks live in CSS keyed by
     [data-theme], so adding a theme is one catalogue entry + one rule. */
  function fillThemeGrid(grid, compact) {
    if (!grid) return;
    grid.textContent = "";
    for (const t of THEMES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme";
      btn.dataset.theme = t.id;
      btn.title = `${t.label} — ${t.hint}`;
      const sw = document.createElement("span");
      sw.className = compact ? "dot" : "sw";
      if (!compact) {
        const cap = document.createElement("span");
        cap.className = "sw-cap";
        cap.textContent = "Aa";
        sw.appendChild(cap);
      }
      btn.appendChild(sw);
      if (compact) {
        const label = document.createElement("span");
        label.className = "tlabel";
        label.textContent = t.label;
        btn.appendChild(label);
      } else {
        const meta = document.createElement("span");
        meta.className = "tmeta";
        const strong = document.createElement("strong");
        strong.textContent = t.label;
        const small = document.createElement("small");
        small.textContent = t.hint;
        meta.append(strong, small);
        btn.appendChild(meta);
      }
      grid.appendChild(btn);
    }
  }

  /* Segmented controls: one sliding, spring-animated highlight behind the
     active option. Position is expressed as an index/count pair in CSS vars
     so no pixel measuring is needed. Creates the glider on first use. */
  /* Places a sliding highlight over the active option. Width and offset are
     computed here (padding is known from CSS) so the stylesheet needs no
     division by a custom property. */
  function positionGlider(glider, index, count, pad) {
    const n = Math.max(1, count);
    const inset = pad * 2;
    glider.style.width = `calc((100% - ${inset}px) / ${n})`;
    glider.style.left = `calc(${pad}px + (100% - ${inset}px) / ${n} * ${index})`;
  }

  function layoutSeg(seg) {
    if (!seg) return;
    let glider = seg.querySelector(":scope > .seg-glider");
    if (!glider) {
      glider = document.createElement("span");
      glider.className = "seg-glider";
      glider.setAttribute("aria-hidden", "true");
      seg.prepend(glider);
    }
    const buttons = seg.querySelectorAll(":scope > button");
    let index = 0;
    buttons.forEach((b, i) => {
      if (b.classList.contains("is-active")) index = i;
      b.setAttribute("aria-pressed", b.classList.contains("is-active") ? "true" : "false");
    });
    seg.style.setProperty("--seg-i", String(index));
    positionGlider(glider, index, buttons.length, 4);
  }

  function layoutAllSegs(root) {
    (root || document).querySelectorAll("[data-seg]").forEach(layoutSeg);
  }

  /* Same slider, used by the popup's tab bar. */
  function layoutTabs(nav) {
    if (!nav) return;
    const glider = nav.querySelector(".tab-glider");
    if (!glider) return;
    const tabs = nav.querySelectorAll(".tab");
    let index = 0;
    tabs.forEach((t, i) => {
      if (t.classList.contains("is-active")) index = i;
    });
    positionGlider(glider, index, tabs.length, 3);
  }

  /* Slider fill that can't drift: the fill lives on the input itself, shrunk
     to exactly the thumb's travel, so a plain stop-position % always ends on
     the thumb center. Mirrors the options page stylesheet. */
  function syncRangeFill(range) {
    if (!range || range.type !== "range") return;
    const min = parseFloat(range.min || "0");
    const max = parseFloat(range.max || "100");
    const value = parseFloat(range.value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(value)) return;
    const raw = max > min ? (value - min) / (max - min) : 0.5;
    range.style.setProperty("--p", `${(Math.min(1, Math.max(0, raw)) * 100).toFixed(2)}%`);
  }

  function syncRangeFills(root) {
    (root || document).querySelectorAll('input[type="range"]').forEach(syncRangeFill);
  }

  globalThis.MC = {
    DEFAULTS,
    THEMES,
    FONTS,
    FONT_GROUPS,
    FORMATS,
    PRESETS_KEY,
    normalizeSettings,
    isSafeStyleName,
    hexToRgba,
    paintCaption,
    getPresets,
    setPresets,
    extractSettings,
    fillFontSelect,
    fillThemeGrid,
    layoutSeg,
    layoutAllSegs,
    layoutTabs,
    syncRangeFill,
    syncRangeFills,
  };
})();
