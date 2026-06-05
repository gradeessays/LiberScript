# Liberscript — Product Vision & Feature Map

Liberscript = **write → analyze → design → preview → publish**, in one place, with
**BYO-AI** woven throughout. This doc captures the formatting/design vision (your
notes + expansions) and how it maps to the build. Subscription gating is noted as
`[Pro]` / `[Team]`; everything else is Free.

## 1. Writing
- Chapter-based TipTap editor with autosave, reorder, split/merge (done, Phase 3).
- Outline / corkboard (scene cards), goals, word sprints, focus mode.
- Version snapshots & history.

## 2. Formatting & Design Studio  ← the core of this vision
A **shared theme engine** drives both the live preview and the exporters, so what
you see is what you ship.
- **Genre themes** (presets, fully overridable): Novel, Non-fiction/Self-help,
  Poetry, Children's, Academic, Classic. Each sets typography, spacing, alignment,
  chapter-start treatment, scene breaks.
- **Chapter-start styling**: plain / rule-divider / ornament / large-number /
  centered; optional **drop cap**, small-caps first line, first-paragraph
  no-indent convention, vertical position on the page.
- **Drop caps** (configurable lines/size/font) and ornamental **scene-break**
  dividers (blank, asterism `* * *`, rule, custom glyph).
- **Trim sizes** (5×8, 5.25×8, 6×9, custom), margins, gutter/bleed for print.
- **Running headers/footers**: author name, book title, page numbers (print).
- **Callout/box styles** for non-fiction: tips, key-takeaways, exercises, quotes.
- **Poetry mode**: preserve line breaks, stanzas, hanging indents, centering.
- **Images**: inline figures w/ captions, full-page images, chapter images.

## 3. Front & Back Matter
- Auto-buildable sections: half-title, **title page** (with **publisher name +
  uploaded logo**), **copyright page** (auto from metadata: author, publisher,
  year, ISBN, rights), dedication, epigraph, **auto ToC**, acknowledgments,
  about-the-author, also-by, newsletter CTA, blank/section pages.
- Logo upload reuses the existing storage pipeline; inserted at the right section.

## 4. Live Preview
- **Print preview** (paginated to the chosen trim size, real page breaks via
  paged.js) **and ebook preview** (reflowable) side by side or toggled.
- Device frames (print page, Kindle, phone), light/dark ebook, page navigation.
- Renders from the **same HTML+CSS** the exporters use → true WYSIWYG.

## 5. Fonts & Typography
- Curated **free font library** (open-licensed / Google Fonts), font-pairing
  presets per genre.
- **Custom font upload** (woff2/ttf/otf) with license attestation — **[Pro]**;
  fonts embedded into EPUB/PDF on export.

## 6. AI (BYO key) — **[Pro]**
Generate and refine **and** format in one place:
- Draft/continue/expand/rewrite chapters; outline & beat generator.
- Blurb / back-cover copy / description; title & subtitle ideas.
- KDP keywords & categories; chapter summaries; tone & style adjustments.
- Consistency checks (names, tense, POV) feeding the analysis engine; translate.
- Keys stored AES-256-GCM (already modeled), provider-agnostic.

## 7. Analysis / Critique (AutoCrit pillar)
- Deterministic NLP: adverbs, passive voice, repetition, clichés, dialogue tags,
  sentence-length variation, filler words, pacing, show-vs-tell; readiness score.
- Surfaced **inline in the editor**; AI-enhanced passes with a key. (Phase 4.)

## 8. Publishing & Export
- **EPUB3** (a11y-aware: alt text, semantic headings, reading order), print-ready
  **PDF** (KDP/IngramSpark trim + bleed), **DOCX**.
- ISBN/barcode helper; per-platform metadata validation (KDP/Apple/Kobo/Ingram).
- Series / box-set management.

## 9. Free-tier attribution (watermark)
- Free exports include a **"Made with Liberscript"** line on the copyright page /
  export footer. Removed on **[Pro]**. (Same model as Atticus/Canva free tiers.)

## 10. Collaboration **[Team]**
- Shared team projects (done), comments/suggestions, beta-reader share links,
  track-changes, activity feed.

---

## Subscription tiers (working model)
| Capability | Free | Pro | Team |
|---|---|---|---|
| Editor, basic genre themes, EPUB/PDF/DOCX export | ✓ | ✓ | ✓ |
| Liberscript attribution on exports | shown | removable | removable |
| Custom font upload | — | ✓ | ✓ |
| BYO-AI tools | — | ✓ | ✓ |
| Advanced/premium themes, unlimited projects/exports | limited | ✓ | ✓ |
| Team collaboration (roles, comments, share links) | — | — | ✓ |

Enforced via `@liberscript/core` `PLAN_LIMITS` (extended with `customFonts`,
`removeWatermark`, `premiumThemes`) and tRPC middleware; billing in Phase 8 (Stripe).

## Architecture keystone
A single **`@liberscript/format`** package owns: theme definitions, genre presets,
TipTap→HTML rendering, drop-cap/chapter-start/scene-break/front-matter rendering,
and the CSS for print vs ebook targets. **The live preview and every exporter
consume this one renderer** — guaranteeing preview matches output. Custom fonts and
watermark are inputs to the renderer, gated by plan.

## Build order (revised)
Formatting/Design + Live Preview is brought forward (it's the spine):
**A. Format engine + genre themes + live preview (start now)** →
**B. Front/back matter + logo + fonts** → **C. Export engine (EPUB/PDF/DOCX)** →
**D. Analysis/critique** → **E. AI BYO tools** → **F. Billing/gating** →
**G. Collaboration** → **H. Hardening**.
