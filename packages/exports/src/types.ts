import type { PaperType, Binding } from '@liberscript/format';
import type { TypographyOverrides } from '@liberscript/core';

export interface ExportElement {
  kind: string;
  title?: string | null;
  subtitle?: string | null;
  data?: Record<string, unknown> | null;
  content?: unknown;
}

/** Everything a manuscript exporter (EPUB/DOCX) needs. */
export interface ExportBook {
  title: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  language: string;
  themeKey: string;
  /** Per-book design overrides (trim size, fonts, spacing, headers…). */
  typography?: TypographyOverrides;
  elements: ExportElement[];
  /** Free tier → include the Liberscript attribution. */
  watermark: boolean;
}

/** Everything the cover-PDF exporter needs (clean, press-ready). */
export interface ExportCover {
  title: string;
  author?: string;
  trimWidthIn: number;
  trimHeightIn: number;
  pageCount: number;
  paper: PaperType;
  binding: Binding;
  dominantColor: string;
  spineColor?: string;
  textColor?: string;
  backText?: string;
  spineText?: string;
  frontFullBleed?: boolean;
  /** Manual front-image zoom (1 = fit) and pan position (0–100%, 50 = centered). */
  frontScale?: number;
  frontPosX?: number;
  frontPosY?: number;
  /** Raw image bytes (resolved by the worker from storage). */
  frontImage?: Uint8Array;
  frontImageType?: 'png' | 'jpg';
  backgroundImage?: Uint8Array;
  backgroundImageType?: 'png' | 'jpg';
}
