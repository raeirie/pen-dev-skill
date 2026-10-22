#!/usr/bin/env bash
# pen.sh — drive pen.dev from DeepSeek Harness without using pen's paid LLM agent.
#
# Modes:
#   headless : ./pen.sh multi <out.pen> [--in <in.pen>] < script.js
#   app      : ./pen.sh app <script.js>        (live Pen.app canvas, Pen.app must run)
#
# The "multi" mode splits the JS on lines containing "@call" and sends each chunk
# as one execute() call inside a SINGLE pen session, so globals captured with
# `id = Insert(...)` persist between chunks. save() runs at the end.
#
# Sandbox notes:
#   * The pen CLI creates a unix socket under $HOME/.pencil/socket. The DSH
#     sandbox blocks the real ~/.pencil, and socket paths are capped at ~104
#     chars, so headless mode runs with HOME=/tmp/ph (short) and the session
#     token copied there.
#   * App mode (-a desktop) only *connects* to the running app's existing
#     socket, so it must use the real HOME.
#
# Env:
#   PEN_HOME  headless $HOME override (default /tmp/ph)
#   PEN_OUT   screenshot output dir (default ./pen-shots)
set -euo pipefail

usage() {
  cat <<'EOF'
pen.sh — drive pen.dev from an agent, without pen's own LLM agent.

Usage:
  pen.sh multi <out.pen> [--in <in.pen>] < script.js
      Headless. Run script.js against a .pen file and save it.
      script.js may contain lines with "@call" to split it into several
      execute() calls inside one session (ids stay in scope across chunks).

  pen.sh app < script.js
      Live. Edit the canvas currently open in Pen.app. Requires Pen.app running.

  pen.sh sel
      Print the live app state: current selection, top-level frames, components.

  pen.sh seltree
      Print the selected node(s) as a readable tree (ids, names, types,
      geometry, text). This is how a user "points at" a frame.

  pen.sh --help
      This message.

Extract screenshots so you can look at the result:
  pen.sh app < script.js | python3 pen-shots.py ./pen-shots

Environment:
  PEN_HOME  headless $HOME override (default /tmp/ph). The CLI creates a unix
            socket under $HOME/.pencil/socket, which sandboxes commonly block
            and which is capped at ~104 chars, so headless runs use a short path.
  PEN_OUT   screenshot output dir (default ./pen-shots)
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

MODE="${1:-multi}"; shift
OUT=""; IN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --in) IN="$2"; shift 2 ;;
    *)   OUT="$1"; shift ;;
  esac
done

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PEN_HOME="${PEN_HOME:-/tmp/ph}"
OUTDIR="${PEN_OUT:-$(pwd)/pen-shots}"

# Split JS on "@call" lines -> one execute() tool call per chunk.
SPLIT_PY=$(cat <<'PYSRC'
import sys, json
chunks, cur = [], []
for line in sys.stdin.read().splitlines():
    if "@call" in line:
        chunks.append("\n".join(cur)); cur = []
    else:
        cur.append(line)
chunks.append("\n".join(cur))
for c in chunks:
    if c.strip():
        print("execute({ input: " + json.dumps(c) + " })")
PYSRC
)

headless_prepare() {
  mkdir -p "$PEN_HOME/.pencil" "$OUTDIR"
  # Prefer the desktop app's session token: the desktop app refreshes it
  # automatically, while the CLI's own copy expires.
  local src="$HOME/.pencil/session-desktop.json"
  if [[ -f "$src" ]]; then
    python3 - "$src" "$PEN_HOME/.pencil/session-cli.json" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src))
json.dump({"email": d.get("email"), "token": d["token"]}, open(dst, "w"))
PY
  fi
}

filter_out() {
  grep -v -e 'Update available' -e 'npm i -g @pen.dev/cli' \
         -e '^╭' -e '^╰' -e '^\s*│' -e '^\s*Run .npm i' \
         -e '^\[2m' -e '^\[INFO\]' || true
}

case "$MODE" in
  multi)
    [[ -n "$OUT" ]] || { echo "usage: pen.sh multi <out.pen> [--in <in.pen>]" >&2; exit 2; }
    headless_prepare
    python3 -c "$SPLIT_PY" > /tmp/.pen_calls.$$
    IN_ARG=()
    if [[ -n "$IN" ]]; then IN_ARG=(--in "$IN"); fi
    { cat /tmp/.pen_calls.$$; echo 'save()'; echo 'exit()'; } \
      | HOME="$PEN_HOME" pen interactive ${IN_ARG[@]+"${IN_ARG[@]}"} -o "$OUT" 2>&1 | filter_out
    rm -f /tmp/.pen_calls.$$
    ;;
  app)
    # Live Pen.app canvas. Needs the real HOME to find the app's socket.
    python3 -c "$SPLIT_PY" > /tmp/.pen_calls.$$
    { cat /tmp/.pen_calls.$$; echo 'exit()'; } \
      | pen interactive -a desktop 2>&1 | filter_out
    rm -f /tmp/.pen_calls.$$
    ;;
  sel)
    # Read the user's current selection + canvas state from the live app.
    # This is how the user points at a frame/element: they select it in Pen.app,
    # then ask. `sel` resolves that selection to node ids.
    printf 'get_app_state()\nexit()\n' \
      | pen interactive -a desktop 2>&1 | filter_out
    ;;
  seltree)
    # Dump the selected node(s) as a readable tree, so the agent can see exactly
    # what the user pointed at (ids, names, types, geometry, text content).
    printf 'get_app_state()\nexit()\n' \
      | pen interactive -a desktop 2>&1 | filter_out \
      | python3 "$SKILL_DIR/pen-sel.py"
    ;;
  *)
    echo "usage: pen.sh multi|app|sel|seltree ..." >&2; exit 2 ;;
esac
