# pen-dev skill

Design in [pen.dev](https://pen.dev) by talking to your agent.

You describe what you want. Your agent designs it — real frames, real layout, real
components — directly on the pen.dev canvas or into a `.pen` file. You review the
result as an image, say what to change, and it iterates.

No prompt engineering, no CLI flags, no design tool to learn.

```
You:    Use pen-dev to design a pricing page for a B2B analytics tool.
Agent:  [audits your file for an existing design system]
        [builds three pricing tiers]
        [screenshots it, notices the CTAs don't line up, fixes them]
        Done — here's the screenshot. Want the middle tier emphasized?
```

Latest release: **[v0.2.0](CHANGELOG.md#020--2026-10-22)** ·
[CHANGELOG](CHANGELOG.md) · [Releases](https://github.com/raeirie/pen-dev-skill/releases)

---

## Contents

- [Who this is for](#who-this-is-for)
- [What it does](#what-it-does)
- [Before you start](#before-you-start) · [Open Pen.app once](#open-penapp-once-and-leave-it-open-while-you-design)
- [Install](#install) — [agent-first](#agent-first-install-recommended) · [one-line](#one-line-install) · [manual](#manual-install)
- [Use it](#use-it) — [say what you want](#say-what-you-want-in-design-terms) · [point at a node](#point-at-a-node) · [review](#reviewing-the-result)
- [Troubleshooting](#troubleshooting)
- [For agents](#for-agents)
- [For developers](#for-developers)
- [Documentation](#documentation) · [License](#license)

---

## Who this is for

This README is ordered by who you probably are:

| If you want to… | Read |
| --- | --- |
| **Use it** — get a design made | [Install](#install) → [Use it](#use-it) |
| **Fix it** — something went wrong | [Troubleshooting](#troubleshooting) |
| **Change it** — edit the skill or port it | [For developers](#for-developers) |
| **Be the agent** — you're a model reading this | [For agents](#for-agents) |

---

## What it does

The pen.dev CLI has two ways to work:

| Mode | Who designs |
| --- | --- |
| `pen --prompt "..."` | pen's own bundled model |
| `pen interactive` | **your** agent, using pen's tools |

This skill is the second one. Your agent gets pen's full design tool surface —
insert, update, layout, components, tokens, screenshots, export — and makes every
design decision itself. pen's engine does the rendering.

That matters because your agent already knows your codebase, your brand, and what
you asked for. It doesn't need a second model in the middle.

**What you can ask for**

- New screens — landing pages, pricing, dashboards, onboarding, settings
- Edits to an existing `.pen` file, or to the canvas open in Pen.app
- Variants — *"give me three takes on this hero"*
- Component and design-system work — buttons, cards, nav, tokens
- A design system extracted from a finished page — *"extract the design system from this page"*
- Exports — PNG, or HTML with Tailwind or plain CSS

---

## Before you start

Four things, once.

| Requirement | Why |
| --- | --- |
| **Node.js ≥ 22.19** | pen's own requirement |
| **`@pen.dev/cli`** | the engine the skill drives |
| **A pen.dev account** | the free tier is enough |
| **Python 3** | only for the two helper scripts |

```bash
npm install -g @pen.dev/cli
pen version          # should print a version
```

### Open Pen.app once (and leave it open while you design)

This is the step people skip, so it gets its own heading.

**With Pen.app running**, your agent edits the document you're looking at. You see
changes land on the canvas as it works. That's the good experience — use it.

**With Pen.app closed**, the agent still works, but headless: it builds a `.pen`
file you open afterwards. Fine for CI and batch jobs, less fun for reviewing.

So: **open Pen.app and leave it on the document you want changed.** Then check the
connection before you ask for anything:

```bash
~/.dsh/skills/pen-dev/pen.sh sel
```

- Prints your selection (or `NO_SELECTION`) → connected. You're good.
- Prints `Could not connect to pen.dev desktop app` → Pen.app isn't running. Open
  it, or tell your agent to work headless instead.

Opening Pen.app once also solves authentication: it holds a session token that
refreshes itself, and the skill reuses it. You should never have to run
`pen login` if you've opened the app before. Details in
[docs/pen-cli.md](docs/pen-cli.md#auth-flow).

> **Working headless on purpose?** Pen.app is not required. Skip this section —
> see [For developers](#for-developers).

---

## Install

### Agent-first install (recommended)

Point your agent at this repo and let it do the work:

```
Install the pen-dev skill for me: https://github.com/raeirie/pen-dev-skill

Check that Node 22+ and the pen CLI are present, install the skill into your
own skills directory, and tell me what I need to do next.
```

The agent reads the repo, runs the installer (or copies the files), verifies the
`pen` CLI, and reports back. This is the intended path — the repo is small and
plain, so there's nothing to interpret.

Then ask for a design in the same session, or start a new one.

### One-line install

Prefer to run it yourself:

```bash
curl -fsSL https://raw.githubusercontent.com/raeirie/pen-dev-skill/main/install.sh | bash
```

The script finds your harness's skill directory, installs there, and checks that
the `pen` CLI is present.

### Manual install

DeepSeek Harness:

```bash
git clone https://github.com/raeirie/pen-dev-skill.git
mkdir -p ~/.dsh/skills
cp -r pen-dev-skill ~/.dsh/skills/pen-dev
```

Skills load from `~/.dsh/skills/` (user scope) or `<project>/.dsh/skills/`
(project scope), and are picked up on the next session — no restart needed.

Verify:

```bash
~/.dsh/skills/pen-dev/pen.sh --help
```

### Other harnesses

`SKILL.md` is standard Agent Skills format (YAML frontmatter + markdown), so it
also works with Claude Code, Cursor, and anything else that reads `SKILL.md`. The
driver is plain bash + python3 — port it if your harness differs.

```bash
SKILL_ROOT=~/.claude/skills ./install.sh     # Claude Code
SKILL_ROOT=./.dsh/skills     ./install.sh     # project-scoped, for DSH
```

Pin a version with a `#ref` suffix:

```bash
REPO_URL="https://github.com/raeirie/pen-dev-skill.git#v0.1.1" ./install.sh
```

---

## Use it

Talk to your agent. Name the skill, describe the design.

```
Use pen-dev to design a pricing page for a B2B analytics tool.
```

That's the whole interface. The agent loads the skill, reads your file, and starts
designing. There is no command to memorize and no `./pen-dev` executable — the
skill is resolved by name.

### Say what you want, in design terms

You don't need to speak pen's schema. Talk like you'd talk to a designer:

```
Use pen-dev to design a settings page. Three sections: profile, notifications,
billing. Calm, dense, no cards — we're not a consumer app.

Use pen-dev to redesign this dashboard header. It's too busy; keep the KPIs,
drop the decorative icons.

Use pen-dev to give me three variants of this hero. Same copy, different emphasis.
```

Vague is fine as a start. The agent will read your file first and ask if it needs
to.

### Point at a node

The most precise way to get an edit right is to **select the thing in Pen.app**,
then describe the change. The selection carries the node ids, so the agent edits
exactly what you picked instead of guessing which "card" you meant.

**How to select:** click the layer in Pen.app — on the canvas or in the layers
panel, whichever is easier. Shift-click to select several. Select a parent frame
if you want the whole section changed; drill into a child if you want just the
label.

Then just talk:

```
Make this darker.                              ← card selected
This should be the primary action.             ← button selected
Tighten the spacing between these three.       ← three cards selected
This heading is too big at this width.         ← text node selected
```

Some things worth knowing:

- **Selection is live.** It reflects what's selected at the moment you ask. If
  you select something, get distracted, then type a request, you may be pointing
  at the wrong node — reselect first.
- **Select the smallest thing that covers the change.** Selecting the whole page
  and saying *"make this darker"* gives the agent a page to reason about.
  Selecting the card gives it a target.
- **Nested nodes work.** Selecting a label inside a button is fine — the agent
  sees the path up to the root and knows the context.
- **No selection is fine too**, as long as your words are unambiguous. *"Change
  the hero headline to …"* works on a name. Selection just removes the guessing.
- **Selection narrows, words decide.** If you select the pricing section but say
  *"make the hero darker"*, the agent should follow your words and confirm. When
  the two disagree, say which you meant.

If the agent reports no selection when you have one, click the layer again and
re-ask — don't let it guess. You can check what the agent will see yourself:

```bash
~/.dsh/skills/pen-dev/pen.sh seltree
```

That prints the selected subtree — ids, names, types, size, fill, layout, text —
which is exactly the picture the agent gets.

### What the agent does on its own

You don't have to manage any of this — but it explains the behaviour you'll see:

1. **Audits your file for a design system first** — existing tokens, themes, and
   components. If your file already has a palette, it uses it. It will not invent
   a parallel one unless you ask for a new look.
2. **Sets tokens before building** — colours, spacing, radii, type.
3. **Builds section by section and screenshots each one**, looking at the image
   before moving on. That's why it sometimes pauses.
4. **Checks its own work** — collapsed frames, clipping, alignment across cards.
5. **Saves and reports.** For headless work it writes the `.pen` file; either way
   it exports if you asked.

### Reviewing the result

You'll get a screenshot. Look at it — that's the point of the whole loop. Then:

```
Looks good. Export it as PNG.
```

```
The middle tier should feel like the obvious choice. Make it taller and give it
the accent border.
```

The agent edits in place and screenshots again. Iterate until it's right.

### Choosing where the result goes

| You want | Say |
| --- | --- |
| Edits on the canvas you're looking at | *"…in the file I have open"* (with Pen.app running) |
| A `.pen` file to open later | *"…and save it to `pricing.pen`"* |
| A PNG | *"Export it as PNG"* |
| Code | *"Export it as HTML with Tailwind"* |

---

## Troubleshooting

Start with the symptom you actually see.

| What you see | What's happening | Fix |
| --- | --- | --- |
| *"Could not connect to pen.dev desktop app"* | Pen.app isn't running | Open Pen.app, or ask for headless work |
| `Unauthorized` / auth errors | CLI session token expired | Open Pen.app once — the skill reuses its token. Or `pen login` |
| The agent says it can't find what you meant | No selection, or an ambiguous name | Select the layer in Pen.app and ask again |
| A frame shows a permanent "generating" state | `placeholder` was never cleared | Ask the agent to finish that frame — it's a known failure mode |
| Nothing appears on the canvas | You're in headless mode | Ask it to work in the open file instead, or open the `.pen` it saved |
| Output looks structurally fine but wrong | It didn't look at the screenshot | Ask it to screenshot and check before continuing |
| `listen EPERM` / `EINVAL` on the socket | Sandbox blocked `~/.pencil`, or the socket path is too long | Headless runs need a short `HOME` — the driver handles it; see [docs/pen-cli.md](docs/pen-cli.md#sandbox-notes) |

Two things you can always check yourself:

```bash
pen status                      # auth state and account
~/.dsh/skills/pen-dev/pen.sh sel  # is the live app connected, and what's selected
```

**If a design came out wrong**, the most useful feedback is visual and specific:
*"the CTAs don't line up across the three cards"* beats *"make it better"*. The
agent can act on the first one.

---

## For agents

If you're a model reading this to decide whether to use the skill: **read
[SKILL.md](SKILL.md)** — that's the operating manual, not this file. This README
is for the human.

`SKILL.md` opens with the two modes and the four-command quick start, then the
workflow with a completion criterion per step, the finishing checklist, the
schema rules that break builds, and the design-system audit. Depth lives in
[docs/](docs/) behind pointers; read one when the matching situation comes up.

You do not need the driver internals below to operate the skill — `SKILL.md`
tells you which command to run.

---

## For developers

Everything below is the plumbing. You don't need it to use the skill.

### The driver

```bash
SKILL=~/.dsh/skills/pen-dev

$SKILL/pen.sh multi out.pen [--in in.pen] < build.js   # headless: build a file
$SKILL/pen.sh app < build.js                           # live: edit open canvas
$SKILL/pen.sh sel                                      # selection + canvas state
$SKILL/pen.sh seltree                                  # selected subtree as a tree
```

`multi` appends `save()` and runs headless with `HOME=/tmp/ph` — the DSH sandbox
blocks the real `~/.pencil`, and unix socket paths cap at ~104 characters. `app`
uses the real `HOME` because it only *connects* to the running app's socket.

### The script format

pen's interactive shell is line-oriented: one tool call per line. Multi-line
JavaScript must arrive as a single `execute({ input: "..." })` call, JSON-escaped.
`pen.sh` does that wrapping for you.

Put `@call` on its own line to split a script into several `execute` calls
**inside one session**, so ids stay in scope:

```js
page = Insert(document, {type:"frame", name:"Landing", width:1440, layout:"vertical"})

@call

hero = Insert(page, {type:"frame", name:"Hero", layout:"vertical"})
```

Separate `pen` invocations do not share globals. One session, `@call` chunks.

### The tool surface

`execute` exposes `Insert`, `Copy`, `Update`, `Replace`, `Move`, `Delete`,
`Generate`, `SetVariables`, `GetVariables`, `Get`, `Print`, `TakeScreenshot`,
`Export`, `FindEmptySpace`. The shell also has `get_app_state`, `get_style`,
`read_skill`, and `browser`.

Full API: [docs/execute-api.md](docs/execute-api.md). CLI reference:
[docs/pen-cli.md](docs/pen-cli.md). How the layers fit:
[docs/architecture.md](docs/architecture.md). The verification checks:
[docs/visual-verification.md](docs/visual-verification.md). Building variants:
[docs/variants.md](docs/variants.md). Extracting a design system from a finished
page: [docs/design-system-extraction.md](docs/design-system-extraction.md).

### Screenshots

`TakeScreenshot` returns base64 PNGs inside the CLI's text output.
`pen-shots.py` extracts them to files so they can be looked at:

```bash
$SKILL/pen.sh app < build.js | python3 $SKILL/pen-shots.py ./pen-shots
```

### Keeping the installed copy in sync

The repository root **is** the skill, so installing is a copy. Edit in the repo,
not in `~/.dsh/skills/`, or the two drift.

**Symlink (one copy, no drift)** — use this if you're changing the skill:

```bash
ln -s ~/Projects/skill/pen-dev-skill ~/.dsh/skills/pen-dev
```

**Copy (stable install)** — use this to pin it:

```bash
cd ~/Projects/skill/pen-dev-skill
cp SKILL.md pen.sh pen-sel.py pen-shots.py ~/.dsh/skills/pen-dev/
```

### What belongs where

The skill is what an agent needs on **every** run. Depth goes in `docs/` and gets
linked. If a detail only matters for one kind of task, it doesn't belong in
`SKILL.md`. See [CONTRIBUTING.md](CONTRIBUTING.md) for a human, or
[AGENTS.md](AGENTS.md) for an agent working in this repo.

CI runs on every push and checks the things that break silently: frontmatter is
valid YAML with a kebab-case name and a routable description, internal doc links
resolve, the shell and Python helpers parse, the examples are valid JavaScript,
and the installer actually installs.

**Releases** are GitHub releases with tags. The one-line install points at `main`.
The installed `SKILL.md` carries that revision's `version:` field, so an agent can
tell which version it's running.

---

## Documentation

- [SKILL.md](SKILL.md) — the operating manual the agent follows
- [CHANGELOG.md](CHANGELOG.md) — what changed in each version
- [docs/pen-cli.md](docs/pen-cli.md) — CLI commands, flags, auth, sandbox notes
- [docs/execute-api.md](docs/execute-api.md) — the full `execute` API
- [docs/visual-verification.md](docs/visual-verification.md) — the checks a screenshot catches
- [docs/variants.md](docs/variants.md) — variants boards and unequal-height cards
- [docs/design-system-extraction.md](docs/design-system-extraction.md) — building a design system from a finished page
- [docs/architecture.md](docs/architecture.md) — how the pieces fit
- [examples/](examples/) — runnable scripts
- [CONTRIBUTING.md](CONTRIBUTING.md) — where a new rule belongs
- [AGENTS.md](AGENTS.md) — the same for an agent working on this repo

---

## License

MIT — see [LICENSE](LICENSE).

The skill is unofficial. pen.dev is a product of its authors; this repo just
teaches agents how to drive their CLI.
