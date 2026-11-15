# Code Map & Repo Guard Separation

## Product Directory Map (`hooks/`, `hooks/git/`, `policy/`) vs. Local Guard (`tools/`)

| Path | Responsibility | Key Files & Symbols | Callers |
| --- | --- | --- | --- |
| `hooks/` | Claude `PreToolUse` wrappers, read-path normalization, dynamic cache sync, slug resolver, repo scanner | `_lib.sh`, `forbid-{content,commit,push,read-secret,tamper,read-path}.sh`, `refresh-private.py`, `resolve-private.py`, `scan-repo.py` | Claude Code hooks, `check.py --net`, operators |
| `hooks/git/` | Mandatory Git lifecycle wrappers (`--net` enabled) | `pre-commit`, `pre-merge-commit` (`exec pre-commit`), `commit-msg`, `pre-push` | Global `git config --global core.hooksPath` |
| `policy/` | Single policy engine, static rule config, bootstrap installer, settings merger, credential compiler, health check | `check.py` (`full_check`, `private_check`, `commit_signature`, `known_content`, `cmd_push`), `policy.json`, `bootstrap.sh`, `install-settings.py`, `doctor.py`, `build-secure-token.py`, `token-helper.cpp`, `msgcb-hygiene.py` | Wrappers, setup scripts, operators |
| `tools/` | **Repo-local maintenance guard** (Conventional Commits + offline staged/push secret scan + `.repo-security-allowlist.json`) | `repo_maintenance_guard.py`, `tools/repo_maintenance_hooks/{pre-commit,commit-msg,pre-push}` | Local `.git/config core.hooksPath` when working on this repo only |

## Coverage & Local-Only Boundaries

- Root `settings.json` serves as the sanitized Claude Code hook template (`6` `PreToolUse` entries, `1` `SessionStart` entry, `attribution.sessionUrl=false`).
- Local-only runtime artifacts (`$GUARD/private-seed.json`, `$GUARD/sanitize-map.json`, `private-repos.json`, `.resolve.json`, and compiled `token-helper`) live solely on the target machine and are excluded from version control and distributable archives.
- Detailed Chinese module walkthroughs, glossary, and evidence records reside in the repository's `repo-docs/` Standard guide (`repo-docs/README.md`).
