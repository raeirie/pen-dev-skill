# Contributing

## The rule

**Every change is verified by looking at a render, not by reading code.**

Every bug in this skill was found by screenshotting a design and seeing something
wrong — a toggle beside a card instead of above it, buttons at different heights,
a frame stuck on "generating". Structural checks caught some; the rest were only
visible as pixels.

So: drive a live document, screenshot the result, look at it.

```bash
./pen.sh app < your-test.js
./pen.sh app < your-test.js | python3 pen-shots.py ./pen-shots
```

## Adding a rule to the skill

Ask where it belongs:

| Kind of rule | Where it goes |
| --- | --- |
| Prevents a break (schema, API) | "Critical .pen schema rules" |
| A judgement call (taste) | "Style guidance" |
| A step in the process | "Workflow", with a completion criterion |
| A completion bar | "Finishing checklist" |
| Deep reference | `docs/`, linked from the skill |

**Every workflow step ends on a checkable criterion.** "Be consistent with the
design system" is unactionable; "every colour traces back to a token in the
file" is checkable. Prefer the second.

**Write the positive.** "Don't forget to clear the placeholder" pulls the
failure into mind; "clear the placeholder when the frame is done" lands on the
action.

**One trigger per branch.** If two words name the same case, use one.

## Adding a helper script

Add it to `pen.sh` as a new mode, document it in the quick-start block, and
add an example under `examples/`.

## Style of the docs

- Lead with what the reader does, not with background
- Short sentences. Concrete examples over prose.
- No marketing voice. Say what the thing does.
- Cross-link rather than repeat — a fact that appears twice goes stale twice

## Testing a change to the driver

The driver is bash 3.2 compatible (macOS default). Keep it that way:
`${ARR[@]+"${ARR[@]}"}` instead of `"${ARR[@]}"` for possibly-empty arrays.

```bash
# headless round-trip
./pen.sh multi /tmp/test.pen < examples/02-landscape-page.js
```

## Cutting a release

Versions are for the **skill**, not the pen.dev CLI. A `SKILL.md` change can
break a working setup even when no code moved.

```bash
# 1. bump the version in SKILL.md frontmatter
#    (version: 0.2.0)
# 2. add a section to CHANGELOG.md under a new heading
# 3. commit, tag, push
git commit -am "Release v0.2.0"
git tag -a v0.2.0 -m "v0.2.0"
git push && git push --tags

# 4. publish the GitHub release
gh release create v0.2.0 --generate-notes --title "v0.2.0"
```

Keep the `version:` in `SKILL.md` frontmatter and the CHANGELOG heading in step.
The frontmatter version is what an agent can read to tell which revision it is
running.

## Pull requests

1. Say what broke and what you changed
2. Include a screenshot if the change affects visual output
3. Note anything you found but did not fix
