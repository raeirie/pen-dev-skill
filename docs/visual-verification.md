# Visual verification

The difference between a plausible design and a good one is whether anyone looked
at it. This doc covers the checks that catch what structural validation misses.

Read it when a screenshot looks wrong, when clipping fires, or when you need the
structural checks. The rule itself — screenshot each section and look at it — is
in `SKILL.md`.

---

## The core loop

```
build a section  →  screenshot it  →  look at it  →  fix  →  next section
```

Building a whole page and debugging at the end fails twice: a layout error in
section one propagates into every section after it, and you end up rewriting work
that was never wrong.

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

**Screenshot a node that carries the background.** A section with no `fill` of
its own renders on transparency. Light text on it looks blank in the PNG while
looking correct in the app, so the screenshot reports a bug the design does not
have — or hides one it does. Shoot the parent that owns the fill, or give the
section its own.

---

## What screenshots catch that structure doesn't

### Layout defaults

Frames default to `layout:"horizontal"`. A wrapper you meant to stack silently
arranges its children in a row. At board scale this still reads as a plausible
thumbnail — it only becomes obvious when you screenshot the section alone.

```js
Update("wrapperId", {layout:"vertical"})
```

### Instance clipping false positives

`ctx.problems === "fully clipped"` fires on `ref` instances whose reported bounds
sit outside the parent, **even when they render correctly**. Confirm with a
screenshot before "fixing" it. Trust the pixels, not `ctx.problems`, for
instances.

Real clipping is usually one of:

- a frame too small for its content
- text with `textGrowth:"auto"` that cannot wrap
- a `fit_content` parent whose children are all `fill_container`

### Alignment drift

Cards with different content lengths put their buttons at different heights. See
[variants.md](variants.md#cards-with-unequal-content) for the fix.

### Hidden overflow

Text that overflows its container is visible in a screenshot and invisible in a
structural read.

---

## Structural checks

Cheaper than screenshots — use these for geometry, screenshots for appearance.

```js
// Layout problems, from the document root
Get(root, (n,c) => { if(c.problems) Print("PROBLEM", n.name, c.problems) })

// Section sizes
Get(root, (n,c) => { if(c.depth === 1) Print("SECTION", n.name, c.bounds.width + "x" + c.bounds.height) })

// Off-center children
Get(card, (n,c) => c.parentCtx &&
  Math.abs(c.bounds.x + c.bounds.width/2 - c.parentCtx.bounds.width/2) > 1 &&
  Print(n.name, "off-center"))
```

`root` and `document` both address the document root. A visitor run from it
receives the top-level frames at `depth:0`, so `c.depth === 1` selects their
children.

pen also reports collapsed and zero-size nodes automatically — a node with
`fit_content` sizing and no children to size from.

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

## Screenshot or export?

`TakeScreenshot` attaches images to the response — for checking your own work.
`Export` writes files — for delivering to the user.

```js
Export([heroId], "png", "./exports")             // writes <nodeId>.png at 2x
Export([pageId], "html-tailwind", "./out.html")  // one HTML file
```

For image formats the path is a directory and each node becomes
`<nodeId>.<ext>`. For HTML formats it is the output file. For `pdf`, all nodes
combine into one multi-page file.

See [execute-api.md](execute-api.md#screenshot-and-export) for the full options.
