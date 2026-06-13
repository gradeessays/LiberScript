import sharp from '../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js';
import { writeFileSync } from 'node:fs';

const PRIMARY = '#7A2E3A'; // --primary in light mode (350 45% 33%)
const WING = '#C9707D'; // icon.svg's lighter wing tone
const PARCHMENT = '#FAF1E1'; // --background in light mode (40 38% 95%)

// --- Logo mark (matches components/logo.tsx's <Mark>, colors resolved, transparent bg) ---
const markSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  <path d="M16 7c-4-2-9-2-12-1v18c3-1 8-1 12 1V7Z" fill="${PRIMARY}"/>
  <path d="M16 7c4-2 9-2 12-1v18c-3-1-8-1-12 1V7Z" fill="${PRIMARY}" opacity="0.55"/>
  <path d="M16 7v18" stroke="${PRIMARY}" stroke-width="1" stroke-linecap="round"/>
</svg>`;

// --- Wordmark (mark + "LiberScript", Georgia as a local stand-in for the Fraunces display font) ---
const wordmarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="200">
  <g transform="translate(10, 36)">
    <path d="M16 7c-4-2-9-2-12-1v18c3-1 8-1 12 1V7Z" fill="${PRIMARY}" transform="scale(4)"/>
    <path d="M16 7c4-2 9-2 12-1v18c-3-1-8-1-12 1V7Z" fill="${PRIMARY}" opacity="0.55" transform="scale(4)"/>
    <path d="M16 7v18" stroke="${PRIMARY}" stroke-width="1" stroke-linecap="round" transform="scale(4)"/>
  </g>
  <text x="170" y="118" font-family="Georgia, 'Times New Roman', serif" font-weight="600" font-size="72" letter-spacing="-1" fill="${PRIMARY}">LiberScript</text>
</svg>`;

// --- Favicon (matches app/icon.svg exactly) ---
const faviconSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  <rect width="32" height="32" rx="6" fill="${PARCHMENT}"/>
  <path d="M16 8c-4-2-9-2-12-1v17c3-1 8-1 12 1V8Z" fill="${PRIMARY}"/>
  <path d="M16 8c4-2 9-2 12-1v17c-3-1-8-1-12 1V8Z" fill="${WING}"/>
  <path d="M16 8v17" stroke="${PARCHMENT}" stroke-width="0.75"/>
</svg>`;

async function run() {
  // Logo mark, transparent
  for (const size of [512, 1024]) {
    await sharp(Buffer.from(markSvg(size))).png().toFile(`logo-mark-${size}.png`);
  }

  // Wordmark, transparent, trimmed to content with a small uniform margin
  await sharp(Buffer.from(wordmarkSvg))
    .png()
    .trim()
    .extend({ top: 20, bottom: 20, left: 20, right: 20, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile('logo-wordmark.png');

  // Favicon PNGs
  const faviconSizes = [16, 32, 48, 180, 192, 512];
  for (const size of faviconSizes) {
    await sharp(Buffer.from(faviconSvg(size))).png().toFile(`favicon-${size}.png`);
  }

  // Pack 16/32/48 into a multi-resolution .ico
  const icoSizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    icoSizes.map((size) => sharp(Buffer.from(faviconSvg(size))).png().toBuffer()),
  );

  const headerSize = 6 + 16 * icoSizes.length;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(icoSizes.length, 4); // image count

  icoSizes.forEach((size, i) => {
    const entryOffset = 6 + i * 16;
    const png = pngBuffers[i];
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 0); // width
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1); // height
    header.writeUInt8(0, entryOffset + 2); // color count
    header.writeUInt8(0, entryOffset + 3); // reserved
    header.writeUInt16LE(1, entryOffset + 4); // planes
    header.writeUInt16LE(32, entryOffset + 6); // bit count
    header.writeUInt32LE(png.length, entryOffset + 8); // size
    header.writeUInt32LE(offset, entryOffset + 12); // offset
    offset += png.length;
  });

  writeFileSync('favicon.ico', Buffer.concat([header, ...pngBuffers]));

  console.log('Done.');
}

run();
