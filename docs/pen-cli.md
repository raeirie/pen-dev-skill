# pen.dev CLI reference

Reference for `@pen.dev/cli` — the command surface this skill drives.

Verify your installed version and flags with `pen --help`; pen ships updates
regularly and flags have been added over time (this doc reflects **v0.3.5**).

---

## Install

```bash
npm install -g @pen.dev/cli
pen version
```

Requires **Node.js ≥ 22.19**.

---

## The two modes

### Interactive mode — the one this skill uses

```bash
pen interactive --app <name> [--in <file.pen>]   # drive a running app
pen interactive --out <file.pen> [--in <file.pen>]  # headless
```

Starts a line-oriented shell that exposes the MCP tool surface directly:

```
pen > read_skill()
pen > read_skill({ path: "pen-schema.md" })
pen > get_app_state()
pen > execute({ input: 'Insert(document,{type:"frame",width:800,height:600})' })
pen > save()
pen > exit()
```

**One tool call per line.** Multi-line JavaScript must be sent as a single
`execute({ input: "..." })` call with the JS JSON-escaped.

### Agent mode — the expensive one

```bash
pen --out design.pen --prompt "Create a login page" --agent claude
```

Runs pen's own bundled model (Claude, Codex, Gemini, or a Pi provider). **This
skill never uses it** — the agent drives the tools itself instead, so no
third-party model is billed.

---

## Commands

| Command | Purpose |
| --- | --- |
| `pen login` | Interactive login — email + password or OTP |
| `pen status` | Verify auth, show account, workspace, profile |
| `pen version` | Print the installed version |
| `pen interactive` | Start the tool shell |
| `pen codex-login` / `pen codex-logout` | Manage the OpenAI Codex credential |
| `pen --list-workspaces` | List organizations and workspaces |
| `pen --workspace <slug>` | Select the current cloud workspace |

---

## `pen interactive` flags

| Flag | Description |
| --- | --- |
| `--app, -a <name>` | Connect to a running pen.dev app (e.g. `desktop`) |
| `--in, -i <path>` | Input `.pen` file to open (empty canvas if omitted) |
| `--out, -o <path>` | Output `.pen` path — **required** in headless mode |
| `--preview-output <path>` | Preview PNG path (default `~/.pencil/latest-preview.png`) |
| `--enable-preview` | Save a preview image after each design change |

---

## Agent mode flags

Listed for completeness. This skill does not use agent mode.

| Flag | Description |
| --- | --- |
| `--in, -i <path>` | Input `.pen` file |
| `--out, -o <path>` | Output `.pen` path (required) |
| `--prompt, -p <text>` | Prompt for the AI agent |
| `--prompt-file, -f <path>` | Attach an image or text file (repeatable) |
| `--agent <type>` | `claude` (default), `codex`, `gemini`, or a Pi provider |
| `--model, -m <id>` | Model id; the agent is inferred from it |
| `--effort <level>` | Reasoning effort |
| `--usage <path>` | Write final token usage and cost to JSON |
| `--custom, -c` | Custom Claude model configuration |
| `--list-models` | List available models and exit |
| `--tasks, -t <path>` | JSON tasks file for batch operations |
| `--repo, -C <path>` | Working directory for the agent |
| `--workspace <slug>` | Select cloud workspace |
| `--list-workspaces` | List workspaces and exit |
| `--export, -e <path>` | Export an image of the final result |
| `--export-scale <n>` | Export scale factor (default 1) |
| `--export-type <type>` | `png`, `jpeg`, `webp`, `pdf` |
| `--preview-output <path>` | Preview PNG path |
| `--enable-preview` | Save a preview after each design change |
| `--verbose-mcp` | Include full MCP tool error details |
| `--verbose, -v` | Stream model thinking and tool calls |
| `--max-failed-calls <n>` | Abort after N failed tool calls |

> The CLI exits after the first successful task in a `--tasks` file. Run a separate
> `pen` command per task.

---

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PEN_CLI_KEY` | CLI API key for CI/CD. **Takes precedence** over the stored session |
| `PEN_AGENT_API_KEY` | API key for the selected agent (agent mode only) |
| `ANTHROPIC_API_KEY` | Anthropic key for Claude agents (agent mode only) |
| `PEN_API_BASE` | Backend base URL (default `https://api.pen.dev`) |
| `DEBUG` | Enable debug logging |

---

## Token storage

| Path | Holds |
| --- | --- |
| `~/.pencil/session-cli.json` | CLI session token |
| `~/.pencil/session-desktop.json` | Desktop app session token |
| `~/.pencil/socket/` | Unix sockets for CLI/app communication |
| `~/.pencil/documents/<uuid>/` | Documents opened by the desktop app |

The desktop app refreshes its token automatically. The CLI's copy expires —
which is why the driver copies the desktop token across before each headless run.

---

## Auth flow

```bash
pen status
```

Reports the active method and verifies against the backend. Three ways to
authenticate:

### 1. Desktop token reuse (recommended)

```bash
python3 - <<'PY'
import json
d = json.load(open('/Users/arie/.pencil/session-desktop.json'))
json.dump({"email": d["email"], "token": d["token"]},
          open('/tmp/ph/.pencil/session-cli.json', 'w'))
PY
```

Requires the desktop app to have been used at least once.

### 2. Interactive login

```bash
pen login
```

Email + password, or email + OTP code. Stores to `~/.pencil/session-cli.json`.

### 3. CLI key

Create under **Developer Keys** in your org settings on the web app:

```bash
PEN_CLI_KEY=pencil_cli_... pen --out design.pen --prompt "..."
```

---

## Sandbox notes

Two constraints bite when running the CLI inside a restricted sandbox:

**1. Socket path.** The CLI creates a unix socket at `$HOME/.pencil/socket/`.
Sandboxes commonly block the real `~/.pencil`. Unix socket paths are also capped
at ~104 characters on macOS, so a long workspace path fails with `EINVAL` even
when permissions are fine. Fix — run headless with a short `HOME`:

```bash
mkdir -p /tmp/ph/.pencil
HOME=/tmp/ph pen interactive -o out.pen
```

**2. App mode needs the real HOME.** `--app desktop` only *connects* to the app's
existing socket rather than creating one, so it must use the real `$HOME` to
find `~/.pencil/socket/pencil-desktop.sock`.

---

## Known behaviours

- **Globals don't cross process boundaries.** An id captured as
  `page = Insert(...)` lives for the session. A second `pen interactive`
  invocation starts fresh. Keep one session and split work with `@call` chunks.
- **`mcp-gate` usage checks fail open.** With an expired token you may see
  `usage check failed ... (401): Unauthorized` — the call is still allowed and
  the tool still works. It signals an auth problem, not a tool failure.
- **Errors return an `editId`.** A failed `execute` call prints an `editId`;
  re-issue the call with `edits` (a list of `find`/`replace` patches) rather than
  resending the whole snippet.

---

## Upstream docs

- [pen.dev CLI](https://docs.pen.dev/for-developers/pen-cli)
- [The .pen format](https://docs.pen.dev/for-developers/the-pen-format)
- [AI agents and skills](https://docs.pen.dev/core-concepts/ai-agents)
