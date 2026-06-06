import {
  clip,
  closePath,
  degrees,
  endPath,
  lineTo,
  moveTo,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFImage,
} from 'pdf-lib';
import { coverDimensions } from '@liberscript/format';
import type { ExportCover } from './types';

const PT = 72; // points per inch
const SAFE_IN = 0.25;

function hexRgb(hex: string | undefined, fallback: [number, number, number]) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return rgb(fallback[0], fallback[1], fallback[2]);
  const n = parseInt(m[1]!, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function embed(
  doc: PDFDocument,
  bytes: Uint8Array | undefined,
  type: 'png' | 'jpg' | undefined,
): Promise<PDFImage | null> {
  if (!bytes) return null;
  try {
    return type === 'jpg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
  } catch {
    try {
      return await doc.embedJpg(bytes);
    } catch {
      return null;
    }
  }
}

/** Word-wrap text to a max width for a given font/size. */
function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Build a clean, press-ready full-wrap cover PDF at exact KDP dimensions. */
export async function buildCoverPdf(cover: ExportCover): Promise<Uint8Array> {
  const dims = coverDimensions({
    trimWidthIn: cover.trimWidthIn,
    trimHeightIn: cover.trimHeightIn,
    pageCount: cover.pageCount,
    paper: cover.paper,
    binding: cover.binding,
  });

  const W = dims.totalWidthIn * PT;
  const H = dims.totalHeightIn * PT;
  const backW = dims.backWidthIn * PT;
  const spineW = dims.spineIn * PT;
  const frontW = dims.frontWidthIn * PT;
  const safe = (dims.wrapIn + SAFE_IN) * PT;

  const doc = await PDFDocument.create();
  const page = doc.addPage([W, H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fg = hexRgb(cover.textColor, [1, 1, 1]);

  const bgImg = await embed(doc, cover.backgroundImage, cover.backgroundImageType);
  if (bgImg) {
    page.drawImage(bgImg, { x: 0, y: 0, width: W, height: H });
  } else {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: hexRgb(cover.dominantColor, [0.2, 0.25, 0.33]) });
  }
  // Spine color override.
  if (cover.spineColor) {
    page.drawRectangle({ x: backW, y: 0, width: spineW, height: H, color: hexRgb(cover.spineColor, [0.2, 0.25, 0.33]) });
  }

  // Front artwork fills the front panel (default) or is centered.
  const frontImg = await embed(doc, cover.frontImage, cover.frontImageType);
  const frontX = backW + spineW;
  const fScale = cover.frontScale ?? 1;
  const fX = cover.frontPosX ?? 50;
  const fY = cover.frontPosY ?? 50;
  if (frontImg) {
    // Clip to the front panel so zoom/pan never spills onto the spine.
    page.pushOperators(
      pushGraphicsState(),
      moveTo(frontX, 0),
      lineTo(frontX + frontW, 0),
      lineTo(frontX + frontW, H),
      lineTo(frontX, H),
      closePath(),
      clip(),
      endPath(),
    );
    if (cover.frontFullBleed === false) {
      const base = Math.min((frontW * 0.82) / frontImg.width, (H * 0.88) / frontImg.height);
      const s = base * fScale;
      const w = frontImg.width * s;
      const h = frontImg.height * s;
      page.drawImage(frontImg, { x: frontX + (frontW - w) / 2, y: (H - h) / 2, width: w, height: h });
    } else {
      const base = Math.max(frontW / frontImg.width, H / frontImg.height);
      const s = base * fScale;
      const w = frontImg.width * s;
      const h = frontImg.height * s;
      page.drawImage(frontImg, {
        x: frontX + (frontW - w) * (fX / 100),
        y: (H - h) * (1 - fY / 100),
        width: w,
        height: h,
      });
    }
    page.pushOperators(popGraphicsState());
  } else {
    // No front image: title + author centered on the front.
    const t = cover.title;
    const tSize = 24;
    page.drawText(t, {
      x: frontX + (frontW - font.widthOfTextAtSize(t, tSize)) / 2,
      y: H / 2,
      size: tSize,
      font: fontBold,
      color: fg,
    });
    if (cover.author) {
      page.drawText(cover.author, {
        x: frontX + (frontW - font.widthOfTextAtSize(cover.author, 14)) / 2,
        y: H / 2 - 28,
        size: 14,
        font,
        color: fg,
      });
    }
  }

  // Spine text (rotated), only if non-empty.
  const defaultSpine = cover.pageCount >= 100 ? `${cover.title}${cover.author ? ` — ${cover.author}` : ''}` : '';
  const spineText = cover.spineText !== undefined ? cover.spineText : defaultSpine;
  if (spineText && spineW > 8) {
    const size = Math.min(11, spineW * 0.5);
    page.drawText(spineText, {
      x: backW + spineW / 2 + size / 2,
      y: H / 2 - font.widthOfTextAtSize(spineText, size) / 2,
      size,
      font,
      color: fg,
      rotate: degrees(90),
    });
  }

  // Back blurb: top-left within the safe area.
  if (cover.backText) {
    const size = 10;
    const maxWidth = backW - safe * 2;
    const lines = wrap(font, cover.backText, size, maxWidth);
    let y = H - safe - size;
    for (const line of lines) {
      if (y < safe) break;
      page.drawText(line, { x: safe, y, size, font, color: fg, lineHeight: size * 1.4 });
      y -= size * 1.5;
    }
  }

  return doc.save();
}
