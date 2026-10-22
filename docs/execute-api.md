# The `execute` API

Everything an agent can do to a canvas happens through the `execute` tool. It runs
a JavaScript snippet against the live document, with a small set of functions in
scope.

```js
execute({ input: '...' })   // run a snippet
execute({ edits: [...] })   // patch a failed snippet (requires editId)
```

---

## Available functions

```ts
const document: string; // predefined root node

// Mutations
function Insert(parent: string, nodeData: Child): string;   // returns new id
function Copy(path: string, parent: string, copyNodeData?: Child): string;
function Update(path: string, updateData: Child): void;
function Replace(path: string, nodeData: Child): string;     // returns new id
function Move(path: string, parent: string | undefined, index?: number): void;
function Delete(path: string): void;
function Generate(nodeId: string, type: "ai" | "svg" | "stock", prompt: string): void;
function SetVariables(variables: Record<string, VariableDefinition>, replace?: boolean): void;

// Reading
function Get(path: string, options?: GetOptions): Child;
function Get<T>(path: string, visit: Visit<T>, options?: GetOptions): T[];
function Get<T>(visit: Visit<T>, options?: GetOptions): T[];
function GetVariables(): { variables: Record<string, VariableDefinition>; themes?: Record<string, string[]> };
function FindEmptySpace(input: {width, height, direction?, padding?, nodeId?}): {x, y, parentId?};

// Output
function Print(...values: unknown[]): void;
function TakeScreenshot(nodeIds: string[]): void;
function Export(nodeIds: string[], format: "png"|"jpeg"|"webp"|"pdf"|"html-tailwind"|"html-css", outputPath: string, options?: ExportOptions): void;
```

### Types

```ts
type Visit<T> = (node: Child, ctx: Ctx) => T | undefined;

interface Ctx {
  node: Child;             // the visited node
  parentCtx?: Ctx;         // parent's context; undefined at the top
  depth: number;
  index: number;           // position among siblings
  bounds: Rect;            // resolved bounds in the parent's coordinate space
  problems?: "partially clipped" | "fully clipped";
  skipChildren(): void;    // don't descend into this node's children
}

interface GetOptions {
  depth?: number;                  // 0 = node only; children appear as "..."
  resolveVariables?: boolean;      // computed values instead of $references
  resolveInstances?: boolean;      // expand component instances into subtrees
  includePathGeometry?: boolean;
}

interface ExportOptions {
  scale?: number;                  // image scale, default 2
  quality?: number;                // JPEG/WEBP quality 1-100
  includeHtmlScaffold?: boolean;   // html: full document scaffold, default true
  includeLayerNames?: boolean;     // html: layer names as data attributes, default true
  includeLayerIds?: boolean;       // html: layer ids as data attributes, default false
}
```

---

## Rules that bite

**`Get` requires a visitor.** `Get("id", {depth:0})` throws — reading without a
visitor would dump the whole document.

```js
Get("id", (n,c) => Print(n.id, n.name))     // ✅
Get((n,c) => {c.skipChildren(); Print(n.name)})  // ✅
```

**Paths are ids, or slash-paths into instances.** `instanceId/childId` works at
any depth. Slashes are only valid for component-instance nesting, not normal
layer structure.

**Always pass ids, never node objects.** When you hold a node from `Get`, pass
its `.id`.

**`Insert` appends to the end of the parent's children.** To nest, insert into the
child's id:

```js
btn = Insert(parent, {type:"frame", name:"Button"})
Insert(btn, {type:"text", name:"Label", content:"Submit"})   // child of btn
Insert(parent, {type:"text", name:"Label"})                 // sibling of btn — usually wrong
```

**`Update` cannot change `id`, `type`, or `ref`.** To swap children, use
`Replace`. To change a node's children list, use `Replace` too.

**`Copy` assigns new descendant ids.** To customise a copy, pass `descendants`
in the `Copy` call itself — never `Update` a copied descendant by its old id.

**`Delete` cannot reach inside an instance.** Override the descendant's
`enabled:false` instead.

---

## Reading

```js
// List top-level frames
Get((n,c) => {c.skipChildren(); Print(n.id, n.name)})

// List reusable components
Get(n => n.reusable && Print(n.id, n.name))

// Read a subtree
Print(Get("Xk9f2", {depth: 3}))

// Compact rows
Get(screen, (n,c) => Print(n.id, n.name, c.depth, c.bounds.width))

// Layout problems
Get(screen, (n,c) => c.problems && Print(n.name, "|", c.parentCtx?.node.name, "|", c.problems))

// Find a node by name
Get(n => n.name === "Primary Button" && Print(n.id))

// Collect only what you need
const texts = Get(screen, n => n.type === "text" ? n : undefined)

// Tokens
Print(GetVariables())
```

Keep responses small: print compact positional lines from a visitor rather than
JSON objects. Reserve JSON for single structured values.

---

## Variables

```js
SetVariables({
  "bg": {type:"color", value:"#FAFAF7"},
  "text-primary": {type:"color", value:"#1A1A1A"},
  "font-body": {type:"string", value:"Inter"},
  "gap-md": {type:"number", value:16}
})
```

Each value **must** be an object with `type` (`"color"`, `"number"`, `"string"`)
and `value`. A bare value fails.

**Themed values** pass an array of `{value, theme}` entries — the theme axis and
values register automatically:

```js
SetVariables({
  background: {type:"color", value:[
    {value:"#F8F5F0", theme:{mode:"light"}},
    {value:"#1A1A1A", theme:{mode:"dark"}}
  ]}
})
```

`replace` (default `false`) merges; pass `true` to wipe existing definitions.

**Variable names must not start with `$`** — the `$` prefix is only used when
*referencing* one.

Read before you write, so you don't clobber existing tokens:

```js
Print(GetVariables())
```

---

## Instances

```js
// Insert an instance, then update descendants
cardId = Insert("Casf3fX", {type:"ref", ref:"abc", name:"Account Card"})
Update(cardId+"/childTitleId", {content:"Account Details"})

// Override at insert time
Insert(parent, {type:"ref", ref:"GPnwN", descendants:{"Label": {content:"Start free"}}})

// Replace a slot entirely
customContentId = Replace(cardId+"/contentSlotId", {type:"frame", name:"Content", layout:"vertical"})

// Emulate deletion
Insert(parent, {type:"ref", ref:"abc", descendants:{"icon": {enabled:false}}})
```

`descendants` keys may be node ids, slash-paths, or **unique descendant names**
(use the id when a name is ambiguous). A descendant key with `type` present
replaces the whole subtree; without `type` it overrides properties.

An instance has no children of its own — its subtree comes from the component.
Don't `Get` an instance to discover children; use the component's child ids, or
`Get(instanceId, {resolveInstances:true})` to read the expanded tree.

---

## Generations (async)

```js
Generate(nodeId, "svg", "a minimal compass mark, single color")
Generate(nodeId, "ai", "a photo of a connected vehicle in a city")
Generate(nodeId, "stock", "city traffic")
```

`"ai"` and `"svg"` are **async and non-blocking** — the result lands after the
`execute` call returns. The target node stays empty until then.

- The frame an SVG generates into keeps `placeholder:true` until generation
  finishes. Check with a cheap read: `Print(Get(frameId, {depth:0}).placeholder)`
- Never re-generate or add children to a frame mid-generation
- Poll sparingly — do other work in between

---

## Layout, in brief

- **No CSS.** No `margin`, no `%` sizes, no `calc()`, no `alignItems:"stretch"`
- **Only `frame` and `group` have children**
- **Flexbox is single-axis with no wrapping.** Grid = separate row frames
- **`fill_container`** = size to parent; **`fit_content`** = size to children.
  A `fit_content` parent whose children are all `fill_container` collapses
- **`x`/`y` are ignored** inside a flex-layout parent; use
  `layoutPosition:"absolute"` to opt out
- **Frames default to `layout:"horizontal"`** — set `layout:"vertical"` explicitly
  when you mean vertical
- **Text needs `fill`** or it's invisible
- **Text sizing:** default `textGrowth:"auto"` never wraps and ignores
  width/height. For wrapping, set `"fixed-width"` (+ `width`) or
  `"fixed-width-height"`. Never guess text dimensions — let layout size it
- **Properties don't cascade** — every node needs its own values

---

## Screenshot and export

```js
TakeScreenshot([heroId])                        // attaches base64 PNGs
Export([heroId], "png", "./exports")             // writes <nodeId>.png
Export([pageId], "html-tailwind", "./out.html") // writes one HTML file
```

`Export` writes files; the response lists absolute paths. For image formats the
path is a **directory** — each node becomes `<nodeId>.<ext>` at 2x scale. For
`pdf`, all nodes combine into a single multi-page file. For HTML formats the
path is the **output file**.

Use `TakeScreenshot` to check your work; use `Export` to deliver.

---

## Upstream

The authoritative schema lives in pen's own skill bundle:

```js
read_skill({ path: "pen-schema.md" })   // full TypeScript schema
read_skill({ path: "execute.md" })      // the execute API reference
read_skill()                            // design rules
read_skill({ path: "guide/landing-page.md" })  // topic guides
```
