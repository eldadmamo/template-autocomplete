import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Schema, Fragment, Slice } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";

export const customSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    hashtag: {
      inline: true,
      group: "inline",
      atom: true,
      attrs: { value: { default: "" } },
      toDOM: (node) => ["span", { class: "autocompleted hashtag" }, node.attrs.value],
      parseDOM: [{ tag: "span.hashtag", getAttrs: (dom) => ({ value: dom.textContent }) }],
    },
    mention: {
      inline: true,
      group: "inline",
      atom: true,
      attrs: { value: { default: "" } },
      toDOM: (node) => ["span", { class: "autocompleted mention" }, node.attrs.value],
      parseDOM: [{ tag: "span.mention", getAttrs: (dom) => ({ value: dom.textContent }) }],
    },
    relation: {
      inline: true,
      group: "inline",
      atom: true,
      attrs: { value: { default: "" } },
      toDOM: (node) => ["span", { class: "autocompleted relation" }, node.attrs.value],
      parseDOM: [{ tag: "span.relation", getAttrs: (dom) => ({ value: dom.textContent }) }],
    },
    paragraph: {
      content: "inline*",
      group: "block",
      toDOM: () => ["p", 0],
      parseDOM: [{ tag: "p" }],
    },
  },
});

const fakeData = {
  hashtags: ["react", "javascript", "prosemirror", "coding"],
  people: ["alice", "bob", "charlie", "dave"],
  relations: ["idea1", "idea2", "idea3"],
};

function getAutocompleteState(doc, pos) {
  const textBefore = doc.textBetween(0, pos, " ", " ");
  console.log("Text Before:", textBefore, "Position:", pos); // Log the extracted text

  const triggers = [
    { trigger: "#", type: "hashtags" },
    { trigger: "@", type: "people" },
    { trigger: "<>", type: "relations" },
  ];

  let lastTrigger = null;
  for (const { trigger, type } of triggers) {
    const triggerIndex = textBefore.lastIndexOf(trigger);
    if (
      triggerIndex !== -1 &&
      (!lastTrigger || triggerIndex > lastTrigger.index)
    ) {
      lastTrigger = { trigger, type, index: triggerIndex };
    }
  }

  if (lastTrigger) {
    const { trigger, type, index } = lastTrigger;
    const matchString = textBefore.slice(index + trigger.length, pos);
    console.log("Trigger Detected:", trigger, "Type:", type, "Match String:", matchString);
    return { trigger, type, matchString, from: index, to: pos };
  }

  console.log("No Autocomplete Triggered");
  return null;
}

export function autocompletePlugin() {
  let activeIndex = 0;

  return new Plugin({
    state: {
      init() {
        return { active: false, type: null, matchString: "", decorations: DecorationSet.empty };
      },
      apply(tr, prevState) {
        const selection = tr.selection;
        const state = getAutocompleteState(tr.doc, selection.from);

        if (state) {
          const { type, matchString, from, to } = state;
          const suggestions = fakeData[type].filter(item =>
            item.toLowerCase().startsWith(matchString.toLowerCase())
          );

          if (suggestions.length > 0) {
            const decorations = suggestions.map((suggestion, index) =>
              Decoration.widget(to, () => {
                const div = document.createElement("div");
                div.className = `suggestion${index === activeIndex ? " active" : ""}`;
                div.textContent = suggestion;
                return div;
              })
            );

            return {
              active: true,
              type,
              matchString,
              from,
              to,
              decorations: DecorationSet.create(tr.doc, decorations),
            };
          }
        }

        return { active: false, type: null, matchString: "", decorations: DecorationSet.empty };
      },
    },
    props: {
      decorations(state) {
        return this.getState(state).decorations;
      },
      handleKeyDown(view, event) {
        const pluginState = this.getState(view.state);
        if (!pluginState.active) return false;

        const suggestions = fakeData[pluginState.type].filter(item =>
          item.toLowerCase().startsWith(pluginState.matchString.toLowerCase())
        );

        if (event.key === "ArrowDown") {
          activeIndex = (activeIndex + 1) % suggestions.length;
          view.dispatch(view.state.tr);
          return true;
        }

        if (event.key === "ArrowUp") {
          activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
          view.dispatch(view.state.tr);
          return true;
        }

        if (event.key === "Enter" || event.key === "Tab" || (pluginState.type === "hashtags" && event.key === " ")) {
          event.preventDefault();
          const suggestion = suggestions[activeIndex] || pluginState.matchString;
          if (suggestion) {
            let nodeType;
            switch (pluginState.type) {
              case "hashtags":
                nodeType = customSchema.nodes.hashtag;
                break;
              case "people":
                nodeType = customSchema.nodes.mention;
                break;
              case "relations":
                nodeType = customSchema.nodes.relation;
                break;
            }

            const node = nodeType.create({ value: suggestion });
            
            // Create space nodes and fragment
            const spaceBefore = customSchema.text(' ');
            const spaceAfter = customSchema.text(' ');
            const fragment = Fragment.fromArray([spaceBefore, node, spaceAfter]);
            const slice = new Slice(fragment, 0, 0);

            // Replace range with spaces and node
            let tr = view.state.tr.replaceRange(
              pluginState.from,
              pluginState.to,
              slice
            );

            // Set selection after the inserted content
            const insertPos = pluginState.from + fragment.size;
            tr = tr.setSelection(TextSelection.create(tr.doc, insertPos));

            view.dispatch(tr);
            activeIndex = 0;

            // Re-evaluate autocomplete state
            setTimeout(() => {
              view.dispatch(view.state.tr.setMeta("autocomplete", null)); // Reset autocomplete state
            }, 0);            

            return true;
          }
        }

        return false;
      },
    },
  });
}