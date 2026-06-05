export type PaperType = 'white' | 'cream' | 'color';
export type Binding = 'paperback' | 'hardcover';
export type CoverMode = 'preview' | 'export';

/** KDP paper thickness (inches per page), used for spine width. */
const PAGE_THICKNESS: Record<PaperType, number> = {
  white: 0.002252,
  cream: 0.0025,
  color: 0.002347,
};

const SAFE_MARGIN_IN = 0.25;
const IN = 96; // CSS px per inch (preview)

/** Spine width in inches for a given page count + paper. */
export function spineInches(pageCount: number, paper: PaperType): number {
  return Math.max(0, pageCount) * PAGE_THICKNESS[paper];
}

export interface CoverDimensions {
  totalWidthIn: number;
  totalHeightIn: number;
  spineIn: number;
  /** Outer wrap/bleed per edge (varies by binding). */
  wrapIn: number;
  /** Per-side hinge gap (hardcover only). */
  hingeIn: number;
  backWidthIn: number;
  frontWidthIn: number;
}

export function coverDimensions(input: {
  trimWidthIn: number;
  trimHeightIn: number;
  pageCount: number;
  paper: PaperType;
  binding?: Binding;
}): CoverDimensions {
  const hardcover = input.binding === 'hardcover';
  // Hardcover (case-laminate) approximations vs. paperback full-bleed wrap.
  const wrapIn = hardcover ? 0.625 : 0.125;
  const hingeIn = hardcover ? 0.25 : 0;
  const spineIn = spineInches(input.pageCount, input.paper) + (hardcover ? 0.125 : 0);
  const backWidthIn = input.trimWidthIn + wrapIn + hingeIn;
  const frontWidthIn = input.trimWidthIn + wrapIn + hingeIn;
  return {
    spineIn,
    wrapIn,
    hingeIn,
    backWidthIn,
    frontWidthIn,
    totalWidthIn: backWidthIn + spineIn + frontWidthIn,
    totalHeightIn: input.trimHeightIn + wrapIn * 2,
  };
}

export interface CoverInput {
  title: string;
  author?: string;
  trimWidthIn: number;
  trimHeightIn: number;
  pageCount: number;
  paper: PaperType;
  dominantColor: string;
  spineColor?: string;
  frontImageUrl?: string;
  backText?: string;
  textColor?: string;
  binding?: Binding;
  /** `preview` shows guides + barcode mockup; `export` is clean/printable. */
  mode?: CoverMode;
  isbn?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** A plausible EAN-13-looking barcode built from CSS bars (mockup only). */
function barcodeBars(): string {
  const pattern = '1011001101011010011010011001011011001011010011001101';
  let bars = '';
  for (const ch of pattern) {
    const w = ch === '1' ? 2 : 1;
    bars += `<span style="display:inline-block;width:${w}px;height:100%;background:${ch === '1' ? '#000' : 'transparent'}"></span>`;
  }
  return bars;
}

/** Render a full-wrap cover (back | spine | front). Natural size; scale for fit. */
export function renderCoverHtml(input: CoverInput): string {
  const dims = coverDimensions(input);
  const mode = input.mode ?? 'preview';
  const showGuides = mode === 'preview';

  const W = dims.totalWidthIn * IN;
  const H = dims.totalHeightIn * IN;
  const backPx = dims.backWidthIn * IN;
  const spinePx = dims.spineIn * IN;
  const frontPx = dims.frontWidthIn * IN;
  const wrapPx = dims.wrapIn * IN;
  const safePx = (dims.wrapIn + SAFE_MARGIN_IN) * IN;

  const fg = input.textColor ?? '#ffffff';
  const spineBg = input.spineColor ?? input.dominantColor;
  const showSpineText = input.pageCount >= 100;
  const isbn = input.isbn ?? '978-1-23456-789-0';

  const frontPanel = input.frontImageUrl
    ? `<img src="${esc(input.frontImageUrl)}" alt="Front cover" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:${fg};text-align:center;padding:0 8%;">
        <div><div style="font-size:1.6rem;font-weight:800;">${esc(input.title)}</div>${input.author ? `<div style="margin-top:1rem;">${esc(input.author)}</div>` : ''}</div></div>`;

  // Barcode keep-out (preview only) sits in the back panel's safe area.
  const barcode = showGuides
    ? `<div style="position:absolute;left:${safePx}px;bottom:${safePx}px;width:${2 * IN}px;height:${1.2 * IN}px;background:#fff;border:1px solid #bbb;border-radius:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#222;">
        <div style="height:46px;display:flex;align-items:flex-end;gap:0;">${barcodeBars()}</div>
        <div style="font:600 10px/1.2 monospace;margin-top:4px;">ISBN ${esc(isbn)}</div>
      </div>`
    : '';

  const guides = showGuides
    ? `<div class="guide trim" style="position:absolute;left:${wrapPx}px;top:${wrapPx}px;right:${wrapPx}px;bottom:${wrapPx}px;border:1px dashed rgba(255,80,80,0.9);"></div>
       <div class="guide safe" style="position:absolute;left:${safePx}px;top:${safePx}px;right:${safePx}px;bottom:${safePx}px;border:1px dashed rgba(80,160,255,0.8);"></div>
       <div class="fold" style="position:absolute;top:0;bottom:0;left:${backPx}px;border-left:1px dashed rgba(0,0,0,0.6);"></div>
       <div class="fold" style="position:absolute;top:0;bottom:0;left:${backPx + spinePx}px;border-left:1px dashed rgba(0,0,0,0.6);"></div>
       <div style="position:absolute;top:4px;left:${wrapPx + 6}px;font:600 11px/1 system-ui;color:#c00;background:rgba(255,255,255,0.7);padding:2px 4px;border-radius:3px;">trim</div>
       <div style="position:absolute;top:4px;left:${backPx + 6}px;font:600 11px/1 system-ui;color:#333;background:rgba(255,255,255,0.7);padding:2px 4px;border-radius:3px;">spine ${dims.spineIn.toFixed(3)}in</div>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#fff;}
  .stage{position:relative;width:${W}px;height:${H}px;font-family:system-ui,sans-serif;}
  .wrap{position:absolute;inset:0;display:flex;}
  .panel{height:100%;box-sizing:border-box;}
  .back{width:${backPx}px;background:${esc(input.dominantColor)};color:${fg};padding:${safePx}px;position:relative;}
  .back .blurb{font-size:0.82rem;line-height:1.5;white-space:pre-wrap;max-width:78%;}
  .spine{width:${spinePx}px;background:${esc(spineBg)};color:${fg};display:flex;align-items:center;justify-content:center;}
  .spine .txt{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-weight:600;font-size:0.8rem;}
  .front{width:${frontPx}px;background:${esc(input.dominantColor)};overflow:hidden;}
  </style></head><body>
  <div class="stage">
    <div class="wrap">
      <div class="panel back"><div class="blurb">${esc(input.backText ?? 'Your back-cover description appears here.')}</div>${barcode}</div>
      <div class="panel spine">${showSpineText ? `<div class="txt">${esc(input.title)}${input.author ? ` — ${esc(input.author)}` : ''}</div>` : ''}</div>
      <div class="panel front">${frontPanel}</div>
    </div>
    ${guides}
  </div>
  </body></html>`;
}
