# Making variants

"Add a variant" means producing **alternative treatments of the same content**, so
the user can choose. It does not mean another instance of a component.

Read this when the user asks for variants, alternatives, or "a few takes".

---

## Shape

Match the document's existing conventions before inventing one. The common
pattern is a *variants board*: one top-level frame holding, per variant, a label
frame (naming the variant and stating the idea in a sentence) followed by the
variant itself.

```
Pricing Variants (frame)
  Board Title (text)
  Board Subtitle (text)
  Rows (frame, vertical)
    Label A (frame)      → Name (text), Idea (text)
    Variant A — Tiered columns (frame)   → the actual design
    Label B (frame)      → Name (text), Idea (text)
    Variant B — Featured plan first (frame)
    ...
```

Look for an existing board in the document and follow its shape — the naming
(`Label X` / `Variant X — <description>`), the idea sentence, and the frame
nesting all carry meaning.

`examples/04-variants-board.js` builds one.

---

## Rules

- **Three is the useful count.** Two is an A/B, four is noise.
- **Each variant is a different emphasis, not a different skin.** Different
  layout, hierarchy or focus — not a recolour. State which one you would pick and
  why in the idea sentence.
- **Keep the content identical.** Same plans, same prices, same features. Only
  the presentation changes, so the choice is about design rather than scope.
- **Reuse the document's tokens and components** in every variant, so the
  variants stay comparable.
- **The idea sentence states the trade-off**, including who it suits and what it
  costs. "Lowest cognitive load, but it hides the comparison."

---

## The screen-level check

Screenshot each variant **separately**, not just the board. At board scale a
broken layout — a control beside a card instead of above it — still reads as a
plausible thumbnail. Only the full-size render shows the difference.

```bash
./pen.sh app < variants.js | python3 pen-shots.py ./pen-shots
```

Each variant frame gets its own PNG, named after its node id.

---

## Cards with unequal content

Variant cards rarely hold equal copy, so their buttons drift out of line. Give
the row a fixed height, the cards `height:"fill_container"`, and the flexible
middle section `height:"fill_container"` so it absorbs the slack and pushes the
button to the bottom.

```js
row   = Insert(board, {type:"frame", name:"Cards", layout:"horizontal", height:420, gap:24})
card  = Insert(row,   {type:"frame", name:"Card", layout:"vertical", width:"fill_container", height:"fill_container"})
Insert(card, {type:"frame", name:"Body", layout:"vertical", width:"fill_container", height:"fill_container", gap:12})
```

The screenshot is the check: the buttons line up across every card, or they do
not.
