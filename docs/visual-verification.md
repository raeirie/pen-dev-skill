# Visual verification

The difference between a plausible design and a good one is whether anyone
looked at it. This doc covers the checks that catch what structural validation
misses.

---

## The core loop

```
build a section  →  screenshot it  →  look at it  →  fix  →  next section
```

Do not build a whole page and debug at the end. A layout error in section one
propagates into every section after it, and you end up rewriting work that was
never wrong.

---

## Taking a screenshot

```js
TakeScreenshot([nodeId])
```

The response carries base64 PNGs. Extract them to files so they can be viewed:

```bash
./pen.sh app < build.js | python3 pen-shots.py ./pen-shots
```

Each file is named after the node id.

**Screenshot the smallest meaningful node.** A section frame, not the whole
document — large nodes cost more tokens and obscure detail.

---

## What screenshots catch that structure doesn't

### Layout defaults

Frames default to `layout:"horizontal"`. A wrapper you meant to stack silently
arranges its children in a row. At board scale this still reads as a plausible
thumbnail — it only becomes obvious when you screenshot the variant alone.

```js
Update("wrapperId", {layout:"vertical"})
```

### Instance clipping false positives

`ctx.problems === "fully clipped"` fires on `ref` instances whose reported
bounds sit outside the parent, **even when they render correctly**. Confirm with
a screenshot before "fixing" it.

Real clipping is usually one of:

- a frame too small for its content
- text with `textGrowth:"auto"` that cannot wrap
- a `fit_content` parent whose children are all `fill_container`

### Alignment drift

Cards with different content lengths put their buttons at different heights.
Fix by giving the row a fixed height, the cards `height:"fill_container"`, and
the flexible middle section `height:"fill_container"` so it absorbs the slack
and pushes the button down.

### Hidden overflow

Text that overflows its container is visible in a screenshot and invisible in a
structural read.

---

## Structural checks

Cheaper than screenshots — use these for geometry, screenshots for appearance.

```js
// Layout problems
Get(root, (n,c) => { if(c.problems) Print("PROBLEM", n.name, c.problems) })

// Section sizes
Get(root, (n,c) => { if(c.depth === 1) Print("SECTION", n.name, c.bounds.width + "x" + c.bounds.height) })

// Off-center children
Get(card, (n,c) => c.parentCtx &&
  Math.abs(c.bounds.x + c.bounds.width/2 - c.parentCtx.bounds.width/2) > 1 &&
  Print(n.name, "off-center"))
```

pen also reports collapsed/zero-size nodes automatically — a node with
`fit_content` sizing and no children to size from.

---

## The finishing checklist

Run before reporting a design as done:

- [ ] Final screenshot reviewed **by eye** — it looks right, not just structurally valid
- [ ] `placeholder:false` set on every frame created or modified
- [ ] No "STILL GENERATING" output from the placeholder check
- [ ] No collapsed/zero-size nodes
- [ ] Clipping checked — and confirmed against a screenshot, since instance
      clipping reports are often false positives
- [ ] CTAs and repeated elements aligned across sibling cards
- [ ] Every colour, spacing, radius and font traces back to a token in the file
- [ ] Repeated UI is an instance of an existing component where one covers it
- [ ] `save()` called (headless) and the `.pen` file confirmed on disk

---

## The `placeholder` lifecycle

`placeholder:true` marks a frame as still being worked on. pen's own convention:

> Any new, copied, or modified root frame MUST have `placeholder: true` for the
> entire duration of the work on it. Once you start working inside a placeholder
> node, finish it before unsetting the flag. Remove `placeholder: true` as soon
> as the frame is done.

A frame left flagged shows a permanent **"generating"** state in the app. Clear
it in the same `execute` call that finishes the frame, and clear it even if
something failed partway.

```js
Update(screenId, {placeholder:false})
```

Verify:

```js
Get((n,c) => {c.skipChildren(); if(n.placeholder) Print("STILL GENERATING:", n.name)})
```

---

## The design-system audit

Before designing anything, find out whether the file already carries a design
system — tokens, components, themes. If it does, that system is the palette and
the component library for the work.

```js
const vars = GetVariables()
Print("TOKENS:", Object.keys(vars.variables || {}).length)
Print("THEMES:", JSON.stringify(vars.themes))
Get(n => n.reusable && Print("COMP", n.id, n.name))
Get((n,c) => {c.skipChildren(); Print("FRAME", n.id, n.name)})
```

| Finding | Action |
| --- | --- |
| Many tokens + components | Full system — inherit everything, invent nothing |
| Tokens only | Use the tokens; build components fresh, styled with them |
| Neither | No system — use `get_style()` and create tokens |

**Themed tokens** resolve per theme. Reference the semantic name
(`$ci-sem-color-text-strong`) and light/dark both stay correct; hardcoding the
hex breaks one of them.

Reuse:

- tokens as `"$token"`
- components via `type:"ref"` with `descendants:{ "Label": {content:"..."} }`
- the file's own spacing and radius scale, not invented pixel values

Deviate only when the user asks, or when the system genuinely can't express the
request — and say so rather than silently diverging.

---

## Style guidance

- Don't wrap every element in its own card — that's the generic-AI look. Use a
  container only when it has a structural or functional purpose
- Reserve accent colour for actions; don't dilute it across decoration
- Don't stack sections with the same density — alternate text-heavy and visual
- One alignment axis per section; never mix centred and left in one section
- Body text never below 14px; clear size jumps between hierarchy levels
- Hero = the whole pitch compressed: one idea, one headline, one CTA
- Never hand-draw artwork — use `Generate` for logos and illustrations
