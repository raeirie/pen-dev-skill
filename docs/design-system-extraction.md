# Building a design system from a finished page

"Extract the design system" means reading a finished page and producing the system
it implies: tokens, components, sections, and the rules behind them. It is the
inverse of [reusing an existing design system](../SKILL.md#reusing-an-existing-design-system)
— there is no system to inherit, so you build one, normalised into the convention
the file already carries.

Read this when the user asks to extract tokens, elements, components or sections
from a page, or to build, extend or normalise a design-system board.

---

## Where the board goes

**Build into the file you extracted from.** The convention is a design-system
frame living alongside the screens: a product file carries a top-level
`<Product> Design System` frame next to the page frames. The system stays in
context whenever the file is opened, and the page's own tokens keep resolving
against it.

Extracting from a page and writing the system elsewhere produces a duplicate the
user did not ask for. They are waiting on the canvas of the file they opened.

Build it **live** (`pen.sh app`) when the user is watching, so they see it land.

A separate file is the exception — an isolated spike the user asked for. Tokens
are per-file: a fresh `.pen` starts with zero, and a system in a separate file
reaches other pages only through `import_library`. A system meant to be the
long-term home is a `.lib.pen` from the start, not imports retrofitted into every
page.

**Write a file the user has open only through the pen engine.** A headless write
leaves the app holding a stale buffer, and its next save overwrites the work.

---

## Procedure

### 1. Confirm the frontmost canvas

`pen.sh app` edits whatever canvas is frontmost in Pen.app — not the file you
extracted from, and not a file you named.

```bash
$PEN/pen.sh sel
```

Read the `- Currently active canvas editor:` path. When it is not the file you
are building into, ask the user to bring that file to the front — one click. A
build launched with a different document in front lands in that document and
reports no error.

**Done when** `pen.sh sel` names the file you are building into, and it still
does after the build.

For reading, prefer headless `--in <path>`: a file switch mid-run cannot change
your source.

### 2. Audit the page

One call answers every question. `examples/06-extract-design-system.js` is the
probe:

```bash
$PEN/pen.sh multi /tmp/audit.pen --in source.pen < $SKILL/examples/06-extract-design-system.js
```

It prints tokens, themes, components, sections, a node census, and every literal
hex used where a token belongs.

The frame list tells you what the file is — a design-system board, a component
library, or finished screens — and therefore which convention to match.

**Done when** you can state the token count, the theme axes, the component list,
the section list, and every raw hex that should have been a token.

### 3. Measure contrast from the extracted values

Compute every foreground/background pairing from the **hex values you extracted**,
not from the image. A 1.27:1 border looks like a normal hairline in a PNG and is
invisible in the render.

```python
def luminance(h):
    h = h.lstrip('#')
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
```

Grades below AA-large are the findings that matter: they explain a real visual
defect — an invisible button border, unreadable muted copy.

**Done when** every pairing has a ratio and a grade, and each failing pair names
the component it breaks.

### 4. Normalise into the file's own layers

Read the existing convention first and mirror it, changing only the product
prefix. A parallel naming scheme breaks consistency with everything else in the
file.

| Layer | Holds | Rule |
| --- | --- | --- |
| `*-raw-*` | primitives | the only layer allowed a literal colour |
| `*-sem-*` | roles | the only names a design or component may reference |
| `*-comp-*` | component geometry | padding, radius, type size |

Normalise the observed values rather than copying them:

- **A raw hex repeated N times** becomes a semantic token (`#111118` × 32 →
  `*-sem-color-surface`). Raw hex leaks are the most common real defect and the
  easiest to prove.
- **A type scale** becomes a named scale. Report sizes that sit off the scale as
  decisions for the user rather than remapping them silently.
- **Spacing with no tokens** is the common case — every gap and padding is a
  literal. Derive the scale, then flag the values that do not fit it.
- **A component repeated across sections** becomes one `reusable: true` frame,
  named in the file's own style (`Button/Primary`, `Nav Link`, `Card/Feature`).
- **A duplicate** — two components with identical fill, radius and padding —
  collapses to one. Say so.

**Done when** every observed value resolves through a token, and the only raw hex
left sits inside the palette specimens that exist to show it. A swatch's whole
job is to display the value, so its hex is correct there and wrong everywhere
else.

### 5. Build the board

Build it as **one chunk**. Helper functions do not survive `@call` boundaries
([`SKILL.md`](../SKILL.md)), so a board built with section and card helpers is a
single `execute` call with no markers.

Mirror the section list of the design system you are matching, and build **only
the sections the extraction evidences**:

| Page has | Section |
| --- | --- |
| Icons | Iconography |
| Charts | Data visualisation |
| Motion | Motion |
| Copy rules | Voice |

A page with none of them gets none of the sections. Building them means inventing
content, which is the opposite of an extraction.

- **Principles are derived, not asserted.** Each rule describes what the page
  already does, with the evidence cited: *"40 text nodes use exactly two
  colours"*. Add a rule when the extraction reveals a pattern the existing rules
  do not cover.
- **Components go in as real components** — `reusable: true` — so a later build
  instances them with `type:"ref"`. Label each specimen with its name; an
  unlabelled row of specimens is unreadable.
- **Set `placeholder:true` on the board root** while building, and clear it when
  the board is done.

**Done when** the problem scan prints nothing and the board is on disk.

### 6. Write the findings

The gap report is the actionable half of the deliverable and the part the user
acts on. Each finding states what was measured, the number, and the fix. Include
bugs found in the **source page** as well as gaps in the system — an invisible
button border, a duplicated component, one action with two labels, a theme axis
that does not exist.

**Done when** every finding has a number and a fix.

---

## Pitfalls

- **`Export` takes node ids, not names.** `Export(["Prism Design System"], …)`
  writes nothing and reports no error. Resolve the id first:
  `id = Get((n,c)=>{c.skipChildren(); return n.name==="…" ? n.id : undefined})[0]`.
- **`TakeScreenshot` in live mode does not match `pen-shots.py`.** Extraction
  prints `NO_SCREENSHOTS` and the image is lost. Use `Export([id], "png", dir)`
  for a file, or run headless.
- **Live edits reach disk only on `save()`.** `pen.sh app` appends `exit()`, not
  `save()`. A board built live lives in Pen.app's memory: the file's mtime does
  not move and a headless read still shows the old content. Run
  `printf 'save()\nexit()\n' | pen interactive -a desktop` to persist, then read
  the file back to confirm.
- **Live-mode `ctx.problems` clipping can be a false positive.** A board can
  report hundreds of clipped nodes in a live session while a headless build of
  the same content into the same file's data reports zero. Confirm by copying the
  target file, building into the copy headless, and scanning that. A board that
  renders correctly is not fixed on the strength of a live scan.
- **A board placed past the canvas edge makes every child report as clipped.** An
  x/y offset outside the document returns clipped for the whole board while the
  content is fine. Place it beside the source page, then re-run the scan.
- **A tall board is sliced before review.** An 8000px PNG downscales past
  legibility, and the vision pass then reports layout that is not there.
- **Vision is a report on layout, not on facts.** It misreads dates, colours,
  counts and labels. Read every value you act on from the file.
- **Merging `.pen` files by editing the JSON is not supported.** App-written and
  CLI-written files can carry different schema versions, and node ids are
  per-document. Build through the pen engine; `Copy` cannot reach across
  documents.
