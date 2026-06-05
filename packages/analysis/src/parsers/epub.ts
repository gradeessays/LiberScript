import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { htmlToBlocks } from '../blocks';
import { assembleChapters } from '../chapters';
import type { ContentBlock, ParsedChapter } from '../types';

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i + 1);
}

/** Parse an EPUB: collect content from the OPF spine, then assemble chapters. */
export async function parseEpub(buffer: Buffer): Promise<ParsedChapter[]> {
  const zip = await JSZip.loadAsync(buffer);

  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml');
  const container = xml.parse(containerXml);
  const opfPath: string | undefined = asArray(container?.container?.rootfiles?.rootfile)[0]?.[
    '@_full-path'
  ];
  if (!opfPath) throw new Error('Invalid EPUB: no OPF rootfile');

  const opfXml = await zip.file(opfPath)?.async('string');
  if (!opfXml) throw new Error(`Invalid EPUB: missing OPF at ${opfPath}`);
  const opf = xml.parse(opfXml);
  const base = dirname(opfPath);

  const manifest = new Map<string, string>();
  for (const item of asArray(opf?.package?.manifest?.item)) {
    if (item?.['@_id'] && item?.['@_href']) manifest.set(item['@_id'], item['@_href']);
  }

  const blocks: ContentBlock[] = [];
  for (const ref of asArray(opf?.package?.spine?.itemref)) {
    const href = manifest.get(ref?.['@_idref']);
    if (!href) continue;
    const content = await zip.file(`${base}${href}`)?.async('string');
    if (content) blocks.push(...htmlToBlocks(content));
  }

  return assembleChapters(blocks);
}
