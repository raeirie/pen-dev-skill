#!/usr/bin/env bash
# install.sh — install the pen-dev skill for an agent harness.
#
#   ./install.sh
#
# The repository root IS the skill: SKILL.md sits at the top level, alongside the
# scripts it references. So installing means putting the repo where the harness
# looks for skills.
#
# Environment:
#   SKILL_ROOT  where skills live (default: ~/.dsh/skills)
#   REPO_URL    source repo. Append "#<ref>" to pin a version or branch:
#                 REPO_URL=https://github.com/raeirie/pen-dev-skill.git#v0.1.0
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/raeirie/pen-dev-skill.git}"
SKILL_NAME="pen-dev"

info() { printf '\033[36m->\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }

# --- Where do skills go? -------------------------------------------------
# DeepSeek Harness:  ~/.dsh/skills/   (user)  |  <project>/.dsh/skills/  (project)
# Claude Code:       ~/.claude/skills/
TARGET_ROOT="${SKILL_ROOT:-$HOME/.dsh/skills}"
TARGET="$TARGET_ROOT/$SKILL_NAME"

info "Installing $SKILL_NAME into $TARGET_ROOT"

# --- Source --------------------------------------------------------------
# REPO_URL may carry a ref:  <url>#<tag-or-branch>  e.g.
#   REPO_URL=https://github.com/raeirie/pen-dev-skill.git#v0.1.0
# The ref is cloned separately so the installed copy is that exact revision.
REPO_REF=""
REPO_BASE="$REPO_URL"
if [[ "$REPO_URL" == *"#"* ]]; then
  REPO_BASE="${REPO_URL%%#*}"
  REPO_REF="${REPO_URL##*#}"
fi

if [[ -f "SKILL.md" && -f "pen.sh" ]]; then
  SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  info "Installing from local copy at $SRC"
else
  SRC="$(mktemp -d)"
  if [[ -n "$REPO_REF" ]]; then
    info "Cloning $REPO_BASE @ $REPO_REF"
    git clone --depth 1 --branch "$REPO_REF" "$REPO_BASE" "$SRC/$SKILL_NAME"
  else
    info "Cloning $REPO_BASE"
    git clone --depth 1 "$REPO_BASE" "$SRC/$SKILL_NAME"
  fi
  SRC="$SRC/$SKILL_NAME"
fi

# --- Install -------------------------------------------------------------
mkdir -p "$TARGET_ROOT"
if [[ -e "$TARGET" ]]; then
  warn "$TARGET already exists - replacing it"
  rm -rf "$TARGET"
fi
mkdir -p "$TARGET"

# Copy the skill, skipping build artefacts and scratch output.
(cd "$SRC" && tar --exclude='.git' --exclude='__pycache__' --exclude='*.pyc' \
                --exclude='pen-shots' --exclude='exports' --exclude='.DS_Store' \
                -cf - .) | (cd "$TARGET" && tar -xf -)
ok "Installed to $TARGET"

chmod +x "$TARGET/pen.sh" "$TARGET/pen-sel.py" "$TARGET/pen-shots.py" 2>/dev/null || true

# --- Check the pen CLI ----------------------------------------------------
if command -v pen >/dev/null 2>&1; then
  ok "pen CLI found: $(pen version 2>&1 | tail -1 | tr -d '\033' | sed 's/\[[0-9;]*m//g')"
else
  warn "pen CLI not found. Install it with:  npm install -g @pen.dev/cli"
fi

cat <<'EOF'

Next steps
----------
1. Authenticate once:
     pen login
   ...or just open Pen.app once - the skill reuses its session automatically.

2. Verify:
     ~/.dsh/skills/pen-dev/pen.sh --help
     ~/.dsh/skills/pen-dev/pen.sh sel

3. Start a new session and ask for something like
   "design a pricing page in pen.dev" - the agent loads the skill on its own.

Other harnesses
---------------
   SKILL_ROOT=~/.claude/skills ./install.sh     # Claude Code
   SKILL_ROOT=./.dsh/skills     ./install.sh     # project-scoped, for DSH

EOF
