# Editor & Design UX — Book Builder

Goal: the editor is a **structured book**, not a blob of chapters. Authors assemble
typed **elements** (front matter → body → back matter), fill simple forms for the
boilerplate, write prose with a WYSIWYG page, and **export from the previewer**
once everything aligns. Same renderer powers editor page, preview, and export.

## Book = ordered elements (typed)
`Chapter` gains `kind` + `data`. Kinds:

- **Front matter:** `TITLE_PAGE`, `COPYRIGHT`, `EPIGRAPH`, `DEDICATION`, `TOC`
  (auto), `PROLOGUE`, `INTRODUCTION`.
- **Body:** `PART`, `CHAPTER`.
- **Back matter:** `ACKNOWLEDGMENTS`, `ABOUT_AUTHOR`, `ALSO_BY`.

Optional elements are simply present/absent. The sidebar groups them and offers an
**“+ Add element”** menu per group. Reorder within constraints (front matter stays
in front, etc.).

### Element editing UX
- **Title Page** → form: Title, Subtitle, Author, Publisher, **Logo upload**.
- **Copyright & Disclaimer** → pick **genre** (fiction / non-fiction / self-help /
  poetry / children’s) → a complete, professional copyright+disclaimer is
  generated. User just fills Author / Publisher / ISBN / Year (or uploads logo);
  “**Published by**” sits under the disclaimer; **ISBN** line included; **“Made with
  Liberscript”** auto-added on the free tier. One-click **“write my own”** to
  replace. Font auto-shrinks to **fit a single page**.
- **Epigraph** → quote + attribution, with **multiple quote styles** (centered
  italic, rule-bordered, large-quote, small-caps attribution…).
- **Dedication / Prologue / Introduction / Chapters / Back matter** → WYSIWYG
  page editor (paragraph, H1–H3, blockquote, italic/bold, lists).
- **Table of Contents** → **auto-generated** from PART/CHAPTER elements; read-only.
- **Chapters** → add blank to write in-app, or paste from a draft.

## WYSIWYG page editor
The editor renders each element through the **same theme CSS as the preview**, in a
page-shaped surface, so writing looks like the printed page. Export happens from the
**previewer** after the author scrolls the whole book.

## Typography & trim controls (design panel)
- **Trim size**: all standard KDP sizes (5×8, 5.06×7.81, 5.25×8, 5.5×8.5, 6×9,
  6.14×9.21, 7×10, 8×10, 8.5×11) + **custom W×H**; print vs ebook. Preview shows
  **real pages** at the chosen size (paged.js — follow-up).
- **Body & heading font**, **font size**, **line spacing**, **paragraph spacing**,
  indent vs block paragraphs.
- Opening-quote/attribution style options; scene-break style.

## Cover Studio (parallel feature — spec)
- Upload **front cover** → extract **dominant color** → auto-generate matching
  **back cover + spine** (KDP spine width from page count × paper type).
- Author writes **back-cover blurb**; live **mockup** with **ISBN/barcode**
  placement box; paperback & hardcover templates; full-wrap **preview + export**
  at KDP bleed/trim specs.

## Build order
1. **Structured elements + front matter + auto-TOC + genre copyright** (this slice).
2. Trim-size + typography controls; epigraph/quote styles.
3. WYSIWYG page styling in the editor; paged.js real pagination.
4. **Cover Studio**.
5. Export engine (EPUB/PDF/DOCX) consuming all of the above.
