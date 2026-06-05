import { SourceFormat } from './constants';

/** File extensions accepted for manuscript upload, mapped to source format. */
export const EXT_TO_SOURCE_FORMAT: Record<string, SourceFormat> = {
  docx: SourceFormat.DOCX,
  epub: SourceFormat.EPUB,
  md: SourceFormat.MARKDOWN,
  markdown: SourceFormat.MARKDOWN,
  txt: SourceFormat.TXT,
  text: SourceFormat.TXT,
  pdf: SourceFormat.PDF,
};

/** Extensions accepted for upload (for the file picker `accept` attribute). */
export const SUPPORTED_UPLOAD_EXTENSIONS = ['docx', 'epub', 'pdf', 'md', 'markdown', 'txt'];

/** Infer the manuscript source format from a file name, if supported. */
export function detectFormat(fileName: string): SourceFormat | undefined {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_SOURCE_FORMAT[ext];
}
