# Changelog & Migration Guide

This page consolidates operational and breaking-change history from `rev4` through `rev4.4`.

## Upgrading Safely

- Re-run `policy/bootstrap.sh` to upgrade `hooks/` and `policy/` idempotently; the script backs up and restores existing `private-seed.json`, `sanitize-map.json`, `private-repos.json`, and `.resolve.json`.
- If upgrading from pre-`rev4` setups, move any custom private repo names and internal regexes into `$GUARD/private-seed.json` (or `GUARD_SEED_B64`), pass any package archive URL via `GUARD_PKG_URL` rather than editing source files, and re-run `policy/install-settings.py` to add `forbid-read-path.sh` (`Read|Grep`).
- `gpg.ssh.allowedSignersFile` is no longer required; R6 validates `gpgsig` directly via `ssh-keygen -Y check-novalidate`.

## Release History (`rev4` – `rev4.4`)

### `rev4.4`: Primary Platform Source Split, CLI Token Reads & Windows Path Fix
- Elevated the configured primary hosting platform API as the default private repo list source while keeping GitHub (`GH_TOKEN_1..N` / `gh` CLI) optional; updated `build-secure-token.py` to accept either token prefix and `doctor.py` to recognize `seed-env`.
- Added `~/.git-credentials` and CLI login token paths to `forbid-read-secret.sh` and `forbid-read-path.sh`.
- Fixed Windows path enforcement in `forbid-read-path.sh` by accepting drive-letter paths (`C:\...`, `C:/...`) and normalizing backslashes to `/` after `realpath`.

### `rev4.3`: End-to-End UTF-8 Standardization (Chinese Windows / GBK Fix)
- Exported `PYTHONUTF8=1` in all shell wrappers, reconfigured Python standard streams to UTF-8, and passed explicit `encoding='utf-8'` across file I/O and subprocesses to eliminate silent `UnicodeDecodeError` fallbacks on GBK systems.

### `rev4.2`: Re-sign Exemption, True Remote Tips & R2/R7 False-Positive Tuning
- Added `known_content` (`resign_exempt` default on) using `(tree, parent trees)` signatures and `git patch-id --stable` against real remote tips (`git ls-remote`) so re-signed or rebased commits skip duplicate line scans while still enforcing SSH signatures, authors, and messages.
- Filtered `R2` model regexes inside `>=24`-character Base64-like runs (`in_b64_run`) without weakening `R7` secret detection, and tightened Google API key matching to isolated 39-character `AIza` + 35-character strings.

### `rev4` – `rev4.1`: Core Fail-Closed Split & Complete Tool/Git Coverage
- Stripped all private repo lists, internal domains, and package URLs out of distributable files into local seeds and build-time `GUARD_PKG_URL`.
- Removed `permissionDecision: allow` outputs (fixing host permission-prompt bypass), added `forbid-read-path.sh` (`Read|Grep`), `NotebookEdit` (`new_source`), `pre-merge-commit`, `git push -u origin claude/...` matching, 8-character secret masking, `core.commentChar` stripping, `ACMR`-only diff scanning, and completeness checks in `refresh-private.py`.
