# Changelog

All notable changes to this skill are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

Versions are for the **skill**, not the pen.dev CLI. A `SKILL.md` change is a
change to the instructions an agent follows, so it can break a working setup
even when no code moved.

---

## [Unreleased]

### Changed

- README restructured around who is reading it. The old Usage section documented
  `pen.sh` flags, the `@call` script format and screenshot piping — plumbing only
  an agent or maintainer needs — where a first-time human expected to find out
  what to ask for. Usage is now "talk to your agent, describe the design", and the
  driver details moved to a "For developers" section.
- Added a contents block, and an explicit "Open Pen.app once" step: without the
  app running the skill works headless, which is a different experience and the
  usual reason a first run looks like nothing happened.
- Added a "Point at a node" section covering how to select layers in Pen.app,
  what selection does and does not decide, and how to check it with
  `pen.sh seltree`.
- Install now leads with an agent-first prompt (point your agent at the repo);
  the one-line, manual and other-harness paths follow.
- Troubleshooting is now symptom-first, so a user can search for what they see.
- README's "For agents" section listed seven rules that `SKILL.md` already owns,
  so it was a second copy waiting to drift. It now points at `SKILL.md` and
  describes what is there.

- **`SKILL.md` rewritten against a writing-for-agents audit.** Every rule it
  carried is still there; the structure and wording changed, and three factual
  errors went with them (see Fixed).
  - The description leads with the task ("Design in pen.dev from the terminal")
    and names two branches instead of five overlapping synonyms: making a
    design, and changing the selected layer in Pen.app. Export stays in the
    description as part of a design request rather than a branch of its own.
  - Workflow steps each end on a checkable **Done when** criterion. Three were
    vague or absent (read the guides, pick a style, clear placeholder and
    save); they are now falsifiable.
  - `placeholder` was stated three times and the design-system audit twice. Each
    now has one home: the schema rule states the promise, the workflow step
    states the check, the audit section states the audit.
  - Prohibitions rewritten as the positive target ("use a container only when
    it has a structural purpose" rather than "don't wrap everything in a card").
  - `docs/visual-verification.md` lost its own copy of the style guidance and of
    the finishing checklist; both live in `SKILL.md`.

### Fixed

- **`Get` rule was wrong.** `SKILL.md` claimed `Get("id", {depth:0})` throws
  without a visitor. Verified against pen CLI v0.3.5: only a bare `Get()`
  throws. `Get(id)`, `Get(id, {depth:0})` and `Get(visitor)` all work. The
  old wording would have pushed an agent into verbose visitor callbacks for a
  simple node read.
- **Screenshotting a fill-less section hides light text.** `examples/02` shot
  the `hero` frame, which carries no `fill`, so it rendered on transparency and
  the white headline vanished from the PNG while looking correct in the app.
  The example now shoots the page frame, and the screenshot rule states that
  the target must own the background.
- **Version drift.** The frontmatter said `0.1.1` while the body said
  "Skill version 0.1.0". The body line is gone; the frontmatter is the single
  source.
- **Undefined `root` in examples.** `Get(root, …)` appeared in `SKILL.md` and
  `docs/visual-verification.md` without ever saying what `root` is. It is the
  document root, same as `document`; both now say so.

### Added

- `docs/variants.md` — variants boards, the three-variant rule, the
  screen-level check, and the unequal-height card technique. Disclosed out of
  `SKILL.md` behind a Reference row, since only variant requests need it.
- `SKILL.md` gains a Reference table: one row per `docs/` file, worded for the
  situation that fires it.

### Removed

- `SKILL.md`'s "Reading an existing project before changing it" section, which
  repeated the audit. Its one unique detail — how to inspect a component before
  instancing it — moved into the audit section.
- `SKILL.md`'s "Aligning CTAs across sibling cards" and "Making a variant"
  sections, moved to `docs/variants.md`.

---

## [0.1.1] — 2026-10-22

### Fixed

- `install.sh` now supports pinning a version or branch via a `#ref` suffix on
  `REPO_URL` (e.g. `REPO_URL=…#v0.1.0`). v0.1.0 documented pinning but did not
  implement it — the ref was passed straight to `git clone` as part of the URL
  and failed.

---

## [0.1.0] — 2026-10-22

First release. The skill, the driver script, and the documentation, built by
driving a real pen.dev project end to end.

### Added

**The skill**

- `SKILL.md` — the agent-facing instructions: workflow, `.pen` schema rules,
  component and instance semantics, variant construction, and the verification
  loop.
- Design-system audit as a numbered workflow step, run *before* any design
  work, with a decision table for what to do with what it finds.
- A finishing checklist that makes "done" checkable rather than a matter of
  judgement.
- Reference sections for the failure modes found in practice: the
  sibling-vs-child insert bug, circular sizing, `layout` defaults, instance
  clipping false positives, and the `placeholder` lifecycle.

**The driver**

- `pen.sh` with four modes:
  - `multi` — headless; run a script against a `.pen` file and save it.
  - `app` — live; edit the canvas open in Pen.app.
  - `sel` — report the current selection and canvas state.
  - `seltree` — dump the selected subtree as a readable tree.
- Session-token refresh from the desktop app's token, so an expired CLI
  session heals on the next run.
- Socket-path workaround: headless mode runs with a short `HOME`, because the
  CLI's socket lives under `~/.pencil/socket` (commonly sandboxed) and unix
  socket paths cap at ~104 characters.
- `@call` chunking, so a script can be split into several `execute()` calls
  inside one session and keep ids in scope across them.

**The helpers**

- `pen-sel.py` — resolves the user's Pen.app selection into node ids, which is
  how a user points at a specific frame.
- `pen-shots.py` — extracts the base64 screenshots pen returns into PNG files,
  so the agent can actually look at what it built.

**Documentation**

- `README.md` — what the skill is, install, usage, and maintenance.
- `docs/pen-cli.md` — CLI reference: commands, flags, auth, environment
  variables, token storage, sandbox behaviour.
- `docs/execute-api.md` — the `execute` tool's full API surface, with the
  rules that bite.
- `docs/visual-verification.md` — the screenshot loop, structural checks, and
  the completion bar.
- `docs/architecture.md` — how the layers fit together and why.
- `CONTRIBUTING.md` — where a new rule belongs and how to verify it.

**Examples**

- `01-audit-design-system.js` — find tokens, components and themes first.
- `02-landscape-page.js` — build a landing page from scratch.
- `03-components.js` — build a component, instance it, override it five ways.
- `04-variants-board.js` — a three-variant board with the trade-off written out.
- `05-edit-selection.js` — act on the user's current selection.

**Packaging**

- `install.sh` — one-line install for DSH, Claude Code, or any harness that
  reads `SKILL.md` files. Detects the skill root, installs, and checks that the
  `pen` CLI is present.
- GitHub Actions CI validating frontmatter, internal doc links, script syntax,
  example validity, and the installer itself.

---

## Versioning policy

| Change | Bump |
| --- | --- |
| New rule, section, example, or doc | patch |
| Workflow reordered, or a rule's wording changed | patch |
| A rule removed or its meaning changed | minor |
| `SKILL.md` frontmatter description changed | **minor** — it changes how the agent routes |
| Script interface changed (`pen.sh` modes, flags) | **major** |
| Minimum pen.dev CLI version raised | **major** |

The frontmatter is treated as public interface: it is the only thing the
router reads, and changing it can silently stop the skill from being selected.

[Unreleased]: https://github.com/raeirie/pen-dev-skill/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/raeirie/pen-dev-skill/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/raeirie/pen-dev-skill/releases/tag/v0.1.0
