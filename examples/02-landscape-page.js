// 02 — Build a landing page from scratch, headless.
//
// Shows the core loop: set tokens → build a section → screenshot → next section.
// Screenshot the smallest meaningful node.
//
//   ./pen.sh multi landing.pen < examples/02-landscape-page.js
//   ./pen.sh multi landing.pen < examples/02-landscape-page.js | python3 pen-shots.py ./pen-shots

// --- 1. Tokens first. Reference them as "$token" everywhere else. ---
SetVariables({
  "surface":   {type:"color", value:"#0A0A0A"},
  "fg":        {type:"color", value:"#FFFFFF"},
  "fg-muted":  {type:"color", value:"#A1A1A1"},
  "border":    {type:"color", value:"#222233"},
  "accent":    {type:"color", value:"#582CFF"},
  "font-h":    {type:"string", value:"Geist"},
  "font-b":    {type:"string", value:"Inter"},
  "font-c":    {type:"string", value:"IBM Plex Mono"},
  "r-sm":      {type:"number", value:4}
})

// --- 2. Page frame. New root frames carry placeholder:true while you work. ---
const pos = FindEmptySpace({width:1440, height:1400, padding:80})
page = Insert(document, {
  type:"frame", name:"Landing Page", x:pos.x, y:pos.y,
  width:1440, layout:"vertical", gap:0,
  fill:"$surface", clip:true, placeholder:true
})

// --- 3. Nav. Note layout:"vertical" stated explicitly where you mean it. ---
nav = Insert(page, {
  type:"frame", name:"Nav", width:"fill_container",
  layout:"horizontal", alignItems:"center", justifyContent:"space_between",
  padding:[20,64], stroke:"$border", strokeWidth:{bottom:1}
})
logo = Insert(nav, {type:"frame", name:"Logo", layout:"horizontal", alignItems:"center", gap:10})
Insert(logo, {type:"rectangle", name:"Mark", width:22, height:22, cornerRadius:6, fill:"$accent"})
Insert(logo, {type:"text", name:"Wordmark", content:"PRISM", fontFamily:"$font-h", fontSize:17, fontWeight:"bold", letterSpacing:3, fill:"$fg"})

links = Insert(nav, {type:"frame", name:"Links", layout:"horizontal", alignItems:"center", gap:32})
for (const label of ["Product", "Docs", "Pricing"]) {
  Insert(links, {type:"text", name:label, content:label, fontFamily:"$font-c", fontSize:12, letterSpacing:1.2, fill:"$fg-muted"})
}

// --- 4. Hero. Text needs textGrowth to wrap. ---
hero = Insert(page, {
  type:"frame", name:"Hero", width:"fill_container",
  layout:"vertical", alignItems:"center", gap:24, padding:[120,64]
})
Insert(hero, {
  type:"text", name:"Headline", content:"Turn a sentence into a shipped design system.",
  textGrowth:"fixed-width", width:900, textAlign:"center",
  fontFamily:"$font-h", fontSize:64, fontWeight:"bold", lineHeight:1.1, fill:"$fg"
})
Insert(hero, {
  type:"text", name:"Sub",
  content:"Production-ready, accessible components — tokens, variants and code included.",
  textGrowth:"fixed-width", width:600, textAlign:"center",
  fontFamily:"$font-b", fontSize:19, lineHeight:1.5, fill:"$fg-muted"
})

// A button is a frame with a text CHILD. Insert the label into the button id.
btn = Insert(hero, {
  type:"frame", name:"CTA", layout:"horizontal", alignItems:"center",
  padding:[16,32], cornerRadius:"$r-sm", fill:"$accent"
})
Insert(btn, {type:"text", name:"Label", content:"Start building free", fontFamily:"$font-b", fontSize:15, fontWeight:"600", fill:"$fg"})

// --- 5. Verify the section, then move on. ---
TakeScreenshot([hero])

// --- 6. Finish: clear the placeholder. A frame left flagged shows "generating". ---
Update(page, {placeholder:false})
