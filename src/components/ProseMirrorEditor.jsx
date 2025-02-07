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
      attributes: { class: "prose p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" },
    });

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Instruction Container */}
      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xl text-gray-600">
          <strong>Instructions:</strong> 
          Start typing to see autocomplete suggestions. Use the arrow keys {`"#", "@", "<>"`} to navigate through the suggestions and press <kbd>Enter</kbd> to select.    
        </p>
      </div>
      

      {/* Editor Container */}
      <div ref={editorRef}></div>
    </div>
  );
}