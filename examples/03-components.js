// 03 — Components: build one, instance it, override it.
//
// Shows the three things that trip people up:
//   · a component is a frame with reusable:true
//   · an instance is {type:"ref", ref:"<component id>"}
//   · customising an instance uses descendants, keyed by name or id
//
//   ./pen.sh multi scratch.pen < examples/03-components.js

// --- A reusable component. Build it at the document root, off to one side. ---
const pos = FindEmptySpace({width:280, height:80, direction:"top", padding:80})

button = Insert(document, {
  type:"frame", name:"Button/Primary", x:pos.x, y:pos.y,
  reusable:true, layout:"horizontal", alignItems:"center",
  padding:[10,40], cornerRadius:4, fill:"#582CFF",
  placeholder:true
})
label = Insert(button, {
  type:"text", name:"Label", content:"Submit",
  fontFamily:"Inter", fontSize:14, fontWeight:"600", fill:"#FFFFFF"
})
Update(button, {placeholder:false})

Print("COMPONENT", button, "label child:", label)

// --- Instance it. The component's id is what you reference. ---
const pos2 = FindEmptySpace({width:900, height:200, padding:80})
row = Insert(document, {
  type:"frame", name:"Row", x:pos2.x, y:pos2.y,
  width:900, layout:"horizontal", alignItems:"center", gap:16
})

// Plain instance — inherits the component's label.
Insert(row, {type:"ref", ref:button, name:"CTA Default"})

// Overridden at insert time, keyed by the descendant's NAME ("Label").
Insert(row, {type:"ref", ref:button, name:"CTA Custom", descendants:{
  "Label": {content:"Start free"}
}})

// Overridden on the instance root — property overrides go inline.
Insert(row, {type:"ref", ref:button, name:"CTA Outline", fill:"#FFFFFF"})

// --- Update a descendant AFTER inserting. The path is instanceId + "/" + childId. ---
const inst = Insert(row, {type:"ref", ref:button, name:"CTA Updated"})
Update(inst + "/" + label, {content:"Learn more"})

// --- Emulating deletion inside an instance: override enabled:false. ---
Insert(row, {type:"ref", ref:button, name:"CTA No Label", descendants:{
  "Label": {enabled:false}
}})

// --- List every instance in the document. ---
Print("=== INSTANCES ===")
Get(n => n.type === "ref" && Print("INSTANCE", n.id, n.name, "->", n.ref))

TakeScreenshot([row])
