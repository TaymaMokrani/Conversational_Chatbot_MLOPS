import { Kbd } from "@/components/ui/kbd";
import {
  useEditor,
  EditorContent,
  EditorContext,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Editor} from "@tiptap/core";

import { ColorHighlighter } from "./TipTap/Colors";

type TiptapProps = {
  onChange: (value: string) => void;
  onEnter: () => void;
  onPasteImage?: (file:File) => void;
  value?: string;
};

function getTextAndLinks(editor: Editor) {
  const text = editor.getText().trim();
  let links: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "atomicLink" && node.attrs?.href) {
      links.push(node.attrs.href);
    }
  });

  let fullOutputArray: string[] = [];
  if (text.length) fullOutputArray.push(text);
  for (const link of links) {
    if (!text.includes(link)) {
      fullOutputArray.push(link);
    }
  }
  return fullOutputArray.join(" ").trim();
}

const Tiptap = ({ onChange, value = "", onEnter, onPasteImage }: TiptapProps) => {
  const [hasContent, setHasContent] = useState(!!value);

  const handleEnter = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (onEnter) {
          onEnter();
        }
        return true;
      }
      return false;
    },
    [onEnter]
  );

  // Paste handler to call onPasteImage only if an image is in the clipboard
  const handlePaste = useCallback(
    (_view: any, event: ClipboardEvent) => {
      if (!event.clipboardData) return false;
      const items = event.clipboardData.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            if (file && typeof onPasteImage === "function") {
              onPasteImage(file);
              event.preventDefault();
              return true;
            }
          }
        }
      }
      return false;
    },
    [onPasteImage]
  );

  const editor = useEditor({
    extensions: [StarterKit, ColorHighlighter],
    content: value,
    immediatelyRender: false,
    onUpdate({ editor }) {
      const combined = getTextAndLinks(editor);
      setHasContent(combined.length > 0);
      if (typeof onChange === "function") {
        onChange(combined);
      }
    },
    editorProps: {
      handleKeyDown(_view, event) {
        return handleEnter(event);
      },
      handlePaste: handlePaste,
    },
  });

  useEffect(() => {
    if (editor && typeof value === "string" && editor.getHTML() !== value) {
      const currentText = editor.getText().trim();
      if (value !== currentText && value !== editor.getHTML()) {
        if (value.trim() === "") {
          editor.commands.clearContent();
        } else {
          editor.commands.setContent(value);
        }
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      const combined = getTextAndLinks(editor);
      setHasContent(combined.length > 0);

      if (typeof onChange === "function") {
        onChange(combined);
      }
    };

    editor.on("update", handler);
    handler(); // Set initial value

    return () => {
      editor.off("update", handler);
    };
  }, [editor, onChange]);

  const providerValue = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={providerValue}>
      <EditorContent
        className="px-5 py-4 overflow-y-auto max-h-[180px]"
        editor={editor}
      />
      {!hasContent && (
        <p className="absolute top-4 left-5 pointer-events-none">
          <span className="text-neutral-400 mr-1">
            Type your message and press
          </span>
          <Kbd>Enter</Kbd>
          <span className="text-neutral-400 ml-1">to chat</span>
        </p>
      )}
    </EditorContext.Provider>
  );
};

export default Tiptap;
