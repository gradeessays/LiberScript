export type PaperType = 'white' | 'cream' | 'color';

/** KDP paper thickness (inches per page), used for spine width. */
const PAGE_THICKNESS: Record<PaperType, number> = {
  white: 0.002252,
  cream: 0.0025,
  color: 0.002347,
};

/** KDP outside bleed for a full-wrap cover. */
export const COVER_BLEED_IN = 0.125;

/** Spine width in inches for a given page count + paper. */
export function spineInches(pageCount: number, paper: PaperType): number {
  return Math.max(0, pageCount) * PAGE_THICKNESS[paper];
}

export interface CoverDimensions {
  /** Full wrap (back + spine + front + bleed). */
  totalWidthIn: number;
  totalHeightIn: number;
  spineIn: number;
}

export function coverDimensions(input: {
  trimWidthIn: number;
  trimHeightIn: number;
  pageCount: number;
  paper: PaperType;
}): CoverDimensions {
  const spineIn = spineInches(input.pageCount, input.paper);
  return {
    spineIn,
    totalWidthIn: input.trimWidthIn * 2 + spineIn + COVER_BLEED_IN * 2,
    totalHeightIn: input.trimHeightIn + COVER_BLEED_IN * 2,
  };
}

export interface CoverInput {
  title: string;
  author?: string;
  trimWidthIn: number;
  trimHeightIn: number;
  pageCount: number;
  paper: PaperType;
  /** Dominant color (hex) used for back + spine. */
  dominantColor: string;
  /** Optional explicit spine color (defaults to dominant). */
  spineColor?: string;
  /** Resolved URL of the uploaded front-cover image. */
  frontImageUrl?: string;
  backText?: string;
  /** Readable foreground color computed for the back panel. */
  textColor?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Render a full-wrap paperback cover (back | spine | front) for preview/export. */
export function renderCoverHtml(input: CoverInput): string {
  const dims = coverDimensions(input);
  const IN = 96; // CSS px per inch
  const back = (input.trimWidthIn + COVER_BLEED_IN) * IN;
  const spine = dims.spineIn * IN;
  const front = (input.trimWidthIn + COVER_BLEED_IN) * IN;
  const height = dims.totalHeightIn * IN;
  const fg = input.textColor ?? '#ffffff';
  const spineBg = input.spineColor ?? input.dominantColor;
  const showSpineText = input.pageCount >= 100;

  const frontPanel = input.frontImageUrl
    ? `<img src="${esc(input.frontImageUrl)}" alt="Front cover" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:${fg};text-align:center;padding:0 8%;">
        <div><div style="font-size:1.6rem;font-weight:800;">${esc(input.title)}</div>${
          input.author ? `<div style="margin-top:1rem;">${esc(input.author)}</div>` : ''
        }</div></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:24px;background:#e9e9ee;}
  .wrap{display:flex;width:${dims.totalWidthIn * IN}px;height:${height}px;margin:0 auto;box-shadow:0 4px 24px rgba(0,0,0,0.2);font-family:system-ui,sans-serif;}
  .panel{height:100%;box-sizing:border-box;}
  .back{width:${back}px;background:${esc(input.dominantColor)};color:${fg};padding:${COVER_BLEED_IN * IN}px;display:flex;flex-direction:column;}
  .back .blurb{flex:1;font-size:0.82rem;line-height:1.5;white-space:pre-wrap;}
  .back .barcode{align-self:flex-end;width:2in;height:1.2in;background:#fff;border:1px solid #999;display:flex;align-items:center;justify-content:center;color:#666;font-size:0.7rem;}
  .spine{width:${spine}px;background:${esc(spineBg)};color:${fg};display:flex;align-items:center;justify-content:center;}
  .spine .txt{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-weight:600;font-size:0.8rem;}
  .front{width:${front}px;background:${esc(input.dominantColor)};overflow:hidden;}
  </style></head><body>
  <div class="wrap">
    <div class="panel back">
      <div class="blurb">${esc(input.backText ?? 'Your back-cover description appears here.')}</div>
      <div class="barcode">ISBN / barcode</div>
    </div>
    <div class="panel spine">${showSpineText ? `<div class="txt">${esc(input.title)}${input.author ? ` — ${esc(input.author)}` : ''}</div>` : ''}</div>
    <div class="panel front">${frontPanel}</div>
  </div>
  </body></html>`;
}
