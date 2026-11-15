# Hook Protocols, R1–R7 & Extension FAQ

## Claude Code Hook JSON Contract

`settings.json` and `policy/install-settings.py` wire **6 `PreToolUse` wrappers**, **1 `SessionStart` hook**, and `attribution.sessionUrl=false`:

| Matcher / Condition | Wrapper & Timeout | Parsed `tool_input` Keys | Responsibility |
| --- | --- | --- | --- |
| `Write\|Edit\|NotebookEdit` | `forbid-content.sh` (`120s`) | `content` / `new_string` / `new_source` | Delegates new payload text to offline `check.py content` |
| `Bash` (`if: Bash(git *)`) | `forbid-commit.sh` (`120s`) | `command` | Blocks `--no-verify`, `-n`, `--no-gpg-sign`, config tampering, provider emails, and policy matches |
| `Bash` (`if: Bash(git *)`) | `forbid-push.sh` (`120s`) | `command` | Blocks `--no-verify`, `hooksPath` overrides, pushes to `agent_branch_prefixes`, and policy matches |
| `Bash` | `forbid-read-secret.sh` (`30s`) | `command` | Advisory block on token file reads, `env`/`printenv`, `os.environ`/`process.env`, `gh auth status -t`, and secret `echo`/`printf` |
| `Bash` | `forbid-tamper.sh` (`30s`) | `command` | Advisory block on modifying `core.hooksPath`, `disableAllHooks`, `$GUARD`, or `settings.json` |
| `Read\|Grep` | `forbid-read-path.sh` (`30s`) | `file_path` / `path` | Normalizes `realpath` + Windows `\`, allows `.pub`/`.env.example`, denies keys/tokens |
| `SessionStart` | `refresh-private.py` (`120s`) | None | Refreshes dynamic private repo cache asynchronously at session start |

### Silent Pass vs. Deny Output

- **Silent Pass (`exit 0`, empty stdout)**: Wrappers intentionally **never** emit `permissionDecision: allow`, because doing so bypasses Claude Code's own interactive permission prompts (`doctor.py` enforces this rule).
- **Fail-Closed Deny (`exit 2`, JSON stdout + stderr reason)**: Triggered on rule match, `check.py` `error`, or stdin JSON `__PARSE_ERROR__`:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "[policy] redacted denial reason"
  }
}
```

## Policy Engine CLI & Three-State Contract (`policy/check.py`)

Prints strictly `pass`, `violation`, or `error` to stdout, writes masked diagnostics to stderr, and exits `0` **only** on exact `pass`:

| Subcommand | Callers | Stdin / Args | `--net` & Verification Behavior |
| --- | --- | --- | --- |
| `check.py content [file] [--net]` | `forbid-content.sh` (offline) / `pre-commit` (`--net`) | File or stdin text | Offline mode fails closed on stale/missing cache; `--net` refreshes once and resolves unknown `xxx-xxx` slugs |
| `check.py commit [msgfile] [--net]` | Git `commit-msg` (`--net`) | Message file + `GIT_AUTHOR_IDENT` | Strips `core.commentChar` comments; checks **R3** (provider email ban + `Co-authored-by:` on non-root commits) + `full_check` |
| `check.py push [remote] [--net]` | Git `pre-push` (`--net`) | Stdin ref update lines | Checks **R5** agent prefixes (including deletes), fetches `ls-remote` tips, validates **R6** SSH signatures, **R3**, and added `+` lines |

## Git Hook Enforcement Boundaries

Once global `core.hooksPath` points to `$GUARD/hooks/git`:
- **`pre-commit`** & **`pre-merge-commit`**: Enforce `commit.gpgsign=true`, `gpg.format=ssh`, valid non-generic `user.signingkey` fingerprint, and scan only `ACMR` paths + `+` added diff lines (so deleting secrets is never blocked).
- **`commit-msg`**: Passes the message file to `check.py commit --net` and rejects any non-`pass` verdict.
- **`pre-push`**: Delegates remote name and ref stdin to `check.py push --net`. `commit_signature` strips `gpgsig` from each new commit and validates cryptographically with `ssh-keygen -Y check-novalidate -n git` without requiring `gpg.ssh.allowedSignersFile`.

## Custom Rules & Contracts FAQ

### Q1: Where should I add internal domains or company-specific keyword regexes?
Add them to `$GUARD/private-seed.json` (or `GUARD_SEED_B64`) under `patterns`. Never add private terms or internal URLs to distributed `policy/policy.json`, or package commits will trigger R1 self-interception and leak metadata.

### Q2: How do I safely add a new `secret_regexes` or `forbidden_patterns` rule?
Edit `policy/policy.json` (`forbidden_patterns` compiles with `re.I`). When adding credential regexes, verify `mask()` in `policy/check.py` and `hooks/scan-repo.py` redacts matched secrets to their first 8 characters rather than echoing values to sessions.

### Q3: Why must every new `PreToolUse` script use a distinct filename?
`policy/install-settings.py` deduplicates hooks by script basename (`os.path.basename`). Reusing an existing wrapper filename causes the installer to assume the hook is already installed and skip registration.

### Q4: How do I ignore benign `foo-bar` slugs flagged during Git `push`?
Add lowercase entries to `resolve_ignore` in `policy/policy.json` (merged with built-in trailers and common tokens such as `co-authored-by` and `pre-commit`). Slugs missing two consecutive letters per segment or followed by `:` are already skipped automatically.
