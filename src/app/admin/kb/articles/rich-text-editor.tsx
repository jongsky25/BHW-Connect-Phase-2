"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

export function RichTextEditor({ onChange }: { onChange: (json: JSONContent) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor) {
      onChange(editor.getJSON());
    }
    // Only seed the hidden field once, when the editor instance mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className="min-h-24 rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink [&_.tiptap]:outline-none">
      <EditorContent editor={editor} />
    </div>
  );
}
