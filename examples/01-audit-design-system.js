// 01 — Audit a file for an existing design system.
//
// Run this BEFORE designing anything. If the file already carries tokens or
// components, they are the palette and the component library for the work.
//
//   ./pen.sh app < examples/01-audit-design-system.js
//   ./pen.sh multi scratch.pen < examples/01-audit-design-system.js

const vars = GetVariables()
const names = Object.keys(vars.variables || {})

Print("=== TOKENS:", names.length, "===")
Print(names.join(", "))

Print("=== THEMES ===")
Print(JSON.stringify(vars.themes))

Print("=== COMPONENTS ===")
Get(n => n.reusable && Print("COMP", n.id, n.name))

Print("=== TOP-LEVEL FRAMES ===")
Get((n, c) => { c.skipChildren(); Print("FRAME", n.id, n.name) })

// Reading a themed token's value — an array of {value, theme} entries.
const brand = vars.variables["ci-sem-color-brand"]
if (brand) {
  Print("=== SAMPLE THEMED TOKEN: ci-sem-color-brand ===")
  Print(JSON.stringify(brand))
}
