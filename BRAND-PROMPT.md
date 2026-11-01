# KinoCaps — Premium Identity Prompt Pack

A logo direction and copy-paste prompt set for turning KinoCaps from "another caption extension" into a cinema-grade brand.

---

## 01 · What KinoCaps actually is

- A Chrome MV3 extension that **re-skins YouTube's captions** — it does not generate them.
- The product's hero object is the **caption pill**: glass, word-by-word pop-in, 15 curated themes, a Custom lab, saved styles.
- It has a compact popup and a full **studio editor** with a live "screening room" preview.
- It is deliberately private: only the `storage` permission, system fonts, **zero network requests**.
- Audience: film and video-essay creators, clip channels, subtitle obsessives, accessibility-minded viewers, and design-literate people who care how every frame looks.

**Positioning:** For creators who care how every frame looks, KinoCaps is the caption studio that turns YouTube's utility text into cinema — without touching the video, the platform, or your privacy.

**Manifesto line:** YouTube treats captions as an accessibility layer. KinoCaps treats them as the last 5% of the film.

---

## 02 · The brand problem

The current icon is a **"CC" monogram on a magenta-to-purple gradient**. That is the universal visual language of a default Chrome extension. It says "utility," not "cinema." It also collides with the category:

| Cliche | Why to avoid it |
| --- | --- |
| Purple/blue AI gradient | Reads as generated, cheap, interchangeable |
| "CC" letters | Generic; describes the feature, not the feeling |
| Film reel / clapperboard / popcorn | Literal, tourist-cinema, impossible at 16 px |
| Play button in a circle | Belongs to every video tool on earth |
| YouTube red | Confuses the product with the platform it styles |
| 3D gloss, bevels, drop shadows | Kills the flat, modern app-icon silhouette |

The ownable territory is **quiet cinema**: ink black, warm bone, one projector-amber accent, title-card typography, and the caption pill itself as the mark.

---

## 03 · The idea: "The Speaking K"

The mark is a confident geometric **K** whose lower diagonal leg does not end in a point. It flattens and extends into a fully rounded **caption bar**, as if the letter is speaking a line of dialogue. A single **amber period** sits at the end of the bar — the full stop, the playhead, the word that just landed.

It reads three ways:

1. **K** — the brand initial, unmistakable at 16 px.
2. **K.** — a monogram with a full stop; a signature.
3. **K + caption bar + playhead** — the product's action, visible at 128 px.

The upper arm stays a clean diagonal. The stem is vertical. One continuous Bone form on near-black Ink. No outline, no second stroke, no effects.

**Why this beats a K-in-a-box:** the caption bar is not a container around the letter — it is *part of the letter*. The concept lives in the stroke, so it survives at favicon size. The amber period gives the brand a punctuation mark it can own everywhere: toggles, "live" states, the end of a sentence, the end of a clip.

**Fallback route** if the leg-to-bar fusion reads awkwardly in generation: a solid Bone K inside a Bone hairline caption pill, with the amber period outside the pill. Keep the same palette and type.

---

## 04 · Identity system

### Palette

| Token | Hex | Role | Usage |
| --- | --- | --- | --- |
| Ink | `#08090C` | Field | App icon background, brand canvas, UI base |
| Carbon | `#14161C` | Surface | Panels, cards, raised UI |
| Bone | `#F3EEE4` | Primary | The mark, wordmark, primary text |
| Kino Amber | `#F0B45E` | Signal | The playhead period, active states, slider fills, focus rings |
| Ember | `#D9503F` | Functional | Destructive actions and the "live" dot only — never in the logo |
| Muted | `#98989F` | Secondary | Labels, hints, metadata |

**Rules:** no purple, no blue, no magenta, no YouTube red, no neon, no rainbow. Amber is the only brand accent. If the existing rose equity must be retained, swap Amber for **Kino Coral `#FF4D5E`** — but never run both.

### Typography

- **Wordmark:** lowercase `kinocaps`, warm geometric grotesque with humanist details (Söhne, General Sans, or Neue Haas Grotesk character), weight 500–550, tracking `-0.025em`, generous x-height, gently rounded terminals.
- **Casing:** lowercase in the logo; `KinoCaps` in UI copy and legal text.
- **Accent:** the wordmark is entirely Bone. The only amber in the lockup is the period in the mark.
- **Editorial secondary:** a high-contrast serif (Canela / Editorial New feel) for manifesto lines and section titles in the brand deck only — never inside the logo.
- **Production:** convert the wordmark to outlines; do not ship a webfont dependency into the extension.

### Mark construction

- One stroke weight throughout; geometric with slightly rounded terminals (not fully round, not sharp).
- K height : caption bar length ≈ **1 : 1.35**.
- Bar thickness = K stroke thickness; bar ends are perfect semicircles.
- Amber period diameter = bar thickness; separated from the bar by one period-width of negative space.
- The leg-to-bar junction sits on the baseline; the upper arm meets the stem at the **optical center**, not the mathematical center.
- At 16 px, drop the period if it disappears and shorten the bar slightly — the silhouette must stay a K.
- Draw as flat vector paths. No outline, no second stroke, no gradient, no shadow.

### Motion signature

The product's default word stagger is **28 ms**. Make that the brand's motion DNA: words arrive left-to-right in 28 ms steps, and the amber period lands last with a single soft scale from 0.8 to 1. No bounce beyond 4%, no glow. This is the logo's animation and the UI's reveal language.

### Voice

Short, dry, confident. Director, not decorator.

- **Primary tagline:** Captions, directed.
- **Secondary:** Every word, in frame.
- **Micro-copy:** "The last 5% of the film." / "Your video. Your titles." / "Nothing random."

---

## 05 · The master prompt

Copy everything inside the block into GPT Image, Ideogram, Recraft, or any high-fidelity image model. It is written for a **brand presentation sheet**, not a single isolated glyph — that is what produces a premium, coherent result.

```text
Design a complete premium logo identity and presentation sheet for "kinocaps" (displayed lowercase), a Chrome extension that replaces YouTube's default captions with cinematic, director-grade caption styles.

THE PRODUCT
kinocaps turns ordinary YouTube subtitles into designed film titles: frosted glass caption pills, word-by-word pop-in animation, 15 curated looks, and a live studio editor. It is a quiet film-title studio inside a browser toolbar. Audience: film and video-essay creators, clip channels, subtitle obsessives, and design-literate viewers who care how every frame looks.

THE BRAND IDEA — "The Speaking K"
Build the mark from a confident geometric letter K and the product's hero object, the caption bar. The K's lower diagonal leg does not end in a point: it flattens and extends into a horizontal, fully rounded caption bar, as if the letter is speaking a line of dialogue. A single warm amber period sits at the far right end of that bar — the full stop, the playhead, the word that has just landed. The upper arm of the K stays a clean diagonal. The stem is vertical. The whole mark is one continuous Bone-colored form on near-black Ink, with open negative space and consistent stroke weight. It must read as a bold K at 16 px and reveal the caption-bar/playhead idea at 128 px.

CONSTRUCTION
One weight throughout, geometric, slightly rounded terminals. K height to caption bar length ratio 1:1.35. The bar thickness equals the K stroke; its ends are perfect semicircles. The amber period is the same diameter as the bar thickness, separated from the bar by one period-width of negative space. The leg-to-bar junction sits on the baseline; the upper arm joins the stem at the optical center, not the mathematical center. The mark must be drawable as flat vector paths: no outline, no second stroke, no gradient, no shadow.

PALETTE — use exactly these, nothing else
Ink #08090C — background field, theater-dark
Carbon #14161C — secondary panels only
Bone #F3EEE4 — the mark and wordmark
Kino Amber #F0B45E — only the playhead period
No purple, no blue, no magenta, no YouTube red, no neon, no rainbow.

WORDMARK
Lowercase "kinocaps" in a warm geometric grotesque with humanist details, in the character of Söhne, General Sans, or Neue Haas Grotesk. Medium weight 500–550, tight tracking -0.025em, generous x-height, gently rounded terminals. The wordmark is entirely Bone; the only amber in the lockup is the period in the mark. The wordmark sits optically centered against the mark, with the mark's cap height matching the wordmark's ascender height. Spell it exactly: k-i-n-o-c-a-p-s. No other spelling.

PRESENTATION SHEET — one image, 3:2 landscape
A calm, museum-grade identity board on Ink, with wide margins, thin Bone hairlines at 12% opacity, and a strict grid. No device mockups, no stock photography, no decorative blobs.
- Left 62%: the primary horizontal lockup, large and centered — K mark + "kinocaps" — with the tagline "Captions, directed." beneath in small, letterspaced Bone capitals.
- Top right: the app icon — a 1024 px squircle of Ink with the Bone mark centered, subtly lifted by a 4% top-edge glass highlight. Beneath it, the same icon at 128, 48, 32 and 16 px in a neat row, proving the 16 px silhouette.
- Bottom right: three small square specimen cards — mark in Bone on Ink; mark in Ink on Bone; mark in Kino Amber on Ink. Perfectly centered, equal margins.
- Bottom left: a hairline construction diagram of the K and caption bar, with tiny measurement ticks, a 1:1.35 ratio note, and the label "16 px test".
The only text on the sheet: "kinocaps", "Captions, directed.", "MARK", "APP ICON", "16 / 32 / 48 / 128", "16 px test". No lorem ipsum, no fake paragraphs.

STYLE
Flat vector, print-grade precision, crisp edges, perfect optical alignment, generous negative space, quiet luxury, cinematic restraint. Think a title card for a film about typography, designed by a senior identity studio. A 2% paper grain may sit on the Ink background only. Every element must look drawn by a human in Illustrator, not generated: mathematically consistent, no wobble, no accidental asymmetry.

AVOID
The letters CC; film reels; clapperboards; popcorn; cameras; play buttons in circles; laurel wreaths; spotlights; speech-bubble tails; 3D bevels; glossy glass; drop shadows; rainbow or purple-blue AI gradients; neon glow; mascots; multiple unrelated logo styles; mockups of phones, laptops, shirts or packaging; watermarks; misspelled text; clutter.

The final image should feel like a $25,000 identity presentation: one idea, one accent, zero decoration.
```

---

## 06 · Compact prompts

### Ideogram / Recraft / GPT Image (quick pass)

```text
Premium logo identity for "kinocaps", a cinematic YouTube caption extension. A Bone #F3EEE4 geometric letter K whose lower diagonal leg extends into a fully rounded horizontal caption bar, ending in one small Kino Amber #F0B45E period, on near-black Ink #08090C. Lowercase "kinocaps" wordmark in a tight warm grotesque, all Bone. Flat vector, SVG-clean geometry, no gradients, no shadows, no bevels, no gloss, no CC letters, no film reels, no clapperboard, no purple. Brand presentation board, 3:2, wide margins, thin hairlines, app icon at 16/32/48/128, monochrome specimens, construction grid. Museum-grade, A24 x Criterion restraint.
```

### Midjourney v7

```text
flat vector logo identity board for "kinocaps", cinematic caption extension, bone-white geometric K whose lower leg becomes a rounded caption bar with one amber period, near-black ink background, lowercase kinocaps wordmark, warm grotesque, ink #08090C bone #F3EEE4 amber #F0B45E only, app icon 16 32 48 128, monochrome specimens, construction grid, generous negative space, A24 Criterion title-card minimalism, premium brand guidelines --style raw --ar 3:2 --s 50 --no CC, film reel, clapperboard, camera, play button, 3d, bevel, gloss, gradient, glow, drop shadow, mockup, clutter, watermark
```

### Clean lockup only

```text
Flat vector horizontal logo lockup for "kinocaps", a premium cinematic caption extension. Mark: a Bone #F3EEE4 geometric letter K whose lower diagonal leg extends into a fully rounded horizontal caption bar, ending in one small Kino Amber #F0B45E period. Wordmark: lowercase "kinocaps" in a warm geometric grotesque, all Bone, medium weight, tight -0.025em tracking. Solid Ink #08090C background. Optically centered, generous clear space. Flat fills only — no gradients, strokes, shadows, bevels, gloss, mockups, or extra text. Crisp SVG-grade geometry, 16 px legibility. 3:1 aspect ratio.
```

### App icon only (the production asset)

```text
Flat vector app icon, 1024x1024, one idea: a Bone #F3EEE4 geometric letter K on a near-black Ink #08090C squircle, where the K's lower diagonal leg flattens into a fully rounded horizontal caption bar, and one small Kino Amber #F0B45E period sits at the bar's right end. Consistent stroke weight, slightly rounded terminals, open counters, optically corrected. No text, no gradient, no bevel, no shadow, no gloss, no border, no inner glow. Centered with 18% padding. The silhouette must be unmistakable at 16x16. SVG-clean geometry, premium cinema brand, A24 / Criterion minimalism.
```

---

## 07 · Agent prompt: build the real SVG + PNG set

Image models produce references, not production vectors. Use this prompt in a coding agent once you pick a direction:

```text
Act as a senior brand designer and SVG engineer. Build the production icon set for KinoCaps.

Concept: a Bone #F3EEE4 geometric letter K on an Ink #08090C squircle; the K's lower diagonal leg flattens into a fully rounded horizontal caption bar ending in a Kino Amber #F0B45E period. One weight throughout, slightly rounded terminals, open counters, optically corrected. No text, no gradients, no filters, no external fonts, no shadows, no gloss.

Deliver:
1. icons/icon.svg — 128x128 viewBox, single source of truth: squircle background path, Bone K + bar, amber period. No raster effects.
2. icons/icon-mono.svg — same mark in a single color on transparent, for one-color contexts.
3. Exported PNGs at 128, 48, 32 and 16 px, with the Ink squircle baked in, optimized.
4. icons/preview.html — a plain HTML page showing the icon at 16, 32, 48 and 128 px on white, Ink, and a YouTube-like dark background, plus a grayscale filter row and a 16 px pixel-grid zoom.
5. Exact SVG path data and a 5-line rationale.

Constraints: 16 px silhouette must read as a K; no stroke thinner than 2 px at 16 px; no accidental asymmetry; no AI wobble. Match the geometry to the construction ratios: K height to bar length 1:1.35; period diameter equals stroke weight. Keep the files small and hand-editable.
```

---

## 08 · Acceptance test

Before shipping, the mark must pass all six:

- [ ] **16 px test** — still reads as a K in a browser toolbar, not a blob.
- [ ] **Squint test** — the K and the bar are one form, not a letter next to a dash.
- [ ] **Grayscale test** — no information depends on the amber period.
- [ ] **One-color test** — works as solid Bone on Ink and solid Ink on Bone.
- [ ] **Contrast test** — Bone on Ink exceeds 7:1; amber is never used for body text.
- [ ] **Recognition test** — shown next to YouTube, Letterboxd, MUBI and Criterion icons, it holds its own without relying on the wordmark.

---

## 09 · After the logo: apply the system

The logo only works if the product stops disagreeing with itself. The popup currently uses `--accent: #ff375f`; the options page uses `--accent: #ff453a`. Unify both to the new tokens:

```css
:root {
  --ink: #08090c;
  --carbon: #14161c;
  --bone: #f3eee4;
  --amber: #f0b45e;
  --ember: #d9503f;   /* destructive + live dot only */
  --muted: #98989f;
}
```

- Use **Bone** for primary text, **Muted** for hints, **Ink/Carbon** for surfaces.
- Use **Amber** for active toggles, slider fills, focus rings and the "ON AIR" dot.
- Use **Ember** only for destructive actions and the recording/live state.
- Remove purple entirely. Let the video preview supply the only other colors on screen.
- Set the wordmark in the logo to outlines; the UI can keep the system font stack.
- Add the amber period as a recurring detail: end of the tagline, "saved" confirmation, the last word in the preview animation.

---

*Brand direction and prompt pack for KinoCaps. The mark is the product: a K that speaks a line, and puts a full stop on it.*
