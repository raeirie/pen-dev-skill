#!/usr/bin/env python3
"""Extract base64 PNG screenshots from pen interactive output into files."""
import base64, json, os, re, sys

def main():
    text = sys.stdin.read()
    outdir = sys.argv[1] if len(sys.argv) > 1 else "./pen-shots"
    os.makedirs(outdir, exist_ok=True)

    found = []
    # The shell prints a JSON array of {nodeId, image, mimeType}
    for m in re.finditer(r'\[\s*\{\s*"nodeId".*?\}\s*\]', text, re.S):
        blob = m.group(0)
        try:
            data = json.loads(blob)
        except json.JSONDecodeError:
            continue
        if not isinstance(data, list):
            continue
        for item in data:
            nid = item.get("nodeId", "shot")
            img = item.get("image")
            if not img:
                continue
            path = os.path.join(outdir, f"{nid}.png")
            with open(path, "wb") as fh:
                fh.write(base64.b64decode(img))
            found.append(path)

    if not found:
        print("NO_SCREENSHOTS", file=sys.stderr)
    for p in found:
        print(p)

if __name__ == "__main__":
    main()
