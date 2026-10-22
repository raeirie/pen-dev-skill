# Architecture

How the pieces fit together, and why they're arranged this way.

---

## The layers

```
┌──────────────────────────────────────────────────────────┐
│  Agent (Claude Code, DSH, Cursor, …)                     │
│  reads SKILL.md, decides the design, writes JS             │
└───────────────────────────┬──────────────────────────────┘
                            │ bash
┌───────────────────────────▼──────────────────────────────┐
│  pen.sh                                                    │
│  · session token refresh        · socket path workaround   │
│  · @call chunking               · output filtering        │
└───────────────────────────┬──────────────────────────────┘
                            │ stdin
┌───────────────────────────▼──────────────────────────────┐
│  pen interactive                                            │
│  MCP tool surface: execute, get_app_state, get_style,     │
│                     read_skill, browser                   │
└───────────────────────────┬──────────────────────────────┘
                            │ local socket
┌───────────────────────────▼──────────────────────────────┐
│  pen.dev editor engine                                     │
│  .pen files, layout, rendering, components, variables      │
└──────────────────────────────────────────────────────────┘
```

The critical property: **the agent is the design brain.** The engine renders;
the agent decides. Every design decision — the layout, the palette, the copy,
the trade-offs — is made by the agent working directly against pen's tools.

---

## The driver script

`pen.sh` exists because of four things an agent shouldn't have to rediscover.

### 1. Session token refresh

The CLI's token in `~/.pencil/session-cli.json` expires. The desktop app's token
in `~/.pencil/session-desktop.json` is refreshed automatically by the app.

Before each headless run, the driver copies the desktop token into the
throwaway `$HOME`. Result: an expired CLI session heals itself as long as
Pen.app has been opened at some point.

### 2. Socket path

The CLI creates a unix socket at `$HOME/.pencil/socket/pencil-cli.sock`.

Two failure modes:

| Symptom | Cause | Fix |
| --- | --- | --- |
| `listen EPERM: operation not permitted` | Sandbox blocks the real `~/.pencil` | Run with `HOME=/tmp/ph` |
| `listen EINVAL: invalid argument` | Socket path exceeds ~104 chars | Run with a short `HOME` |

The driver runs headless mode with `HOME=/tmp/ph` — short enough for the socket
limit, and a scratch directory the sandbox allows.

App mode (`-a desktop`) is different: it only *connects* to the app's existing
socket, so it must use the real `$HOME`.

### 3. `@call` chunking

The shell is line-oriented: one tool call per line. Multi-line JavaScript has to
be JSON-escaped into a single `execute({input: "..."})`.

The driver takes a plain `.js` file and does the wrapping. A line containing
`@call` starts a new `execute` call, but all calls share **one** pen session —
so globals captured in chunk one are live in chunk two:

```js
page = Insert(document, {type:"frame", name:"Landing", width:1440})
@call
hero = Insert(page, {type:"frame", name:"Hero", layout:"vertical"})
```

Without this, each chunk would need a fresh `pen` process and lose every id.

### 4. Output filtering

The CLI prints a version-update banner, box-drawing characters, and ANSI
escapes. The driver strips them so the agent reads clean output.

---

## The helper scripts

### `pen-shots.py`

`TakeScreenshot` returns base64 PNGs inside the tool response. This extracts
them into real files:

```bash
./pen.sh app < build.js | python3 pen-shots.py ./pen-shots
```

Named after the node id, so `pen-shots/ap2hQ.png` is frame `ap2hQ`.

### `pen-sel.py`

The user's canvas selection is the pointer to a frame. `get_app_state()` reports
it as `Selected nodes: <id> (frame): <name>`.

`pen.sh seltree` resolves that into a readable tree of the selected subtree:
ids, names, types, geometry, fill, layout, and text content. Two pen calls —
one for the app state, one to dump the subtree.

This is what makes *"point at this and change it"* work: the selection carries
node ids, so the agent acts on exactly what was picked instead of matching on a
name.

---

## The skill file

`SKILL.md` is the part a model reads on every run. Its structure, top to bottom:

| Section | Purpose |
| --- | --- |
| Frontmatter | `name` + `description` — the trigger the agent routes on |
| Two modes | Headless vs. live app, and the sandbox workarounds each needs |
| Quick start | Copy-pasteable invocations, plus why `@call` exists |
| Pointing at a frame | The selection workflow |
| Auth | The three routes, in order of convenience |
| Workflow | The ordered steps, each with a completion criterion |
| Finishing checklist | The completion bar for a design |
| Critical .pen schema rules | The rules that break builds |
| Reusing an existing design system | The audit, and what to do with what it finds |
| Reference | Pointers into `docs/`, each with the situation that fires it |
| Style guidance | Design judgement |

Three things moved out of `SKILL.md` and behind pointers, because only some runs
need them: variants boards and unequal-height cards
([docs/variants.md](variants.md)), the screenshot and clipping checks
([docs/visual-verification.md](visual-verification.md)), and the full `execute`
API ([docs/execute-api.md](execute-api.md)).

### Why the description matters

The frontmatter `description` is the skill's **context pointer** — it is always
loaded, so it must carry the trigger branches. It is the only thing the router
reads to decide whether the skill applies.

It is written to fire on: designing a pen.dev screen, page, mockup, dashboard or
component; changing whatever layer is selected in Pen.app; exporting to PNG or
HTML.

### Model-invoked vs user-invoked

The skill omits `disable-model-invocation`, so it is **model-invocable**: the
agent loads it on its own when a request matches. It also stays user-invocable —
`/pen-dev` works.

Model-invocation is the right choice here because the point of the skill is that
the agent reaches for it autonomously, without the human remembering it exists.

---

## Design decisions worth keeping

**Screenshot before claiming done.** A structurally valid design can still look
wrong. The screenshot loop is what turns a plausible result into a good one.

**Trust pixels over tool output for instances.** `ctx.problems` reports false
clipping on `ref` instances. Treating those reports as truth sends the agent
chasing bugs that don't exist.

**Audit before building, not after.** Reusing a file's design system is only
possible if you know it exists before you start. Retrofitting means re-colouring
work that's already done.

**One session, chunked.** Splitting a design into separate `pen` invocations
loses ids. The `@call` mechanism exists so a build can be staged without
losing state.

**The `placeholder` flag is a promise.** Set it on while working, clear it when
done. Leaving it on shows a permanent "generating" state in the app.

---

## Extending it

**A new helper script:** add it to `pen.sh` as a new mode, and document it in
the quick-start block.

**A new design rule:** add it to "Critical .pen schema rules" if it prevents a
break, or to "Style guidance" if it's a judgement call. Rules that prevent
breaks belong near the schema rules; taste belongs at the end.

**A new topic:** the skill stays short by pushing detail into `docs/` and
pointing at it. Anything an agent needs on *every* run belongs inline; anything
only some runs need gets a row in the Reference table, worded for the situation
that fires it.

**Testing a change:** drive a live document.

```bash
./pen.sh app < test.js          # write to a scratch frame
./pen.sh app < test.js | python3 pen-shots.py ./pen-shots
```

Always screenshot the result. Every bug in this skill was found by looking at a
render, not by reading code.
