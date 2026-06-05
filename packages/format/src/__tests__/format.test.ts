import { describe, expect, it } from 'vitest';
import { tiptapToHtml } from '../tiptap-html';
import { getTheme, THEMES, DEFAULT_THEME_KEY } from '../themes';
import { renderBookDocument, renderChapter, themeCss } from '../render';

const sampleDoc = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Once upon a time.' }] },
    { type: 'horizontalRule' },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
      ],
    },
  ],
};

describe('tiptapToHtml', () => {
  it('renders paragraphs, marks, and scene breaks', () => {
    const html = tiptapToHtml(sampleDoc);
    expect(html).toContain('<p>Once upon a time.</p>');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('class="scene-break"');
  });
  it('escapes HTML', () => {
    const html = tiptapToHtml({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '<x> & "y"' }] }],
    });
    expect(html).toContain('&lt;x&gt; &amp; &quot;y&quot;');
  });
  it('handles empty/invalid docs', () => {
    expect(tiptapToHtml(null)).toBe('');
    expect(tiptapToHtml({ type: 'doc' })).toBe('');
  });
});

describe('themes', () => {
  it('has genre presets and a working default', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(5);
    expect(getTheme(undefined).key).toBe(DEFAULT_THEME_KEY);
    expect(getTheme('nope').key).toBe(DEFAULT_THEME_KEY);
    expect(getTheme('poetry').genre).toBe('poetry');
  });
  it('marks at least one premium theme', () => {
    expect(THEMES.some((t) => t.premium)).toBe(true);
  });
});

describe('renderChapter / themeCss', () => {
  it('renders chapter title, subtitle, and body', () => {
    const html = renderChapter(getTheme('novel-classic'), {
      index: 1,
      title: 'Chapter 1',
      subtitle: 'The Start',
      content: sampleDoc,
    });
    expect(html).toContain('chapter-title">Chapter 1');
    expect(html).toContain('chapter-subtitle">The Start');
    expect(html).toContain('chapter-body');
  });
  it('emits drop-cap CSS for themes that use it', () => {
    expect(themeCss(getTheme('novel-classic'), 'print')).toContain('::first-letter');
    expect(themeCss(getTheme('selfhelp'), 'print')).not.toContain('::first-letter');
  });
  it('uses page geometry for print and reflow for ebook', () => {
    expect(themeCss(getTheme('selfhelp'), 'print')).toContain('@page');
    expect(themeCss(getTheme('selfhelp'), 'ebook')).toContain('max-width');
  });
});

describe('renderBookDocument', () => {
  const base = {
    theme: getTheme('novel-classic'),
    meta: { title: 'My Book', author: 'A. Writer', publisherName: 'Indie Press' },
    chapters: [{ index: 1, title: 'Chapter 1', content: sampleDoc }],
  };
  it('includes front matter and shows watermark when free', () => {
    const html = renderBookDocument({ ...base, target: 'ebook', watermark: true });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Indie Press');
    expect(html).toContain('Made with Liberscript');
  });
  it('omits watermark for paid', () => {
    const html = renderBookDocument({ ...base, target: 'print', watermark: false });
    expect(html).not.toContain('Made with Liberscript');
  });
});
