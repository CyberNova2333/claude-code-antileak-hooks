# Overview, Scope & Deployment

## Positioning & Boundaries

**Claude Code Antileak Hooks** is a two-layer leakage-prevention guardrail combining offline `PreToolUse` shell wrappers with mandatory Git hooks, both delegating to a single Python policy engine (`policy/check.py`):

- **In scope**: Offline pre-execution blocking of writes (`Write` / `Edit` / `NotebookEdit`), sensitive file reads (`Read` / `Grep` and `Bash`), bypass flags (`--no-verify`, `--no-gpg-sign`, `core.hooksPath` edits), and agent branch pushes (`claude/...`, `codex/...`, etc.); plus online (`--net`) Git verification at `pre-commit`, `pre-merge-commit`, `commit-msg`, and `pre-push` covering private repository names (`R1`), model/session markers (`R2`), non-provider authorship and `Co-authored-by:` trailers (`R3`), private regexes (`R4`), agent branch push blocking (`R5`), non-generic SSH commit signatures (`R6`), and masked secret regexes (`R7`).
- **Out of scope**: Does not enforce protected branch or force-push rules (delegated to hosting platform rulesets); does not hook `Glob` (which returns paths rather than file contents); advisory shell checks cannot stop a privileged local user who bypasses hooks, so the Git pre-push gate and remote branch protections remain the strong enforcement boundary.
- **Product hooks vs. repo maintenance guard**: `hooks/`, `hooks/git/`, and `policy/` form the installable product package, whereas `tools/repo_maintenance_guard.py` and `tools/repo_maintenance_hooks/` are offline maintenance hooks solely for committing to this repository clone.

## Prerequisites

| Requirement | Purpose | Failure Behavior |
| --- | --- | --- |
| `python3` | Runs `check.py`, `refresh-private.py`, `resolve-private.py`, and installers | `bootstrap.sh` exits `1` |
| `git` | Extracts staged `+` lines, runs `ls-remote`, inspects commit objects | `bootstrap.sh` exits `1` |
| `curl`, `unzip` / `tar` | Fetches and unpacks zip/tgz release archive | `bootstrap.sh` exits `1` |
| `openssh-client` (`ssh-keygen`) | Computes signing key fingerprints and runs `ssh-keygen -Y check-novalidate` for R6 | `bootstrap.sh` attempts `apt-get`; missing binary triggers fail-closed denial |

All entry wrappers export `PYTHONUTF8=1` and Python scripts explicitly open files and streams with UTF-8 to avoid silent fallbacks on Chinese Windows / GBK locales.

## Deployment Modes

Source files intentionally contain template paths (`/root/.claude/...`) and **cannot** be wired directly from a git clone without path rewriting via `policy/bootstrap.sh`.

### Mode A: Local CLI Install & Idempotent Upgrade

```bash
# 1. Install or upgrade into $GUARD (default $HOME/.claude/guardrails) while preserving seeds/caches
HOOK_PACKAGE_URL=file:///path/to/guardrails-package.zip bash policy/bootstrap.sh

# 2. Place local-only private seed & history sanitize map (never shipped in packages)
cp private-seed.json sanitize-map.json "$HOME/.claude/guardrails/"
chmod 600 "$HOME/.claude/guardrails/private-seed.json" "$HOME/.claude/guardrails/sanitize-map.json"

# 3. Refresh dynamic private repo cache and run read-only diagnostics
python3 "$HOME/.claude/guardrails/hooks/refresh-private.py"
python3 "$HOME/.claude/guardrails/policy/doctor.py"
```

What `bootstrap.sh` executes in order:
1. Backs up existing `private-seed.json`, `sanitize-map.json`, `private-repos.json`, and `.resolve.json` before replacing `hooks/` and `policy/`, then restores them.
2. Uses `sed` to rewrite template `/root/.claude/...` paths across `policy/*`, `hooks/*.sh`, `hooks/*.py`, and `hooks/git/*` to `$GUARD/...` and `$HOME/.claude/settings.json`.
3. Sets global `git config --global core.hooksPath "$GUARD/hooks/git"`.
4. Calls `policy/install-settings.py` to idempotently merge 6 `PreToolUse` hooks, 1 `SessionStart` hook, and `attribution.sessionUrl=false` into `<repo>/.claude/settings.json` (plus colon-separated `GUARD_REPOS`, adding untracked files to `.git/info/exclude` via `--exclude-untracked`) and `~/.claude/settings.json`.

### Mode B: Cloud / Container Environment Setup Script

1. Paste `policy/bootstrap.sh` into your cloud Setup Script and replace `PKG_URL_DEFAULT` with your release archive URL.
2. Configure environment variables: `GUARD_SEED_B64` (or `GUARD_SEED_JSON`), the primary hosting platform read-only token (matching `policy/policy.json`), and optional `GH_TOKEN_1..N` (if private repositories also reside on GitHub). Allowlist the package CDN domain, primary hosting API, and `api.github.com`.
3. Cloud sessions read repository-level `.claude/settings.json` rather than `~/.claude/settings.json`. Note that if a cloud Git proxy only permits pushing to `claude/...` branches, R5 intentionally blocks all cloud pushes by design.

### Mode C: `token-helper` Local Credential Wrapper (Optional)

To avoid plaintext token files on disk, fill token slots in a private copy of `policy/token-helper.cpp`, inject `GUARD_PKG_URL` during build (never hardcode release URLs into tracked files), generate XOR-obfuscated C++ via `policy/build-secure-token.py`, and compile an executable readable only by the user (`chmod 700`). Note that XOR stream obfuscation mitigates automated text scraping and does not replace OS keyrings or HSMs.

### Mode D: This Repository's Maintenance Guard (Contributors Only)

```bash
python tools/repo_maintenance_guard.py install
python tools/repo_maintenance_guard.py status
```

Sets local `.git/config` `core.hooksPath` to `tools/repo_maintenance_hooks` and `commit.template` to `.gitmessage.txt` (requires Python 3.10+).

## Read-Only Health Check (`doctor.py`)

```bash
python3 "$HOME/.claude/guardrails/policy/doctor.py"
```

Checks `policy.json` integrity, Claude hooks (no `permissionDecision: allow`), global/local `core.hooksPath`, `--net` isolation, cache freshness (`6h` TTL), private seed presence, and SSH signing config. Exits `0` (`Overall: PASS`) only when zero `[FAIL]` checks occur; otherwise exits `1` (`Overall: DEGRADED`). Next: [Config Matrix, Seeds & Troubleshooting FAQ](/en/docs/configuration).
