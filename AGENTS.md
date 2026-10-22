# AGENTS.md

This repo **is** the pen-dev skill. The root is what installs, so `SKILL.md`,
`pen.sh`, the helpers and `docs/` ship as one unit.

## Editing the skill

`SKILL.md` is **always-loaded** context on every run that fires the skill, so each
line added there is paid on every design request. New material starts in `docs/`
behind a row in `SKILL.md`'s Reference table, and moves inline only when a branch
needs it on every run.

Where a rule belongs, and how to word it: [CONTRIBUTING.md](CONTRIBUTING.md).

## Versioning

Bump rules and changelog format: [CHANGELOG.md](CHANGELOG.md#versioning-policy).
The frontmatter `version:` is the single source — the body carries no second copy.

The `description` is public interface: changing it changes when the skill fires,
so it takes a **minor** bump even when no rule moved.

## Before you commit

```bash
bash -n pen.sh && python3 -m py_compile pen-sel.py pen-shots.py
for f in examples/*.js; do node --check "$f" || exit 1; done
./pen.sh multi /tmp/check.pen < examples/02-landscape-page.js \
  | python3 pen-shots.py /tmp/check-shots
```

Then **look at the PNG**. Structural validity is not the bar — a design that
passes every check can still render wrong, and only the image shows it.

**Done when** the checks are silent, the screenshot looks right, and every rule
the change touches has been run against the real CLI rather than reasoned about.
pen ships updates that move this ground: verify with `pen version` and the actual
call before writing a rule down.

## One gotcha

The installed skill may be a symlink to this checkout:

```bash
ls -l ~/.dsh/skills/pen-dev
```

If it is, edits here are live in every new session — no reinstall, and no copy to
keep in sync. If it is a plain directory, edit here and reinstall, or the two
drift.
