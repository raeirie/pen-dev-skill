---
name: pen-dev
description: Operate the pen.dev design tool from the terminal via its headless CLI. Use when the user wants to create, edit, review or export pen.dev designs (.pen files), operate the Pen.app canvas, or build UI mockups in pen.dev. Drives pen's design tools directly, reusing the file's own design system when it has one.
---

# pen.dev CLI operation

Drive pen.dev's editor engine directly from the shell. `pen interactive` exposes the
same tools the desktop app's agent uses — and the agent makes the design decisions.

## Two modes

| Mode | Command | Use for |
| --- | --- | --- |
| **Live app** | `pen interactive -a desktop` | Edit the canvas open in Pen.app. Changes appear instantly. Requires Pen.app running. |
| **Headless** | `pen interactive -o out.pen [--in in.pen]` | Create/edit `.pen` files with no GUI. Best for CI and for design work you verify via screenshots. |

Use `pen interactive` — it exposes pen's tools directly, and the agent makes every
design decision itself. (Agent mode, `pen --prompt "..."`, delegates the design to
pen's own model instead.)

## Sandbox constraints (important)

The DSH sandbox blocks `~/.pencil/socket/`, and unix socket paths are capped at
~104 chars. So:

- **Headless:** run with `HOME` pointed at a short writable dir, e.g. `HOME=/tmp/ph`.
  Copy `~/.pencil/session-cli.json` there first.
- **Live app:** must use the *real* `HOME` so it finds `~/.pencil/socket/pencil-desktop.sock`.
  App mode also needs no socket creation, so the sandbox is not a problem.

Use `pen.sh` in this skill's directory — it handles both.

## Quick start

```bash
SKILL=~/.dsh/skills/pen-dev

# headless: create/edit a .pen file
$SKILL/pen.sh multi design.pen < build.js

# live: edit the canvas open in Pen.app
$SKILL/pen.sh app < build.js

# what has the user selected in Pen.app right now?
$SKILL/pen.sh sel
$SKILL/pen.sh seltree      # selected subtree as a readable tree

# extract screenshots so you can look at them
$SKILL/pen.sh app < build.js | python3 $SKILL/pen-shots.py ./pen-shots
```

In `build.js`, put `@call` on its own line to split the script into several
`execute()` calls inside one session (globals persist across those chunks).

## Working on a live Pen.app canvas

`pen.sh app` connects to the running Pen.app and edits the **currently open
document**. Writes land in `~/.pencil/documents/<uuid>/<name>.pen` immediately,
and the canvas updates in the app as you go.

The open document's path is in `get_app_state()`:

```js
get_app_state()
```

If Pen.app is not running, app mode fails with "Could not connect to pen.dev
desktop app". Ask the user to open it, or work headless instead.

**Be careful editing a live file** — it is the user's working document. Read
before you write, and prefer creating a new top-level frame over restructuring
what is already there.

## Pointing at a frame or element

The user disambiguates by **selecting layers in Pen.app** and then asking. The
canvas selection is the pointer — it carries the node ids, so the agent acts on
exactly what was picked rather than guessing from a name.

```bash
$SKILL/pen.sh sel        # what is selected + canvas state (ids, names, types)
$SKILL/pen.sh seltree    # the selected subtree as a readable tree
```

`seltree` prints, per selected node, its id, name, type, width/height, fill,
layout, and text content — enough to read the structure without guessing.

Selection state is live: it reflects whatever the user has selected at that
moment. If `seltree` prints `NO_SELECTION`, ask them to select the layer(s) in
Pen.app and try again — do not guess which frame they meant.

The user's phrasing still matters. A selection narrows the target; "make this
darker" plus a selected card means *that card*. When a selection and the words
disagree, trust the words and confirm.

Name references work too, when the name is unique:

```js
Get((n,c)=>{c.skipChildren(); return n.name==="Pricing" ? n.id : undefined})
```

## Auth

`pen status` verifies the session. If it says **Expired / Revoked**, the
`session-cli.json` token is stale. The desktop app's `session-desktop.json` token
is refreshed automatically — copy it over:

```bash
python3 - <<'PY'
import json
d = json.load(open('/Users/arie/.pencil/session-desktop.json'))
json.dump({"email": d["email"], "token": d["token"]},
          open('/tmp/ph/.pencil/session-cli.json', 'w'))
PY
```

`pen login` is interactive (email + password/OTP) — the user must do that
themselves if neither token works. `PEN_CLI_KEY` from org Developer Keys also works.

## The shell is line-oriented

One tool call per line: `tool_name({ key: value })`. Multi-line JavaScript must be
sent as a **single** `execute({ input: "..." })` call with the JS JSON-escaped.

`pen.sh multi` handles this: give it a JS file, split on lines containing
`@call`, and it emits one `execute()` per chunk **inside one session** — so
globals like `page = Insert(...)` persist across chunks.

## Tools available

`execute`, `get_app_state`, `get_style`, `read_skill`, `browser`.

`execute` exposes: `Insert`, `Copy`, `Update`, `Replace`, `Move`, `Delete`,
`Generate`, `SetVariables`, `GetVariables`, `Get`, `Print`, `TakeScreenshot`,
`Export`, `FindEmptySpace`.

## Workflow

The order matters. **The audit comes before any design work** — you cannot
inherit a design system you haven't looked at yet.

1. **Read the guides.** `read_skill()` gives the core rules; `read_skill({path:"execute.md"})`
   gives the full API; `read_skill({path:"pen-schema.md"})` gives the TypeScript schema.
   Topic guides live under `guide/` — e.g. `guide/landing-page.md`, `guide/web-app.md`,
   `guide/mobile-app.md`, `guide/components.md`, `guide/design-system.md`.

2. **Audit the file for an existing design system.** Do this *before* designing
   anything — see [Reusing an existing design system](#reusing-an-existing-design-system).
   If the file already carries tokens or components, they are the palette and the
   component library for this work, unless the user says otherwise.

3. **Pick a style** only if the file has no design system to inherit, or the user
   asked for a specific direction. `get_style()` lists ~26 archetypes,
   `get_style({name})` reports required params, then
   `get_style({name, params})` returns concrete tokens (colors, fonts, radii, shadows).

4. **Set design tokens first** with `SetVariables({...})`, then reference them as
   `"$token"`. Use themed values for light/dark. When the file already has
   tokens, add only what is missing — never redefine what exists.

5. **Set `layout` explicitly on every container.** Frames default to
   `layout:"horizontal"`, so a wrapper you meant to stack silently arranges
   its children in a row. This is the most common silent layout error, and it
   survives a board-scale screenshot. State `layout:"vertical"` when you mean
   vertical.

6. **Build incrementally.** Insert a section, `TakeScreenshot([sectionId])`, look at
   the image, fix what looks wrong, move on. Verify each section as you go — do not
   build the whole page then debug.

7. **Check for problems.** pen reports collapsed/zero-size nodes automatically.
   Also run a clipping check:

   ```js
   Get(root, (n,c)=>{ if(c.problems) Print("PROBLEM", n.name, c.problems) })
   ```

8. **Clear `placeholder` and save.** Every root frame you touched must end with
   `placeholder:false`, or it shows a permanent "generating" state in the app.
   Then `save()` writes the `.pen` file (headless mode needs it).

   ```js
   Update(screenId, {placeholder:false})
   ```

   Verify nothing is left flagged:

   ```js
   Get((n,c)=>{c.skipChildren(); if(n.placeholder) Print("STILL GENERATING:", n.name)})
   ```

9. **Export** deliverables: `Export([id], "png", "./exports")`, or
   `Export([id], "html-tailwind", "./out.html")` / `"html-css"`.

## Finishing checklist

Before reporting a design as done, confirm all of these:

- [ ] Final screenshot reviewed by eye — it looks right, not just structurally valid
- [ ] `placeholder:false` set on every frame you created or modified
- [ ] No `STILL GENERATING` output from the placeholder check
- [ ] No collapsed/zero-size nodes (pen reports these automatically)
- [ ] Clipping checked — but confirmed against a screenshot, since instance
      (`ref`) clipping reports are often false positives
- [ ] CTAs and repeated elements aligned across sibling cards
- [ ] `save()` called (headless), and the `.pen` file confirmed on disk
- [ ] Existing design tokens/components reused rather than reinvented
- [ ] Every colour, spacing, radius and font in the new design traces back to a
      token in the file — no invented hex values or pixel sizes alongside them
- [ ] Every repeated UI element is an instance of an existing component where
      one covers it
- [ ] The design-system audit was run *before* building (not retrofitted after)

## Critical .pen schema rules

These are the ones that actually break things:

- **No CSS thinking.** No `margin`, no `%` sizes, no `alignItems:"stretch"`,
  no `calc()`. pen has its own layout engine.
- **Only `frame` and `group` have children.** Text/rectangle/etc. cannot.
- **Flexbox is single-axis, no wrapping.** Grid = separate row frames.
- **Text must have `fill`** or it is invisible.
- **Text sizing:** default `textGrowth:"auto"` (no wrap, ignores width/height).
  For wrapping you MUST set `"fixed-width"` (+ `width`) or `"fixed-width-height"`.
  Never guess text pixel dimensions — let layout size it.
- **`fill_container`** = size to parent; **`fit_content`** = size to children.
  A parent sized `fit_content` whose children are all `fill_container` collapses.
- **`x`/`y` are ignored** inside a flex-layout parent. Use `layoutPosition:"absolute"`
  to opt out.
- **Property changes need `Update`** — but `Update` cannot change `id`, `type`, `ref`.
  To swap children use `Replace`.
- **Copy gets new descendant ids.** To customise a copy, pass `descendants` in the
  `Copy` call itself. Never `Update` a copied descendant by its old id.
- **Instances (`type:"ref"`)** take overrides inline, or via `descendants` keyed by
  child id / `instanceId/childId` path. To "delete" an instance descendant, override
  `enabled:false` — `Delete` cannot reach inside an instance.
- **Keep the document root clean:** only screens, components, and major containers
  directly under `document`.
- **`placeholder` is a promise you must keep.** Any new or modified root frame
  needs `placeholder:true` while you work on it — and **`placeholder:false` when
  you are done**. A frame left flagged shows a permanent "generating" state in
  the app. Clear it in the same `execute` call that finishes the frame, and
  always clear it as the *last* step, even if you hit an error partway:

  ```js
  Update(screenId, {placeholder:false})
  ```

  Verify before you report done:

  ```js
  Get(root, (n,c)=>{ if(c.depth===0 && n.placeholder) Print("STILL GENERATING:", n.name) })
  ```
- **Never hand-draw artwork.** Use `Generate(nodeId,"svg",prompt)` for logos,
  illustrations, icons-as-art. `Generate(nodeId,"ai"|"stock",prompt)` for image
  fills. These are async — the node fills in later; check `placeholder` before
  screenshotting.
- **Don't create an `image` node type.** Images are fills on a frame/rectangle.
- **`Get` needs a visitor.** `Get("id", {depth:0})` without a visitor throws
  ("Reading the whole document without a visitor"). Use
  `Get("id", (n,c)=>Print(...))` or `Get("id", {depth:2}, visitor)`.
- **Node ids are case-sensitive.** `W8ANjG` != `W8ANJg`. Look ids up rather than
  transcribing them from earlier output.
- **`Get(visit)` with `skipChildren()` at the root returns the whole doc.**
  Scope to a known id first, then descend.

## Reusing an existing design system

**Run this audit before designing anything.** A `.pen` file may already carry a
design system — tokens, components, themes. When it does, that system is the
palette and the component library for the work. Inventing a parallel one breaks
consistency with everything else in the file.

The user's instruction to reuse stands unless they say otherwise (e.g. *"make a
completely new look"*, *"use our new brand colours"*).

### The audit

One `execute` call answers all three questions:

```js
// 1. tokens — how many, and what are they called?
const vars = GetVariables()
const names = Object.keys(vars.variables || {})
Print("TOKENS:", names.length)
Print(names.join(", "))

// 2. themes — which axes exist? (light/dark, per-brand)
Print("THEMES:", JSON.stringify(vars.themes))

// 3. components — what can I instance?
Get(n => n.reusable && Print("COMP", n.id, n.name))
```

Also list the top-level frames, which reveal whether the file holds a design
system board, a component library, or finished screens:

```js
Get((n,c)=>{c.skipChildren();Print("FRAME", n.id, n.name)})
```

### Reading the result

| Finding | What to do |
| --- | --- |
| Many tokens (`$ci-sem-color-*`, `$brand-*`, `$text-*`) | **Use them.** Reference by name: `fill:"$ci-sem-color-surface-base"` |
| Components exist (`Button/Primary`, `Nav Item`, `Card`) | **Instance them** via `type:"ref"` instead of rebuilding |
| Both | Full design system — inherit everything, invent nothing |
| Few or none | The file has no system. Use `get_style()` and create tokens |
| Tokens but no components | Use the tokens; build components fresh, styled with them |

Themes matter: a file with `{"mode":["light","dark"]}` has themed tokens whose
values resolve per theme. Reference the semantic name (`$ci-sem-color-text-strong`)
and both themes stay correct — never hardcode a hex that belongs to one theme.

### Using what you found

- Reference tokens as `"$token"`. To read a token's value:
  `GetVariables().variables["ci-sem-color-brand"].value` — for themed tokens
  that is an array of `{value, theme}` entries.
- Instance components with `type:"ref"`, then override:
  `Insert(parent, {type:"ref", ref:"GPnwN", descendants:{"Label":{content:"Start free"}}})`
  The `descendants` key is the descendant's *name* when unique, otherwise its id.
- Match the file's own spacing and radius scale (`$ci-sem-space-6`,
  `$ci-sem-radius-card`) rather than inventing pixel values. If the file uses
  literal numbers, follow that convention instead.
- Match its naming: `Button/Primary` style names signal that a family exists.

### When to deviate

Deviate only when the user asks, or when the file's system genuinely cannot
express the request — and then say so rather than silently diverging. A file
with a dark theme may need a light section; use the theme axis rather than
hardcoding a background.

Add a variant section to the board rather than a parallel system: a variant
should explore *emphasis*, and the tokens stay shared.

## Reading an existing project before changing it

Never rebuild a system that already exists. Before editing someone's file:

```js
// top-level frames
Get((n,c)=>{c.skipChildren();Print(n.id,n.name)})
// reusable components
Get(n=>n.reusable && Print(n.id,n.name))
// design tokens
Print(GetVariables())
// one component's internals (to instance it correctly)
Get("COMPONENT_ID", (n,c)=>Print(n.id,n.name,n.type))
```

Then reuse their components via `type:"ref"` and their tokens via `"$token"`
instead of inventing your own palette. Override the component's label through
`descendants:{ "Label": {content:"..."} }` — the key is the descendant's *name*
if unique, otherwise its id.

## Sibling vs child — the most common bug

`Insert` appends to the **end of the parent's children array**. To nest a label
inside a button you must insert it into the button's id:

```js
btn = Insert(parent, {type:"frame", name:"Button", ...})
Insert(btn, {type:"text", name:"Label", content:"Submit", ...})   // child
```

Inserting the label into `parent` instead makes it a *sibling* of the button —
visually wrong, and pen reports the button as "collapsed size ... no children to
size from". That error message is the tell.

## Making a variant

"Add a variant" means: produce **alternative treatments of the same content**,
so the user can choose. It does not mean another component instance.

Match the document's existing conventions before inventing one. A common pattern
is a *variants board* — one top-level frame holding, per variant, a label frame
(naming the variant and stating the idea in a sentence) followed by the variant
itself:

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

Rules for good variants:

- **Three is the useful count.** Two is an A/B, four is noise.
- **Each variant is a different emphasis, not a different skin.** Different
  layout, hierarchy, or focus — not just a recolour. Say which one you'd pick
  and why in the idea sentence.
- **Keep the content identical.** Same plans, same prices, same features. Only
  the presentation changes, so the choice is about design, not about scope.
- **Reuse the document's tokens and components** in every variant, so the
  variants are comparable.
- **The idea sentence states the trade-off**, including who it suits and what it
  costs. "Lowest cognitive load, but it hides the comparison."

A variant set needs a **screen-level check**: screenshot each variant
separately, not just the board — at board scale, a layout that is broken (a
control beside a card instead of above it) still reads as a plausible thumbnail.

## Clipping reports on instances are often false positives

`ctx.problems === "fully clipped"` fires on `ref` instances whose reported
bounds sit outside the parent even though they render correctly. **Always
confirm with a screenshot before "fixing" clipping.** Trust the pixels, not
`ctx.problems`, for instances.

Real clipping is usually one of: a frame too small for its content, text with
`textGrowth:"auto"` that cannot wrap, or a parent sized `fit_content` whose
children are all `fill_container`.

## Aligning CTAs across sibling cards

When cards have different content lengths, their buttons will not line up.
Fix by giving the row a fixed height, the cards `height:"fill_container"`, and
the flexible middle section `height:"fill_container"` so it absorbs the slack
and pushes the button to the bottom.

## Visual verification is the point

`TakeScreenshot([ids])` returns base64 PNGs in the response. `pen-shots.py` extracts
them to files so they can be viewed. **Always look at the screenshot** before
calling a design done — that is what separates a good result from a plausible one.

Use `ctx.bounds` for cheap structural checks; reach for a screenshot when you need
to judge colour, type and alignment.

## Style guidance

- Don't wrap every element in its own card — that's the generic-AI look.
- Reserve accent colour for actions. Don't dilute it across decoration.
- Don't stack sections with the same density; alternate text-heavy and visual.
- One alignment axis per section; never mix centred and left in one section.
- Body text never below 14px. Clear size jumps between hierarchy levels.
- Hero = the whole pitch compressed: one idea, one headline, one CTA.
