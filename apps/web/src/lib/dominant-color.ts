function toHex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export interface DominantColor {
  color: string;
  /** Readable foreground (#111 or #fff) for text over `color`. */
  textColor: string;
}

/**
 * Extract the dominant color of an image via a quantized histogram (most common
 * color bucket), plus a readable text color. Runs entirely in the browser.
 */
export async function extractDominantColor(file: File): Promise<DominantColor> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { color: '#334155', textColor: '#ffffff' };
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] ?? 255;
      if (a < 200) continue; // ignore transparent pixels
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(key, bucket);
    }

    let best = { count: 0, r: 51, g: 65, b: 85 };
    for (const b of buckets.values()) if (b.count > best.count) best = b;
    const r = Math.round(best.r / best.count);
    const g = Math.round(best.g / best.count);
    const b = Math.round(best.b / best.count);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return { color: `#${toHex(r)}${toHex(g)}${toHex(b)}`, textColor: lum > 140 ? '#111111' : '#ffffff' };
  } finally {
    URL.revokeObjectURL(url);
  }
}
