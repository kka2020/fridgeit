# Contract: Claude Code agent hooks (FR-020, FR-021)

Configured in the checked-in `.claude/settings.json`, next to the existing `enabledPlugins` and
`attribution` keys. The scripts are Node ES modules in `.claude/hooks/`, run in exec form so they
behave the same in Git Bash and PowerShell.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/format-and-lint.mjs"],
            "timeout": 60
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/check-on-stop.mjs"],
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

## `format-and-lint.mjs` (PostToolUse)

**Input (stdin JSON)**: `tool_name` and `tool_input.file_path` (absolute; may use backslashes on
Windows).

**Behaviour**:
1. Normalise the path. Exit 0 if the file is outside the project, is deleted, or is matched by
   `.prettierignore`.
2. If Prettier supports the extension (`.ts .tsx .js .jsx .mjs .cjs .json .yml .yaml .md .css`),
   run `prettier --write <file>`.
3. For `.ts .tsx .js .jsx .mjs .cjs` files, run `eslint --fix <file>`.

**Output**:

| Situation | Exit | stderr |
|---|---|---|
| Formatted and linted cleanly, or skipped | 0 | none |
| Lint errors remain after `--fix` | 2 | The ESLint output, shown to Claude; the edit itself stands |
| A tool crashed (for example, `node_modules` missing) | 1 | The error; non-blocking, shown in the transcript |

## `check-on-stop.mjs` (Stop)

**Input (stdin JSON)**: `session_id` and `stop_hook_active`.

**Behaviour**:
1. Exit 0 without running anything only if both of these hold:
   - `git status --porcelain` lists no changed files outside `specs/`, `docs/` and `.specify/`.
   - `HEAD` equals the SHA saved in `<os.tmpdir()>/fridgeit-stop-hook/last-green-head`.

   Turns that only answer questions or edit specs stay fast, and a commit made during the turn
   is still checked.
2. Run `npm run typecheck`, then `npm test -- --silent`, and capture the output.
3. The state file is `<os.tmpdir()>/fridgeit-stop-hook/<session_id>.json` with
   `{ "attempts": n }`:
   - If `stop_hook_active` is `false`, this is a new turn, so reset `attempts` to 0.
   - On success, delete the file, save `HEAD` to `last-green-head`, and exit 0.
   - On failure, increment `attempts`.

**Output**:

| Situation | Exit | Output |
|---|---|---|
| No code changes, or all checks pass | 0 | none |
| Checks fail and `attempts` ≤ 3 | 2 | stderr: "Typecheck/tests failed (attempt n of 3). Fix these before handing over:" plus the trimmed failure output, which blocks the stop |
| Checks fail and `attempts` > 3 | 0 | stdout JSON `{"systemMessage": "Checks still failing after 3 attempts — handing over with failures: …"}`, which lets the stop through and shows the failures to the developer |

The fourth stop in a turn is always let through, so the agent gets exactly three tries at fixing
the failures. Claude Code's own limit of 8 consecutive continuations is a backstop.

**Verification** (see quickstart): pipe sample JSON into each script and check the exit codes
and output.
