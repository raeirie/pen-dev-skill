// 04 — Build a variants board.
//
// "Add a variant" means producing real alternatives of the same content —
// different emphasis, not a recolour. Three is the useful count.
//
// The shape below (Label X + Idea, then Variant X — <description>) follows the
// convention used by pen's own design-system boards.
//
//   ./pen.sh multi scratch.pen < examples/04-variants-board.js

SetVariables({
  "bg":     {type:"color", value:"#FAFAF7"},
  "ink":    {type:"color", value:"#141414"},
  "muted":  {type:"color", value:"#6B6B76"},
  "accent": {type:"color", value:"#582CFF"},
  "line":   {type:"color", value:"#E4E4E8"}
})

const pos = FindEmptySpace({width:1440, height:1600, padding:80})
board = Insert(document, {
  type:"frame", name:"Variants", x:pos.x, y:pos.y,
  width:1440, layout:"vertical", gap:32, padding:40,
  fill:"$bg", placeholder:true
})
Insert(board, {type:"text", name:"Board Title", content:"Pricing — layout variants", fontFamily:"Inter", fontSize:26, fontWeight:"bold", fill:"$ink"})
Insert(board, {type:"text", name:"Board Subtitle", content:"Three ways to present the same three plans. Only the emphasis changes.", textGrowth:"fixed-width", width:1000, fontFamily:"Inter", fontSize:15, lineHeight:1.5, fill:"$muted"})

rows = Insert(board, {type:"frame", name:"Rows", width:"fill_container", layout:"vertical", gap:24})

// --- Each variant: a label (name + the idea, including the trade-off) ...
const VARIANTS = [
  {
    tag: "A",
    name: "Variant A — Tiered columns",
    idea: "Every plan reads side by side, so the reader compares without scrolling. The safe default for a first-time visitor who needs the whole picture at once.",
    build: (p) => {
      const cols = Insert(p, {type:"frame", name:"Columns", width:"fill_container", layout:"horizontal", gap:16, height:360})
      const PLANS = [
        ["Starter", "$0", ["3 projects", "Design-to-code export"], false],
        ["Studio",  "$24", ["Unlimited projects", "Shared libraries", "Priority support"], true],
        ["Enterprise", "Custom", ["SSO and SCIM", "Private registry", "Design engineer"], false]
      ]
      for (const [name, price, feats, featured] of PLANS) {
        const card = Insert(cols, {
          type:"frame", name:"Plan "+name, width:"fill_container", height:"fill_container",
          layout:"vertical", gap:12, padding:24, cornerRadius:8,
          fill: featured ? "$accent" : "#FFFFFF",
          stroke: featured ? "$accent" : "$line", strokeWidth:1
        })
        Insert(card, {type:"text", name:"Name", content:name, fontFamily:"Inter", fontSize:17, fontWeight:"600", fill: featured ? "#FFFFFF" : "$ink"})
        Insert(card, {type:"text", name:"Price", content:price, fontFamily:"Inter", fontSize:36, fontWeight:"bold", fill: featured ? "#FFFFFF" : "$accent"})
        const list = Insert(card, {type:"frame", name:"Feats", layout:"vertical", gap:8, height:"fill_container"})
        for (const f of feats) {
          const row = Insert(list, {type:"frame", name:"Feat", layout:"horizontal", alignItems:"center", gap:8})
          Insert(row, {type:"icon", name:"Check", library:"lucide", icon:"check", width:16, height:16, fill: featured ? "#FFFFFF" : "$accent"})
          Insert(row, {type:"text", name:"FeatText", content:f, fontFamily:"Inter", fontSize:14, fill: featured ? "#E6E0FF" : "$muted"})
        }
        // justifyContent:"end" pushes the button to the bottom of the card.
        const btnWrap = Insert(card, {type:"frame", name:"BtnWrap", width:"fill_container", justifyContent:"end"})
        Insert(btnWrap, {type:"frame", name:"CTA", layout:"horizontal", alignItems:"center", padding:[10,24], cornerRadius:4, fill: featured ? "#FFFFFF" : "transparent", stroke: featured ? "#FFFFFF" : "$accent", strokeWidth:1})
        Insert(btnWrap+"/CTA", {type:"text", name:"Label", content:"Choose "+name, fontFamily:"Inter", fontSize:14, fontWeight:"600", fill: featured ? "$accent" : "$accent"})
      }
    }
  },
  {
    tag: "B",
    name: "Variant B — Featured plan first",
    idea: "Studio is pulled forward and given the full width, with the others reduced to compact strips. Leads with the recommendation instead of making the reader compare three equal columns.",
    build: (p) => {
      const hero = Insert(p, {type:"frame", name:"Featured", width:"fill_container", layout:"horizontal", gap:24, padding:24, cornerRadius:8, fill:"$accent"})
      const copy = Insert(hero, {type:"frame", name:"Copy", width:"fill_container", layout:"vertical", gap:8})
      Insert(copy, {type:"text", name:"Badge", content:"MOST POPULAR", fontFamily:"Inter", fontSize:11, letterSpacing:1.6, fill:"#D8CCFF"})
      Insert(copy, {type:"text", name:"Name", content:"Studio", fontFamily:"Inter", fontSize:22, fontWeight:"bold", fill:"#FFFFFF"})
      Insert(copy, {type:"text", name:"Price", content:"$24 per editor / month", fontFamily:"Inter", fontSize:32, fontWeight:"bold", fill:"#FFFFFF"})
      const feats = Insert(copy, {type:"frame", name:"Feats", layout:"horizontal", alignItems:"center", gap:20})
      for (const f of ["Unlimited projects", "Shared libraries", "Priority support"]) {
        const row = Insert(feats, {type:"frame", name:"Feat", layout:"horizontal", alignItems:"center", gap:6})
        Insert(row, {type:"icon", name:"Check", library:"lucide", icon:"check", width:16, height:16, fill:"#FFFFFF"})
        Insert(row, {type:"text", name:"FeatText", content:f, fontFamily:"Inter", fontSize:14, fill:"#E6E0FF"})
      }
      const cta = Insert(hero, {type:"frame", name:"CTA", layout:"vertical", justifyContent:"center"})
      Insert(cta, {type:"frame", name:"Button", layout:"horizontal", alignItems:"center", padding:[12,28], cornerRadius:4, fill:"#FFFFFF"})
      Insert(cta+"/Button", {type:"text", name:"Label", content:"Start with Studio", fontFamily:"Inter", fontSize:14, fontWeight:"600", fill:"$accent"})

      const strip = Insert(p, {type:"frame", name:"Strip", width:"fill_container", layout:"horizontal", gap:16})
      for (const [name, price] of [["Starter", "$0"], ["Enterprise", "Custom"]]) {
        const card = Insert(strip, {type:"frame", name:"Plan "+name, width:"fill_container", layout:"vertical", gap:6, padding:20, cornerRadius:8, fill:"#FFFFFF", stroke:"$line", strokeWidth:1})
        Insert(card, {type:"text", name:"Name", content:name, fontFamily:"Inter", fontSize:16, fontWeight:"600", fill:"$ink"})
        Insert(card, {type:"text", name:"Price", content:price, fontFamily:"Inter", fontSize:24, fontWeight:"bold", fill:"$accent"})
        Insert(card, {type:"text", name:"Note", content:"For teams at this stage.", textGrowth:"fixed-width", width:"fill_container", fontFamily:"Inter", fontSize:14, fill:"$muted"})
      }
    }
  },
  {
    tag: "C",
    name: "Variant C — Single card, toggle-led",
    idea: "One plan card with a monthly/annual toggle above it. Lowest cognitive load and the strongest single call to action, but it hides the comparison and depends on the toggle being obvious.",
    build: (p) => {
      // NOTE: layout:"vertical" — frames default to horizontal, which would
      // place the toggle BESIDE the card instead of above it.
      const wrap = Insert(p, {type:"frame", name:"Wrapper", width:"fill_container", layout:"vertical", alignItems:"center", gap:20})
      const toggle = Insert(wrap, {type:"frame", name:"Toggle", layout:"horizontal", alignItems:"center", padding:4, cornerRadius:999, fill:"#EDEDF2"})
      const monthly = Insert(toggle, {type:"frame", name:"Monthly", layout:"horizontal", alignItems:"center", padding:[8,24], cornerRadius:999, fill:"#FFFFFF", stroke:"$line", strokeWidth:1})
      Insert(monthly, {type:"text", name:"Label", content:"Monthly", fontFamily:"Inter", fontSize:14, fontWeight:"600", fill:"$ink"})
      const annual = Insert(toggle, {type:"frame", name:"Annual", layout:"horizontal", alignItems:"center", gap:8, padding:[8,24], cornerRadius:999})
      Insert(annual, {type:"text", name:"Label", content:"Annual", fontFamily:"Inter", fontSize:14, fill:"$muted"})
      Insert(annual, {type:"text", name:"Save", content:"save 20%", fontFamily:"Inter", fontSize:12, fontWeight:"600", fill:"$accent"})

      const card = Insert(wrap, {type:"frame", name:"Plan Studio", width:560, layout:"vertical", alignItems:"center", gap:10, padding:28, cornerRadius:8, fill:"#FFFFFF", stroke:"$ink", strokeWidth:1})
      Insert(card, {type:"text", name:"Name", content:"Studio", fontFamily:"Inter", fontSize:19, fontWeight:"600", fill:"$ink"})
      Insert(card, {type:"text", name:"Price", content:"$24", fontFamily:"Inter", fontSize:52, fontWeight:"bold", fill:"$accent"})
      Insert(card, {type:"text", name:"Per", content:"per editor / month, billed annually", fontFamily:"Inter", fontSize:14, fill:"$muted"})
      const list = Insert(card, {type:"frame", name:"Feats", layout:"vertical", gap:10, width:"fill_container"})
      for (const f of ["Everything in the library", "Unlimited projects", "Shared libraries", "Design-to-code export", "Priority support"]) {
        const row = Insert(list, {type:"frame", name:"Feat", layout:"horizontal", alignItems:"center", gap:10})
        Insert(row, {type:"icon", name:"Check", library:"lucide", icon:"check", width:18, height:18, fill:"$accent"})
        Insert(row, {type:"text", name:"FeatText", content:f, fontFamily:"Inter", fontSize:15, fill:"$ink"})
      }
      const btnWrap = Insert(card, {type:"frame", name:"BtnWrap", width:"fill_container", justifyContent:"end"})
      Insert(btnWrap, {type:"frame", name:"CTA", layout:"horizontal", alignItems:"center", padding:[12,28], cornerRadius:4, fill:"$accent"})
      Insert(btnWrap+"/CTA", {type:"text", name:"Label", content:"Start with Studio", fontFamily:"Inter", fontSize:14, fontWeight:"600", fill:"#FFFFFF"})
    }
  }
]

for (const v of VARIANTS) {
  // The label states what the variant is AND what it costs.
  const label = Insert(rows, {type:"frame", name:"Label "+v.tag, width:"fill_container", layout:"vertical", gap:6})
  Insert(label, {type:"text", name:"Name", content:v.name, textGrowth:"fixed-width", width:"fill_container", fontFamily:"Inter", fontSize:17, fontWeight:"bold", fill:"$ink"})
  Insert(label, {type:"text", name:"Idea", content:v.idea, textGrowth:"fixed-width", width:"fill_container", fontFamily:"Inter", fontSize:14, lineHeight:1.5, fill:"$muted"})

  const frame = Insert(rows, {type:"frame", name:v.name, width:"fill_container", layout:"vertical", gap:16, padding:24, cornerRadius:8, fill:"#FFFFFF", stroke:"$line", strokeWidth:1})
  v.build(frame)

  // Screenshot each variant SEPARATELY, not just the board. At board scale a
  // broken layout still reads as a plausible thumbnail.
  TakeScreenshot([frame])
}

Update(board, {placeholder:false})
