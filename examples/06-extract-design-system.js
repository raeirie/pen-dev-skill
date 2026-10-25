// 06 — Extract a design system from a finished page.
//
// Run this when the user asks for tokens, components, sections or a
// design-system board. It prints everything the normalisation needs: tokens,
// themes, components, sections, a node census, and every literal hex used where
// a token belongs.
//
//   ./pen.sh multi /tmp/audit.pen --in source.pen < examples/06-extract-design-system.js
//
// Then read docs/design-system-extraction.md.

Print("=== TOKENS ===")
const vars = GetVariables()
const names = Object.keys(vars.variables || {})
Print("count:", names.length)
Print(names.join(", "))

Print("=== THEMES ===")
Print(JSON.stringify(vars.themes))

Print("=== COMPONENTS (reusable) ===")
Get(n => n.reusable && Print("COMP", n.id, n.name, n.type))

Print("=== SECTIONS (top-level frames) ===")
Get((n, c) => {
  c.skipChildren()
  Print("SECTION", n.id, n.name, c.bounds.width + "x" + c.bounds.height)
})

Print("=== NODE CENSUS ===")
const census = {}
Get(n => { census[n.type] = (census[n.type] || 0) + 1 })
Print(JSON.stringify(census))

// A literal hex where a token belongs is the most common real defect and the
// easiest to prove. Scan each node's own properties; the visitor handles
// children, so skipping `children` here avoids counting a value twice.
Print("=== LITERAL HEX VALUES ===")
const hexes = {}
Get(n => {
  for (const [k, v] of Object.entries(n)) {
    if (k === "children") continue
    if (typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v)) {
      hexes[v] = (hexes[v] || 0) + 1
    } else if (v && typeof v === "object") {
      for (const iv of Object.values(v)) {
        if (typeof iv === "string" && /^#[0-9a-fA-F]{3,8}$/.test(iv)) {
          hexes[iv] = (hexes[iv] || 0) + 1
        }
      }
    }
  }
})
const hexList = Object.entries(hexes).sort((a, b) => b[1] - a[1])
Print("distinct:", hexList.length)
for (const [hex, count] of hexList) Print("HEX", hex, "x" + count)

Print("=== SAMPLE THEMED TOKEN ===")
const sample = names.find(n => /sem-color/.test(n))
if (sample) Print(sample, JSON.stringify(vars.variables[sample]))
