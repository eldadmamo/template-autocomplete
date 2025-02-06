import React, { useEffect, useRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { autocompletePlugin, customSchema } from "./autocompletePlugin";
import "../styles/editor.css";

export default function ProseMirrorEditor() {
  const editorRef = useRef(null);
  const viewRef = useRef(null);

  useEffect(() => {
    const state = EditorState.create({
      schema: customSchema,
      plugins: [
        autocompletePlugin(),
        keymap(baseKeymap),
      ],
    });

    viewRef.current = new EditorView(editorRef.current, {
      state,
    });

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
      }
    };
  }, []);

  return <div ref={editorRef}></div>;
}