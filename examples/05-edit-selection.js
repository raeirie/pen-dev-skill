// 05 — Edit whatever the user has selected in Pen.app.
//
// The canvas selection is the pointer to a frame: it carries node ids, so the
// agent acts on exactly what was picked instead of guessing from a name.
//
// Usage:
//   1. Select layers in Pen.app
//   2. ./pen.sh app < examples/05-edit-selection.js
//
// The driver resolves the selection for you first:
//
//   ./pen.sh seltree      # the selected subtree, readable
//   ./pen.sh sel          # just the app state
//
// This example shows the low-level equivalent: read the selection from
// get_app_state(), then act on it.

const state = get_app_state()
Print("=== APP STATE ===")
Print(state)

// --- Finding the selected node ids programmatically. ---
// get_app_state() reports:  "- Selected nodes: `abc123` (frame): Hero"
// Parse them out of the state text.
const ids = []
for (const m of String(state).matchAll(/`([A-Za-z0-9]+)`\s*\(([^)]+)\):\s*([^,\n]+)/g)) {
  ids.push({id: m[1], type: m[2], name: m[3].trim()})
}
Print("=== SELECTED ===")
for (const n of ids) Print(n.id, n.type, n.name)

if (ids.length === 0) {
  Print("Nothing selected — ask the user to select a layer in Pen.app.")
} else {
  // --- Read the selection's structure before changing anything. ---
  for (const sel of ids) {
    Print("=== SUBTREE:", sel.name, "===")
    Get(sel.id, (n, c) => Print(
      "  ".repeat(c.depth), n.id, "|", n.name, "|", n.type,
      "| w=" + n.width, "h=" + n.height,
      n.content ? ('| text="' + String(n.content).slice(0, 60) + '"') : ""
    ))
  }

  // --- Act on the selection. Replace with the real edit. ---
  // const target = ids[0].id
  // Update(target, {fill: "$accent"})
  // TakeScreenshot([target])
}
