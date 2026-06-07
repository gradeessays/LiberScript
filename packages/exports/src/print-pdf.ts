import { getTheme, renderBookDocument } from '@liberscript/format';
import type { ChapterKind } from '@liberscript/core';
import type { ExportBook } from './types';

type PagedInput = string | { html?: string; url?: string };
interface PagedPrinter {
  pdf(input: PagedInput, options?: Record<string, unknown>): Promise<Buffer | Uint8Array>;
}
interface PagedCliModule {
  default: new (options?: Record<string, unknown>) => PagedPrinter;
}

/**
 * Build the press-ready interior PDF: render the book's print HTML (real trim
 * size, margins, running headers, folios — the same layout as the paginated
 * preview) and paginate it to a true PDF with paged.js running in headless
 * Chromium.
 *
 * Requires `pagedjs-cli` + a Chromium browser on the worker host. It's imported
 * lazily so EPUB / DOCX / cover exports keep working without it.
 */
export async function buildPrintPdf(book: ExportBook): Promise<Uint8Array> {
  const theme = getTheme(book.themeKey);
  const html = renderBookDocument({
    theme,
    target: 'print',
    paginated: true,
    injectPagedPolyfill: false, // paged.js is run by Chromium, not embedded
    watermark: book.watermark,
    typography: book.typography,
    meta: { title: book.title, author: book.author, publisherName: book.publisher },
    elements: book.elements.map((e) => ({
      kind: e.kind as ChapterKind,
      title: e.title ?? undefined,
      subtitle: e.subtitle ?? undefined,
      data: e.data ?? undefined,
      content: e.content,
    })),
  });

  // Non-literal specifier keeps this optional, Chromium-heavy dep out of the
  // type graph; resolved at runtime on the worker.
  const specifier = 'pagedjs-cli';
  let mod: PagedCliModule;
  try {
    mod = (await import(specifier)) as unknown as PagedCliModule;
  } catch {
    throw new Error(
      'Print-PDF export requires the "pagedjs-cli" package and a Chromium browser on the worker host ' +
        '(run `pnpm approve-builds` for puppeteer, or set PUPPETEER_EXECUTABLE_PATH to a Chromium binary).',
    );
  }

  const Printer = mod.default;
  // --no-sandbox so it runs under root in a container/droplet.
  const printer = new Printer({ browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const pdf = await printer.pdf({ html }, { outlineTags: ['h1'] });
  return new Uint8Array(pdf);
}
