---
name: pen-dev
description: Design in pen.dev from the terminal: create or edit .pen files, change the canvas open in Pen.app, and export to PNG or HTML. Use when the user asks for a pen.dev design — a screen, page, mockup, dashboard or component — or asks to change whatever layer they have selected in Pen.app.
version: 0.1.1
---

# pen.dev CLI operation

Drive pen.dev's editor engine from the shell. `pen interactive` exposes the same
tools the desktop app's agent uses, so the agent makes every design decision and
pen's engine renders it. Agent mode (`pen --prompt "..."`) hands the design to
pen's own model instead — this skill does not use it.

## Two modes

| Mode | Command | Use for |
| --- | --- | --- |
| **Live app** | `pen interactive -a desktop` | The canvas open in Pen.app. Changes land on screen as you go. Needs Pen.app running. |
| **Headless** | `pen interactive -o out.pen [--in in.pen]` | `.pen` files with no GUI. CI, and design work you verify from screenshots. |

`pen.sh` in this skill's directory wraps both and handles the two sandbox
constraints:

- **Headless** runs with `HOME=/tmp/ph`, a short scratch directory. The CLI
  creates a unix socket under `~/.pencil/socket/`, which sandboxes block and
  whose path caps near 104 characters. `pen.sh` also copies the desktop app's
  session token there, so an expired CLI session heals itself.
- **Live app** runs with the real `HOME`, because it only connects to the socket
  Pen.app already created.

Raw `pen` needs the same treatment; `pen.sh` is the short path.

## Quick start

```bash
SKILL=~/.dsh/skills/pen-dev

# headless: create/edit a .pen file
$SKILL/pen.sh multi design.pen < build.js

# live: edit the canvas open in Pen.app
$SKILL/pen.sh app < build.js

# what the user has selected in Pen.app right now
$SKILL/pen.sh sel
$SKILL/pen.sh seltree      # selected subtree as a readable tree

# extract screenshots so you can look at them
$SKILL/pen.sh app < build.js | python3 $SKILL/pen-shots.py ./pen-shots
```

The shell takes one tool call per line, so multi-line JavaScript has to arrive as
a single `execute({ input: "..." })` call with the JS escaped. `pen.sh multi` and
`pen.sh app` do that wrapping: a line containing `@call` starts a new `execute`
call, and every chunk runs inside **one** pen session, so globals like
`page = Insert(...)` stay in scope across chunks.

## Pointing at a frame or element

The user disambiguates by **selecting layers in Pen.app** and then asking. The
selection carries node ids, so you act on what was picked rather than guessing
from a name.

```bash
$SKILL/pen.sh sel        # selection + canvas state (ids, names, types)
$SKILL/pen.sh seltree    # the selected subtree as a readable tree
```

`seltree` prints, per selected node, its id, name, type, width/height, fill,
layout and text — enough to read the structure without guessing.

Selection is live: it reflects what the user had selected at that moment. If
`seltree` prints `NO_SELECTION`, ask them to select the layer(s) and try again.

The user's words still decide. A selection narrows the target — "make this
darker" with a card selected means *that card* — but when a selection and the
words disagree, follow the words and confirm. With no selection, a unique name
finds the node:

```js
Get((n,c)=>{c.skipChildren(); return n.name==="Pricing" ? n.id : undefined})
```

## Auth

`pen status` verifies the session. If it reports **Expired / Revoked**, the CLI's
`session-cli.json` token is stale while the desktop app's is refreshed
automatically — copy the fresh one across:

```bash
python3 - <<'PY'
import json
d = json.load(open('/Users/arie/.pencil/session-desktop.json'))
json.dump({"email": d["email"], "token": d["token"]},
          open('/tmp/ph/.pencil/session-cli.json', 'w'))
PY
```

`pen login` is interactive (email plus password or OTP), so the user runs it
themselves if neither token works. `PEN_CLI_KEY` from an org's Developer Keys is
the CI route.

## Workflow

The order matters: **the audit comes before any design work**, because you cannot
inherit a design system you have not looked at.

1. **Read pen's guides.** `read_skill()` gives the core rules;
   `read_skill({path:"execute.md"})` the full API;
   `read_skill({path:"pen-schema.md"})` the TypeScript schema. Topic guides sit
   under `guide/` (`landing-page.md`, `web-app.md`, `mobile-app.md`,
   `components.md`, `design-system.md`).
   **Done when** you know the schema for every node type this design will insert.

2. **Audit the file for an existing design system.** Tokens, themes, components —
   see [Reusing an existing design system](#reusing-an-existing-design-system).
   **Done when** you can name the tokens, themes and components you will reuse,
   or state that the file carries none.

3. **Pick a style** only when the file has no system to inherit, or the user asked
   for a direction. `get_style()` lists ~26 archetypes, `get_style({name})`
   reports the params it needs, `get_style({name, params})` returns concrete
   tokens. **Done when** it returned the colours, fonts, radii and shadows you
   will use.

4. **Set tokens before building** with `SetVariables({...})`, then reference them
   as `"$token"`; use themed values for light/dark. When the file already has
   tokens, add only what is missing. **Done when** every colour, font, radius and
   gap in your plan resolves through a `$name`, and no existing token was
   redefined.

5. **Build one section, then look at it.** Insert a section,
   `TakeScreenshot([id])`, read the image, fix what is wrong, move on.
   Screenshot a node that carries the background — a section with no `fill` of
   its own renders on transparency, and light text on it looks blank.
   **Done when** that section's screenshot shows nothing collapsed, clipped,
   misaligned or invisible.

6. **Scan for problems.** pen reports collapsed and zero-size nodes as it goes;
   this surfaces the rest, including clipping. `root` is the document root,
   interchangeable with `document`:

   ```js
   Get(root, (n,c)=>{ if(c.problems) Print("PROBLEM", n.name, c.problems) })
   ```

   **Done when** the scan prints nothing, or every hit is explained by a
   screenshot.

7. **Clear `placeholder` and save.**

   ```js
   Update(screenId, {placeholder:false})
   Get((n,c)=>{c.skipChildren(); if(n.placeholder) Print("STILL GENERATING:", n.name)})
   ```

   **Done when** the placeholder check prints no `STILL GENERATING` line and the
   `.pen` file is on disk.

8. **Export**, when the user asked for a file:
   `Export([id], "png", "./exports")`, `Export([id], "html-tailwind", "./out.html")`
   or `"html-css"`. **Done when** every path `Export` printed exists on disk.

## Finishing checklist

The completion bar. Every line is checkable, and a design is not done until all
of them pass.

- [ ] Final screenshot reviewed by eye — it looks right, not merely valid
- [ ] `placeholder:false` on every root frame you created or modified
- [ ] No `STILL GENERATING` output from the placeholder check
- [ ] No collapsed or zero-size nodes
- [ ] Clipping confirmed against a screenshot, not just `ctx.problems`
- [ ] CTAs and repeated elements aligned across sibling cards
- [ ] `save()` called in headless mode, and the `.pen` file on disk
- [ ] Every colour, spacing, radius and font traces to a token in the file
- [ ] Every repeated element that a component covers is an instance of it
- [ ] The design-system audit ran before building, not after

## Critical .pen schema rules

The rules that actually break a build.

- **pen's layout is not CSS.** Space comes from `padding` and `gap`, size from
  `fill_container` / `fit_content` or pixels, alignment from `justifyContent` /
  `alignItems`. `margin`, `%`, `calc()` and `alignItems:"stretch"` do not exist.
- **Only `frame` and `group` take children.** Text, shapes and paths are leaves.
- **Layout is single-axis with no wrapping.** A grid is one row frame per row.
- **Frames default to `layout:"horizontal"`** and `fit_content`. A wrapper you
  meant to stack lays its children out in a row instead — set
  `layout:"vertical"`. The mistake survives a board-scale screenshot and shows up
  later, which is why you set layout on every container as you build it.
- **`fill_container`** sizes to the parent; **`fit_content`** sizes to the
  children. A `fit_content` parent whose children are all `fill_container` has
  nothing to size from and collapses.
- **Text carries its own `fill`**, or it renders invisible.
- **Text sizing:** the default `textGrowth:"auto"` is one unwrapped line and
  ignores `width` / `height`. Wrapped copy needs `"fixed-width"` plus a `width` —
  pair it with `width:"fill_container"` and let layout do the measuring. Use
  `"fixed-width-height"` only when the height must be fixed too.
- **Position with layout.** `x` / `y` are ignored inside a flex parent;
  `layoutPosition:"absolute"` opts a child out.
- **`Insert` appends to the parent's children.** To nest, insert into the child's
  id: a label inserted into the parent becomes a sibling, and pen reports the
  button as "collapsed size … no children to size from". That message is the
  tell.
- **`Update` changes properties, not identity.** It cannot change `id`, `type` or
  `ref`; `Replace` swaps a subtree.
- **A copy's descendants get new ids.** Customise them through `descendants` in
  the `Copy` call itself.
- **Instances (`type:"ref"`)** take overrides inline or through `descendants`,
  keyed by child id, `instanceId/childId` path, or a unique descendant name.
  Disable a descendant with `enabled:false`; `Delete` cannot reach inside an
  instance.
- **`Get` needs a path or a visitor.** `Get()` alone throws "Reading the whole
  document without a visitor". `Get(id)`, `Get(id,{depth:0})` and `Get(visitor)`
  all work; a visitor called from the root receives the document's children at
  `depth:0`.
- **Node ids are case-sensitive.** Look an id up rather than transcribing it from
  earlier output.
- **The document root stays clean:** screens, component frames and major
  containers directly under `document`.
- **A failed `execute` returns an `editId`.** Re-issue with `edits` patches
  rather than resending the snippet — the retry runs against a document that may
  have moved on.
- **Artwork is generated, not drawn.** `Generate(nodeId,"svg",prompt)` for logos
  and illustrations, `Generate(nodeId,"ai"|"stock",prompt)` for image fills.
  These land asynchronously and the node keeps `placeholder:true` until they do,
  so check before you screenshot.
- **Images are fills** on a frame or rectangle, not a node type.
- **`placeholder` is a promise.** Set `placeholder:true` on a root frame while
  you work inside it, and clear it when the frame is done — even if something
  failed partway. A frame left flagged shows a permanent "generating" state.

## Reusing an existing design system

A `.pen` file may already carry tokens, themes and components. When it does, that
system is the palette and the component library for the work; a parallel one
breaks consistency with everything else in the file. Reuse stands unless the user
asks for a new look — *"use our new brand colours"*, *"make it completely new"*.

### The audit

One `execute` call answers all four questions:

```js
const vars = GetVariables()
const names = Object.keys(vars.variables || {})
Print("TOKENS:", names.length)
Print(names.join(", "))
Print("THEMES:", JSON.stringify(vars.themes))
Get(n => n.reusable && Print("COMP", n.id, n.name))
Get((n,c)=>{c.skipChildren();Print("FRAME", n.id, n.name)})
```

The frame list tells you what the file is: a design-system board, a component
library, or finished screens.

| Finding | What to do |
| --- | --- |
| Many tokens (`$ci-sem-color-*`, `$brand-*`, `$text-*`) | **Use them.** `fill:"$ci-sem-color-surface-base"` |
| Components (`Button/Primary`, `Nav Item`, `Card`) | **Instance them** with `type:"ref"` instead of rebuilding |
| Both | Full system — inherit everything, invent nothing |
| Tokens but no components | Use the tokens; build components fresh, styled with them |
| Few or none | No system — use `get_style()` and create tokens |

Themes matter: `{"mode":["light","dark"]}` means tokens resolve per theme.
Reference the semantic name (`$ci-sem-color-text-strong`) and both themes stay
correct; a hardcoded hex fixes one and breaks the other.

### Reading before you write

```js
Get("COMPONENT_ID", (n,c)=>Print(n.id, n.name, n.type))   // what an instance contains
Print(GetVariables().variables["ci-sem-color-brand"].value)  // [{value, theme}, …]
```

### Using what you found

- Reference tokens as `"$token"`.
- Instance components with `type:"ref"`, then override:
  `Insert(parent, {type:"ref", ref:"GPnwN", descendants:{"Label":{content:"Start free"}}})`.
  The `descendants` key is the descendant's *name* when unique, otherwise its id.
- Match the file's own spacing and radius scale (`$ci-sem-space-6`,
  `$ci-sem-radius-card`) rather than inventing pixel values. If the file uses
  literal numbers, follow that convention instead.
- Match its naming: `Button/Primary` signals that a family exists.

### When to deviate

Deviate when the user asks, or when the file's system genuinely cannot express
the request — and say so rather than diverging silently. A dark-theme file that
needs a light section gets it through the theme axis, not a hardcoded background.

A variant explores *emphasis* within the same system; the tokens stay shared.

## Reference

Read on demand — this is the depth that would bury the steps above.

| Read | When |
| --- | --- |
| [docs/execute-api.md](docs/execute-api.md) | you need the full `execute` signature, the visitor and `Ctx` types, variables, instances, or async `Generate` |
| [docs/visual-verification.md](docs/visual-verification.md) | a screenshot looks wrong, clipping fires, or CTAs sit at different heights |
| [docs/pen-cli.md](docs/pen-cli.md) | CLI flags, auth flow, token storage, sandbox errors (written against pen CLI v0.3.5; check `pen version`) |
| [docs/variants.md](docs/variants.md) | the user asks for variants, alternatives, or "a few takes" on a design |
| [examples/](examples/) | you want a runnable script: audit, landing page, components, variants board, selection edit |

## Style guidance

- Use a container only when it has a structural or functional purpose — wrapping
  every element in a card is the generic-AI look.
- Reserve accent colour for actions.
- Alternate text-heavy and visual sections, rather than stacking one density.
- One alignment axis per section.
- Body text at 14px or above, with clear size jumps between hierarchy levels.
- Hero = the whole pitch compressed: one idea, one headline, one CTA.
