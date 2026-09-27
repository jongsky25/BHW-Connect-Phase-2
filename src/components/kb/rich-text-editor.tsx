"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

type Props = {
  content: object;
  onChange: (json: JSONContent) => void;
  ariaLabel: string;
  /** RFT C3: an archived article's form is read-only. A native `<fieldset
   * disabled>` doesn't reach a contenteditable editor, so this is passed
   * through explicitly instead. */
  editable?: boolean;
};

function isEmptyDoc(content: object): boolean {
  return !("type" in content);
}

export function RichTextEditor({ content, onChange, ariaLabel, editable = true }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: isEmptyDoc(content) ? "" : (content as JSONContent),
    immediatelyRender: false,
    editable,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class:
          "min-h-[160px] rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30",
      },
    },
  });

  // useEditor's `editable` option is only read at creation; setEditable()
  // is what actually reacts to it changing later.
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return <EditorContent editor={editor} />;
}
