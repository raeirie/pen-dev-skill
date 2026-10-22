# pen-dev skill

Operate [pen.dev](https://pen.dev) from an AI agent — **without paying for pen's own LLM agent**.

The pen.dev CLI (`@pen.dev/cli`) exposes the same MCP tool surface the desktop app's
agent uses, via `pen interactive`. An agent can drive that surface directly: the
design engine does the rendering, the agent makes the design decisions. No third-party
model runs in the middle, so the work costs nothing beyond the agent you're already
using.

This repo packages that workflow as a **DeepSeek Harness skill**, plus a driver
script that handles the parts agents trip over (authentication, socket paths, sandbox
escapes, screenshot extraction).

```
pen interactive          # pen's own agent — runs a paid model
pen interactive -a desktop   # ← this skill: tools only, you drive it
```

---

## Why this exists

pen.dev's CLI has two ways to use it:

| Mode | Command | What runs | Cost |
| --- | --- | --- | --- |
| Agent mode | `pen --prompt "..."` | pen's bundled Claude/GPT | Billable per token |
| Interactive mode | `pen interactive` | *your* agent drives the tools | Only your agent |

The CLI's own help says it plainly:

> `pen interactive` — Start interactive shell. **Agents should use this mode to design with pen.dev.**

Everything below is built on that second mode.

---

## What's in the box

```
SKILL.md          the skill itself — instructions, schema rules, gotchas
pen.sh            driver: multi | app | sel | seltree
pen-sel.py        resolves the user's Pen.app selection into node ids
pen-shots.py      extracts base64 screenshots from CLI output into PNG files
examples/         runnable example scripts
docs/             deeper reference material
```

---

## Install

### DeepSeek Harness (recommended)

```bash
git clone https://github.com/<you>/pen-dev-skill.git
mkdir -p ~/.dsh/skills
cp -r pen-dev-skill ~/.dsh/skills/pen-dev
```

Skills load from `~/.dsh/skills/` (user scope) or `<project>/.dsh/skills/` (project scope).
The skill is picked up on the next session — no server restart needed.

Verify:

```bash
~/.dsh/skills/pen-dev/pen.sh --help
```

### Other agent harnesses

`SKILL.md` follows the standard Agent Skills format (YAML frontmatter + markdown
body), so it also works with Claude Code, Cursor, and anything else that reads
`SKILL.md` files. The `pen.sh` driver is plain bash + python3 — port it if your
harness differs.

---

## Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js ≥ 22.19 | pen's own requirement |
| `@pen.dev/cli` | `npm install -g @pen.dev/cli` |
| A pen.dev account | free tier is enough |
| Python 3 | only for the helper scripts |

---

## Authentication

The CLI needs a session token. There are three routes, in order of convenience:

**1. Reuse the desktop app's token (recommended).** If you've used Pen.app before, it
already holds a valid session that it refreshes automatically. The driver does this
for you on every headless run — you don't need to do anything. To do it by hand:

```bash
python3 - <<'PY'
import json
d = json.load(open('/Users/arie/.pencil/session-desktop.json'))
json.dump({"email": d["email"], "token": d["token"]},
          open('/tmp/ph/.pencil/session-cli.json', 'w'))
PY
```

This is why the CLI's own token expiring is a non-event: an expired CLI session
heals itself on the next run, as long as Pen.app has been opened at some point.

**2. `pen login`** — interactive email + password or OTP. Use this if the desktop
app was never opened.

**3. `PEN_CLI_KEY`** — an org-scoped key from the Developer Keys section of your
pen.dev org settings. Takes precedence over the stored session. Good for CI.

Check status any time:

```bash
pen status
```

---

## Usage

### Headless — create or edit a `.pen` file

```bash
./pen.sh multi design.pen < build.js
```

No GUI involved. `build.js` holds the design code; `save()` runs at the end.

### Live — edit the canvas open in Pen.app

```bash
./pen.sh app < build.js
```

Changes land in the open document immediately and appear on the canvas as you go.
Requires Pen.app to be running.

### Point at a frame

Select layers in Pen.app, then:

```bash
./pen.sh sel        # what's selected + canvas state
./pen.sh seltree    # the selected subtree as a readable tree
```

The canvas selection is the pointer — it carries node ids, so the agent acts on
exactly what was picked instead of guessing from a name.

### Extract screenshots so you can *look* at the result

```bash
./pen.sh app < build.js | python3 pen-shots.py ./pen-shots
```

Screenshots are how you know the design is actually right. See
[docs/visual-verification.md](docs/visual-verification.md).

---

## The script format

`pen.sh` takes JavaScript that runs inside pen's `execute` tool. The shell is
line-oriented — one tool call per line — so `pen.sh` wraps a multi-line script into
a single `execute({input: "..."})` call.

Use `@call` on its own line to split a script into several `execute` calls inside
**one** session, so ids captured in one chunk are usable in the next:

```js
// chunk 1
page = Insert(document, {type:"frame", name:"Landing", width:1440, ...})

@call

// chunk 2 — `page` is still in scope
hero = Insert(page, {type:"frame", name:"Hero", layout:"vertical", ...})
```

---

## What the skill teaches

The full instructions live in [SKILL.md](SKILL.md). In short, it covers:

- **Auditing for an existing design system first** — tokens, components, themes — and
  reusing them instead of inventing a parallel palette
- **The `.pen` schema** — and the CSS habits that don't transfer to it
- **Reading and writing the canvas** — `Insert`, `Update`, `Replace`, `Copy`,
  `Delete`, `Get`, `SetVariables`, `Generate`, `Export`
- **Components and instances** — `type:"ref"`, `descendants`, and the rules about
  what can and can't be overridden
- **Variant boards** — producing real alternatives, not recolours
- **Verification** — screenshots, clipping checks, collapsed-size checks, and the
  `placeholder` lifecycle
- **The gotchas** — see below

### Gotchas this skill exists to prevent

| Symptom | Cause |
| --- | --- |
| `listen EPERM` / `EINVAL` on the socket | Sandbox blocks `~/.pencil`; socket paths cap at ~104 chars. Run headless with `HOME=/tmp/ph` |
| `Unauthorized` from the API | CLI session token expired. Copy the desktop app's token |
| Button label renders *outside* the button | `Insert` appends to the parent's children — nest it under the button's id |
| Frame collapses to zero | A `fit_content` parent whose children are all `fill_container` |
| Elements stack in a row when you wanted a column | Frames default to `layout:"horizontal"` |
| `fully clipped` on a component instance | Usually a false positive — confirm with a screenshot |
| Frame stuck showing "generating" | `placeholder:false` was never set |
| A new `execute` call can't see an id from the previous one | Separate `pen` invocations don't share globals. Use `@call` chunks in one session |

---

## Documentation

- [SKILL.md](SKILL.md) — the skill itself
- [docs/pen-cli.md](docs/pen-cli.md) — CLI reference: commands, flags, auth, env vars
- [docs/execute-api.md](docs/execute-api.md) — the `execute` tool's full API surface
- [docs/visual-verification.md](docs/visual-verification.md) — screenshots, clipping
  checks, and how to trust what you see
- [docs/architecture.md](docs/architecture.md) — how the pieces fit together
- [examples/](examples/) — runnable scripts

---

## License

MIT — see [LICENSE](LICENSE).

The skill is unofficial. pen.dev is a product of its authors; this repo just teaches
agents how to drive their CLI.
