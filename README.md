# KinoCaps

Replaces YouTube's dated yellow-on-black caption boxes with a cinematic,
streaming-style caption design — glassmorphic pills, word-by-word pop-in
animation, and named styles (15 presets + a Custom lab + your own saved styles).
YouTube's own caption engine keeps running untouched; the extension only re-skins its output.

Built for Chrome 111+ (Manifest V3), with a studio-style editor, a compact
toolbar popup, keyboard toggles, and no network requests of any kind.

## Install (developer mode)

1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select this folder (`kinocaps`).

## Use

**Popup** (toolbar icon, or `Alt+Shift+K`) — three tabs keep it short:
**Look** (presets and basic sliders), **Type** (19 fonts, weight, italic, live
specimen), and **Custom** (colors and advanced sections). A live preview sits
above the tabs with a replay button; **Full editor ↗** opens the options page.

**Keyboard** — `Alt+Shift+C` toggles KinoCaps on every open YouTube tab without
opening the popup. The toolbar badge shows **OFF** while styling is paused.

**Options page** (full editor) — right-click the toolbar icon → Options, or open
from the popup. Wide two-column layout:

- **Screening room** (sticky) — a mock player with two caption lines rendered
  with your exact settings (size, colors, radius, glow, edge, alignment, gap,
  position, word animation). The preview auto-fits its frame so long lines
  never clip. Editable sample text, Replay animation, and a Test on YouTube
  link. Every tweak applies live to any open YouTube tab too (same sync storage
  the content script reads).
- **My styles** — name the current look and hit **Save style**. Click a saved
  name to apply it instantly, × to delete. **Export all (.json)** /
  **Import…** for backup or sharing. Styles sync across devices.
- Same theme buttons, Basics sliders, Typography section and Custom sections as
  the popup. Editing any Custom control auto-switches to the Custom theme.

Changes apply live to the open video and sync across devices via
`chrome.storage.sync` (active settings as flat keys, named styles under one
`mcPresets` key so the reader path is never disturbed).

### All controls

- **Theme** — Glass, Outline (Netflix-style), Cream, Neon, Minimal, Karaoke,
  Aurora (iridescent gradient), Sunset (cinematic ember), Royal (indigo + gold),
  Social (bold TikTok-style pop), Broadcast (sports lower-third), Frost (white
  inverse glass), Cinema (letterbox bar), Prism (iridescent hairline), Mono
  (graphite glass), Custom. All 15 presets paint from one catalogue, so the
  popup and options page can never disagree about a look.
- **Size / Background / Blur / Lift** sliders (apply to every theme)
- **Shape** — Pill or Flat (presets; Custom uses its Corners slider)
- **Animation** — Rise, Fade, or Off
- **Typography** (applies to every theme) — font family, weight, italic
- **Custom theme sections**:
  - *Colors* — text, pill, and accent (border + glow) pickers
  - *Typography* — line height, letter spacing
  - *Box & layout* — corner radius, padding, border width, max width,
    line gap, left/center/right align, bottom/top position
  - *Effects* — text edge (none/shadow/outline) + strength, accent glow,
    animation speed, word stagger delay

## Fonts

19 faces in four groups, all **system fonts** — nothing is downloaded and no
network call is made:

| Group | Faces |
| --- | --- |
| Sans — clean | Inter, System UI, Segoe UI, Roboto, Arial, Verdana, Tahoma, Trebuchet MS |
| Serif — editorial | Georgia, Times New Roman, Cambria, Garamond, Palatino, Rockwell |
| Condensed & display | Arial Narrow, Impact, Franklin Gothic |
| Monospace | Cascadia Mono, Courier New |

A few things worth knowing:

- **Only installed fonts render.** Every entry is a stack — the named face
  first, then progressively wider fallbacks — so a missing font degrades to
  its nearest neighbour instead of the browser default. On Windows, *Impact*,
  *Arial Narrow*, *Rockwell* and *Trebuchet MS* all ship by default; *Inter*,
  *Roboto*, *Cambria*, *Palatino* and *Cascadia Mono* vary by machine, and the
  picker previews each option in its own stack so you can see which face you'll
  actually get before choosing.
- **No webfonts, deliberately.** MV3 gives content scripts the page's CSP, so a
  remote stylesheet can't be loaded into `youtube.com` — a downloaded webfont
  would render exactly like no font at all. Bundling `.woff2` files and
  injecting `@font-face` would work, at the cost of a few MB in the repo; that's
  the trade if you ever want guaranteed-identical rendering.
- **Italic is synthesised.** Upright faces only, so the browser slants them.
  Fine on the sans faces, noticeably fake on the heavy display ones.
- **Weight** is a real 400–800 slider. Some faces only ship one weight, so the
  browser fakes bold — *Impact* and *Rockwell* look best at 400.

`FONT_GROUPS` in `src/shared.js` is the single source of truth; both UIs build
their picker from it via `fillFontSelect`, so they can't drift apart.

## How it works

- `src/content.js` — a MutationObserver scoped to the video player (never all
  of `document.body`) watches for YouTube's `.ytp-caption-segment` nodes,
  wraps each word in a `.mc-word` span, and animates only *new* words
  (common-prefix diff, so streamed words pop in one at a time). Mutations are
  coalesced into one microtask, and the observer fully detaches while styling
  is off. Settings reach CSS as vars / `data-*` attributes on `<html>`, written
  only when the value changes.
- `src/styles.css` — all overrides scoped under `html.mc-enabled` with
  `!important` (YouTube sets inline styles on caption nodes). Word entrances
  use GPU-friendly transforms and opacity; `prefers-reduced-motion` disables
  them automatically.
- `src/shared.js` — DEFAULTS / THEMES / FONT_GROUPS / FONTS / FORMATS /
  paintCaption / presets store, loaded first by the content script, popup, and
  options page so all three stay in sync. Every stored or imported setting goes
  through `normalizeSettings`: numbers are clamped, enums and colors validated,
  unknown keys dropped, and style names checked against prototype-pollution
  keys.
- `src/background.js` — service worker for the toolbar badge, the
  `Alt+Shift+C` toggle command, and first-install onboarding.
- `options/` — full editor page: mock-player preview, named styles CRUD,
  import/export, same controls as the popup at a wider layout

## Security & performance

- Only the `storage` permission is requested. No host permissions, no
  `web_accessible_resources`, no remote code, no analytics, no network fetches.
- The options page uses system fonts; the previous Google Fonts request is gone.
- Caption work is player-scoped and event-driven: no polling of caption text, no
  full-document caption queries, no observers or timers while disabled.
- Slider and settings writes are rAF-coalesced and debounced; storage reads are
  merged locally instead of re-reading the whole sync area.
- Imported styles are treated as untrusted input and sanitized before use.

## Files

```
manifest.json          MV3 manifest (content script + worker + popup + options)
src/shared.js          DEFAULTS / themes / fonts / normalize / painter / presets
src/content.js         player-scoped observer + word wrapping + settings bridge
src/styles.css         caption themes and animations
src/background.js      badge, keyboard toggle, first-install onboarding
popup/popup.html|css|js  quick settings UI with live preview + Full editor link
options/options.html|css|js  full editor: screening room + named styles
options/options-decor.js     slider fills / ON AIR helper
icons/                 extension icons (16/32/48/128)
```

## Notes

- Requires captions to be enabled on the video itself — the extension
  styles YouTube's captions, it doesn't generate them.
- Shorts, embeds, and theater/fullscreen all work (content script runs in
  all frames on youtube.com).
- `prefers-reduced-motion` disables word animations automatically.
