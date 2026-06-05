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
// KDP barcode keep-out area.
const BARCODE_W_IN = 2;
const BARCODE_H_IN = 1.2;

export function spineInches(pageCount: number, paper: PaperType): number {
  return Math.max(0, pageCount) * PAGE_THICKNESS[paper];
}

export interface CoverDimensions {
  totalWidthIn: number;
  totalHeightIn: number;
  spineIn: number;
  wrapIn: number;
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
  /** Solid background color (used when no background image). */
  dominantColor: string;
  /** Optional background/pattern image — fills back, spine, and front margins. */
  backgroundImageUrl?: string;
  spineColor?: string;
  /** Front-cover artwork. Centered within the front panel unless full-bleed. */
  frontImageUrl?: string;
  /** When true, the front art bleeds to the edges instead of being centered. */
  frontFullBleed?: boolean;
  backText?: string;
  textColor?: string;
  /** Spine text. undefined → auto (title — author at 100+ pages); '' → blank. */
  spineText?: string;
  binding?: Binding;
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
  const showGuides = (input.mode ?? 'preview') === 'preview';

  const W = dims.totalWidthIn * IN;
  const H = dims.totalHeightIn * IN;
  const backPx = dims.backWidthIn * IN;
  const spinePx = dims.spineIn * IN;
  const frontPx = dims.frontWidthIn * IN;
  const wrapPx = dims.wrapIn * IN;
  const safePx = (dims.wrapIn + SAFE_MARGIN_IN) * IN;
  const gap = 0.12 * IN; // lift the barcode off the safe line
  const barcodeW = BARCODE_W_IN * IN;
  const barcodeH = BARCODE_H_IN * IN;

  const fg = input.textColor ?? '#ffffff';
  const bg = input.backgroundImageUrl
    ? `center / cover no-repeat url("${esc(input.backgroundImageUrl)}")`
    : esc(input.dominantColor);
  const spineBg = input.spineColor ? esc(input.spineColor) : bg;

  const defaultSpine = input.pageCount >= 100 ? `${input.title}${input.author ? ` — ${input.author}` : ''}` : '';
  const spineText = input.spineText !== undefined ? input.spineText : defaultSpine;

  const frontStyle = input.frontFullBleed
    ? 'width:100%;height:100%;object-fit:cover;display:block;'
    : 'max-width:82%;max-height:88%;object-fit:contain;box-shadow:0 6px 22px rgba(0,0,0,0.35);';
  const frontPanel = input.frontImageUrl
    ? `<img src="${esc(input.frontImageUrl)}" alt="Front cover" style="${frontStyle}" />`
    : `<div style="color:${fg};text-align:center;padding:0 8%;"><div style="font-size:1.6rem;font-weight:800;">${esc(input.title)}</div>${input.author ? `<div style="margin-top:1rem;">${esc(input.author)}</div>` : ''}</div>`;

  // Back blurb is centered within the back panel's safe area; on a mockup it
  // reserves space for the barcode below so they never overlap.
  const blurbBottom = showGuides ? safePx + barcodeH + gap * 2 : safePx;

  // Barcode keep-out: bottom-RIGHT of the back panel (toward the spine), lifted
  // off the safe lines so it touches neither the bottom nor the spine margin.
  const barcode = showGuides
    ? `<div style="position:absolute;right:${safePx + gap}px;bottom:${safePx + gap}px;width:${barcodeW}px;height:${barcodeH}px;background:#fff;border:1px solid #bbb;border-radius:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#222;">
        <div style="height:48px;display:flex;align-items:flex-end;gap:0;">${barcodeBars()}</div>
        <div style="font:600 10px/1.2 monospace;margin-top:4px;">ISBN ${esc(input.isbn ?? '978-1-23456-789-0')}</div>
      </div>`
    : '';

  const guides = showGuides
    ? `<div style="position:absolute;left:${wrapPx}px;top:${wrapPx}px;right:${wrapPx}px;bottom:${wrapPx}px;border:1px dashed rgba(255,70,70,0.9);"></div>
       <div style="position:absolute;left:${safePx}px;top:${safePx}px;right:${safePx}px;bottom:${safePx}px;border:1px dashed rgba(70,150,255,0.85);"></div>
       <div style="position:absolute;top:0;bottom:0;left:${backPx}px;border-left:1px dashed rgba(0,0,0,0.6);"></div>
       <div style="position:absolute;top:0;bottom:0;left:${backPx + spinePx}px;border-left:1px dashed rgba(0,0,0,0.6);"></div>
       <div style="position:absolute;top:4px;left:${wrapPx + 6}px;font:600 11px/1 system-ui;color:#c00;background:rgba(255,255,255,0.75);padding:2px 4px;border-radius:3px;">trim</div>
       <div style="position:absolute;top:4px;left:${backPx + 6}px;font:600 11px/1 system-ui;color:#333;background:rgba(255,255,255,0.75);padding:2px 4px;border-radius:3px;">spine ${dims.spineIn.toFixed(3)}in</div>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#fff;overflow:hidden;}
  .stage{position:relative;width:${W}px;height:${H}px;overflow:hidden;font-family:system-ui,sans-serif;}
  .wrap{position:absolute;inset:0;display:flex;}
  .panel{height:100%;box-sizing:border-box;position:relative;overflow:hidden;}
  .back{width:${backPx}px;background:${bg};color:${fg};}
  .back .blurb{position:absolute;left:${safePx}px;top:${safePx}px;right:${safePx}px;bottom:${blurbBottom}px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;}
  .back .blurb span{font-size:0.82rem;line-height:1.55;white-space:pre-wrap;}
  .spine{width:${spinePx}px;background:${spineBg};color:${fg};display:flex;align-items:center;justify-content:center;}
  .spine .txt{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-weight:600;font-size:0.8rem;}
  .front{width:${frontPx}px;background:${bg};display:flex;align-items:center;justify-content:center;}
  </style></head><body>
  <div class="stage">
    <div class="wrap">
      <div class="panel back"><div class="blurb"><span>${esc(input.backText ?? 'Your back-cover description appears here.')}</span></div>${barcode}</div>
      <div class="panel spine">${spineText ? `<div class="txt">${esc(spineText)}</div>` : ''}</div>
      <div class="panel front">${frontPanel}</div>
    </div>
    ${guides}
  </div>
  </body></html>`;
}
