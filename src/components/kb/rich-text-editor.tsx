"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = {
  content: object;
  onChange: (json: JSONContent) => void;
  ariaLabel: string;
};

function isEmptyDoc(content: object): boolean {
  return !("type" in content);
}

export function RichTextEditor({ content, onChange, ariaLabel }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: isEmptyDoc(content) ? "" : (content as JSONContent),
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class:
          "min-h-[160px] rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30",
      },
    },
  });

  return <EditorContent editor={editor} />;
}
