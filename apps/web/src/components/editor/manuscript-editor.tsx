'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button, cn } from '@liberscript/ui';

type SaveState = 'idle' | 'saving' | 'saved';

export type TagField = 'title' | 'subtitle' | 'openingQuote' | 'attribution';

interface Props {
  initialContent: JSONContent;
  /** Debounced autosave of the full doc. */
  onSave: (content: JSONContent) => Promise<void>;
  /** Split at the cursor: content before vs. from the current top-level block. */
  onSplit: (before: JSONContent, after: JSONContent) => void;
  /** Lift the current selection out of the body into a structured field. */
  onTagField?: (field: TagField, text: string) => void;
  /** Show the Title/Subtitle/Quote/Attribution tag buttons (chapters only). */
  structureTags?: boolean;
  editable?: boolean;
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'h-8 min-w-8 rounded px-2 text-sm hover:bg-accent',
        active && 'bg-accent font-semibold',
      )}
    >
      {children}
    </button>
  );
}

export function ManuscriptEditor({
  initialContent,
  onSave,
  onSplit,
  onTagField,
  structureTags = false,
  editable = true,
}: Props) {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ProseMirror min-h-[60vh] focus:outline-none px-1 py-2',
      },
    },
    onUpdate: ({ editor }) => {
      setSaveState('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await onSave(editor.getJSON());
        setSaveState('saved');
      }, 1200);
    },
  });

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const liftTo = useCallback(
    (ed: Editor, field: TagField) => {
      const { from, to } = ed.state.selection;
      const text = ed.state.doc.textBetween(from, to, ' ').trim();
      if (!text || !onTagField) return;
      ed.chain().focus().deleteSelection().run();
      onTagField(field, text);
    },
    [onTagField],
  );

  const splitHere = useCallback(
    (ed: Editor) => {
      const json = ed.getJSON();
      const blocks = json.content ?? [];
      const index = ed.state.selection.$from.index(0);
      onSplit(
        { type: 'doc', content: blocks.slice(0, index).length ? blocks.slice(0, index) : [{ type: 'paragraph' }] },
        { type: 'doc', content: blocks.slice(index).length ? blocks.slice(index) : [{ type: 'paragraph' }] },
      );
    },
    [onSplit],
  );

  if (!editor) return null;

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-1 border-b p-1.5">
        {structureTags && onTagField && (
          <>
            <span className="px-1 text-[11px] uppercase tracking-wide text-muted-foreground">Tag&nbsp;selection</span>
            <ToolbarButton onClick={() => liftTo(editor, 'title')}>Title</ToolbarButton>
            <ToolbarButton onClick={() => liftTo(editor, 'subtitle')}>Subtitle</ToolbarButton>
            <ToolbarButton onClick={() => liftTo(editor, 'openingQuote')}>Quote</ToolbarButton>
            <ToolbarButton onClick={() => liftTo(editor, 'attribution')}>Attrib.</ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          </>
        )}
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          B
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • List
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          ❝
        </ToolbarButton>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
          </span>
          <Button variant="outline" size="sm" onClick={() => splitHere(editor)}>
            Split here
          </Button>
        </div>
      </div>
      <div className="px-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
