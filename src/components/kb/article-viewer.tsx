"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = {
  content: object;
};

function isEmptyDoc(content: object): boolean {
  return !("type" in content);
}

export function ArticleViewer({ content }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: isEmptyDoc(content) ? "" : (content as JSONContent),
    editable: false,
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} className="text-ink [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" />;
}
