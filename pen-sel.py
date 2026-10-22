#!/usr/bin/env python3
"""
pen-sel.py — resolve the user's current Pen.app selection into node ids.

Reads the `get_app_state()` output emitted by `pen interactive -a desktop`,
extracts the selected node ids, then dumps each selected subtree as a readable
tree (ids, names, types, geometry, text content).

This is the mechanism behind "point at a frame and tell me what to change":
the user selects layers in Pen.app, and this resolves that selection to ids
the agent can act on.
"""
import json
import re
import subprocess
import sys


def extract_state(raw: str):
    """Pull the app-state payload out of the shell's response.

    The shell wraps tool output in {"message": "...", "images": [...]}, but
    some responses emit the message alone or unescaped. Try each shape.
    """
    # 1. JSON envelope with an "images" sibling.
    m = re.search(r'\{\s*"message"\s*:\s*(".*?")\s*,\s*"images"', raw, re.S)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    # 2. JSON envelope, message followed by any other key or the end.
    m = re.search(r'"message"\s*:\s*("(?:[^"\\]|\\.)*")', raw, re.S)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    # 3. Raw text — the state was printed without a JSON wrapper.
    if "Selected nodes:" in raw or "Current App State" in raw:
        return raw
    return None


def selected_ids(state: str):
    """Pull selected node ids out of the 'Selected nodes:' line."""
    ids = []
    if not state:
        return ids
    for line in state.splitlines():
        if line.strip().startswith("- Selected nodes:"):
            for m in re.finditer(r'`([A-Za-z0-9]+)`\s*\(([^)]+)\):\s*([^,\n]+)', line):
                ids.append((m.group(1), m.group(2), m.group(3).strip()))
    return ids


def main():
    raw = sys.stdin.read()
    state = extract_state(raw)
    text = state if state else raw

    sel = selected_ids(text)
    if not sel:
        print("NO_SELECTION")
        # Still show where things are, so the agent can ask for a selection.
        for line in text.splitlines():
            if line.strip().startswith("- Top-level nodes:"):
                print(line.strip()[:2000])
        return

    print(f"SELECTED {len(sel)} node(s)")
    for nid, ntype, nname in sel:
        print(f"  {nid}  ({ntype})  {nname}")

    # Dump each selection's subtree via a second pen call.
    for nid, ntype, nname in sel:
        snippet = (
            f'Get("{nid}",(n,c)=>Print("  "+"  ".repeat(c.depth)+n.id+" | "+n.name'
            f'+" | "+n.type+" | w="+n.width+" h="+n.height+" | "+'
            f'(n.content?("text=\\""+String(n.content).slice(0,60)+"\\""):"")'
            f'+(n.fill?(" fill="+String(n.fill)):"")'
            f'+(n.ref?(" ref="+n.ref):"")'
            f'+(n.layout?(" layout="+n.layout):"")))'
        )
        call = 'execute({ input: ' + json.dumps(snippet) + ' })'
        proc = subprocess.run(
            ["pen", "interactive", "-a", "desktop"],
            input=call + "\nexit()\n",
            capture_output=True,
            text=True,
        )
        print(f"\n=== {nid} ({ntype}) {nname} ===")
        out = proc.stdout
        # The shell prints {"message":"OK\n...\n## Print output\n<lines>"} — the
        # payload is a JSON string, so parse the envelope and take the text.
        lines = []
        m = re.search(r'"message"\s*:\s*("(?:[^"\\]|\\.)*")', out, re.S)
        if m:
            try:
                text = json.loads(m.group(1))
            except json.JSONDecodeError:
                text = ""
            marker = "## Print output"
            if marker in text:
                body = text.split(marker, 1)[1]
                lines = [l for l in body.splitlines() if l.strip()]
        for line in lines:
            print(line.rstrip())


if __name__ == "__main__":
    main()
