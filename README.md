# pen-dev skill

Operate [pen.dev](https://pen.dev) from an AI agent.

The pen.dev CLI (`@pen.dev/cli`) exposes the same tool surface the desktop app's
agent uses, via `pen interactive`. An agent can drive that surface directly: the
design engine does the rendering, the agent makes the design decisions.

This repo packages that workflow as a **DeepSeek Harness skill**, plus a driver
script that handles the parts agents trip over (authentication, socket paths,
sandbox escapes, screenshot extraction).

```
pen interactive -a desktop   # ← this skill: the agent drives pen's tools
```

Latest release: **[v0.1.0](CHANGELOG.md#010--2026-10-22)** ·
[CHANGELOG](CHANGELOG.md) · [Releases](https://github.com/raeirie/pen-dev-skill/releases)

---

## Why this exists

pen.dev's CLI has two ways to use it:

| Mode | Command | Who drives it |
| --- | --- | --- |
| Agent mode | `pen --prompt "..."` | pen's own bundled model |
| Interactive mode | `pen interactive` | *your* agent, using pen's tools |

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

### One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/raeirie/pen-dev-skill/main/install.sh | bash
```

The script detects where your harness keeps skills, installs there, checks that
the `pen` CLI is present, and prints the next steps.

### Manual install (DeepSeek Harness)

```bash
git clone https://github.com/raeirie/pen-dev-skill.git
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

Point the installer at a different root:

```bash
SKILL_ROOT=~/.claude/skills ./install.sh     # Claude Code
SKILL_ROOT=./.dsh/skills     ./install.sh     # project-scoped, for DSH
```

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

## Maintaining this skill

The repository root **is** the skill — `SKILL.md` sits at the top level next to
the scripts it references. That means the install is a copy, and a fork works
exactly like the original.

**Keep the installed copy in sync with the repo.** If you edit `SKILL.md` in
`~/.dsh/skills/pen-dev/`, the repo doesn't know. Two ways to avoid the drift:

*Symlink (one copy, no drift):*

```bash
ln -s ~/Projects/skill/pen-dev-skill ~/.dsh/skills/pen-dev
```

Edit in the repo, and the installed skill updates with it. This is the setup to
use if you're changing the skill.

*Copy (stable install):*

```bash
cd ~/Projects/skill/pen-dev-skill
cp SKILL.md pen.sh pen-sel.py pen-shots.py ~/.dsh/skills/pen-dev/
```

Use this if you want the installed skill pinned and unaffected by repo changes.

**CI runs on every push** and checks the things that break silently: frontmatter
is valid YAML with a kebab-case name and a routable description, internal doc
links resolve, the shell and Python helpers parse, the examples are valid
JavaScript, and the installer actually installs.

**Releases:** each version is a GitHub release with a tag. The one-line install
points at `main`, so it always gets the latest. Pin to a specific version with a
`#ref` suffix:

```bash
REPO_URL="https://github.com/raeirie/pen-dev-skill.git#v0.1.0" ./install.sh
```

The installed `SKILL.md` then carries that version's `version:` field, so an
agent can tell which revision it is running.

**What belongs in the skill vs. the docs:** the skill is what an agent needs on
*every* run. Depth goes in `docs/` and gets linked. If a detail is only needed
for one kind of task, it shouldn't be in the always-loaded `SKILL.md`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the rules on where a new rule belongs
and how to verify it.

---

## Documentation

- [SKILL.md](SKILL.md) — the skill itself
- [CHANGELOG.md](CHANGELOG.md) — what changed in each version
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
