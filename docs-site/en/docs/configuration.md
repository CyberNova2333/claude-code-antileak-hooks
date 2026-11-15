# Config Matrix, Seeds & Troubleshooting FAQ

## `policy/policy.json` & Environment Matrix

`policy/policy.json` is the single distributed rule config and purposefully omits private repository names, internal hostnames, and credentials:

| Key / Env Var | Scope | Default / Format | Role |
| --- | --- | --- | --- |
| `forbidden_patterns` | `policy/policy.json` | Regex array (`re.I`) | **R2** model names/versions and session identifier patterns |
| `agent_branch_prefixes` | `policy/policy.json` | 15 prefixes (`claude/`, `codex/`, `openai/`, `cursor/`, etc.) | **R5** blocks pushes/deletions targeting any agent-prefixed ref |
| `agent_provider_emails` | `policy/policy.json` | 4 provider noreply addresses | **R3** rejects provider noreply git authors/committers |
| `agent_signing_fingerprint` / `signing_instructions` | `policy/policy.json` | `SHA256:...` + guidance string | **R6** rejects generic shared agent SSH keys and prints user setup steps |
| `secret_regexes` | `policy/policy.json` | 9 credential/key regexes | **R7** detects tokens, fixed 39-char Google keys, and private key headers |
| `private_cache` / `private_cache_ttl` | `policy/policy.json` | `.../private-repos.json` / `21600` | Dynamic private list cache path and TTL (`6h`) |
| `private_seed` / `expected_owners` | `policy/policy.json` | `.../private-seed.json` / `[]` | Local offline seed path; owners required during cache completeness check |
| `resolve_budget` / `resolve_cache_ttl` / `resolve_ignore` | `policy/policy.json` | `30` / `86400` (`24h`) / optional array | Limits and negative/positive cache for `--net` `resolve-private.py` lookups |
| `resign_exempt` | `policy/policy.json` | Enabled unless `false` | Allows `known_content` optimization in `push` mode for resigned/rebased commits |
| `GUARD_DIR` / `HOOK_PACKAGE_URL` / `GUARD_REPOS` | Env vars | `$HOME/.claude/guardrails` / URL / `:` list | Override install path, package URL, and extra repo settings injection |
| `GUARD_SEED_B64` / `GUARD_SEED_JSON` | Env vars | Base64 or JSON string | Supplies `private-seed.json` payload in headless containers |
| `GH_TOKEN_1..N` / `GH_TOKEN` | Env vars | GitHub read-only PATs | Optional GitHub private repository enumeration (`proxy-injected` ignored) |
| Primary platform keys | `policy.json` + token file/env | Configured in `policy.json` / `refresh-private.py` | Required when configured; any enumeration failure aborts cache overwrite |

## Local-Only Data Formats (`$GUARD/`, `chmod 600`)

### `private-seed.json` (R1 Fallback & Only Source of R4)

```json
{
  "owners": ["your-org", "your-user"],
  "private": ["your-org/private-app"],
  "patterns": ["internal\\.example\\.invalid", "corp-pipeline-[a-z0-9]+"]
}
```

- `owners` merges with `expected_owners`; every listed owner must either appear in `private` or return >=1 private repo from the platform API (public-only HTTP 200 does not pass coverage).
- `patterns` is the **sole** source of **R4** internal domain/pipeline regexes; without a seed, `doctor.py` warns that R4 is inactive.

### `sanitize-map.json` (History Rewrite Map)

Used by `policy/msgcb-hygiene.py` (`git filter-repo --message-callback`). Missing or unreadable `sanitize-map.json` fails immediately so history is never rewritten with an incomplete map.

## Repo Baseline Auditing (`scan-repo.py`)

```bash
# Scan HEAD text files (first 8 KiB NUL check) + all commit messages (requires fresh/existing cache)
python3 "$HOME/.claude/guardrails/hooks/scan-repo.py" /path/to/repo --scan-current

# Full historical tree scan
python3 "$HOME/.claude/guardrails/hooks/scan-repo.py" /path/to/repo --scan-history
```

Exits `2` if `private-repos.json` is missing or broken, and automatically exempts the repository's own `origin` remote name when present.

## Deployment & False-Positive Troubleshooting FAQ

### Q1: Why do Claude hooks fail closed on missing/expired cache instead of refreshing automatically?
`PreToolUse` hooks never pass `--net`. If a network request hangs past the hook timeout (`30s`–`120s`), Claude Code treats a killed hook as "no decision" and allows the action. Run `python3 $GUARD/hooks/refresh-private.py` (or rely on `SessionStart`) to refresh the cache.

### Q2: Why did a Base64 media string bypass R2 yet match R7?
`R2` uses `in_b64_run` to skip matches embedded inside uninterrupted >=24-character mixed-case alphanumeric runs (typical Base64 payloads). Real secrets share that shape, so `R7` intentionally disables `in_b64_run` skipping while tightening Google API keys to an isolated 39-character `AIza` + 35-character token.

### Q3: Why did `commit` mode not trigger on `#` git status lines in my commit template?
`check.py commit` reads `core.commentChar` and strips comment lines before scanning commit messages, while still enforcing `GIT_AUTHOR_IDENT` and `Co-authored-by:` on non-root commits.

### Q4: Will re-signing an old repository with SSH keys cause `pre-push` to re-scan and block legacy history?
No, provided `resign_exempt` is not `false`. Under `--net`, `known_content` compares `(tree, parent trees)` signatures or `git patch-id --stable` against real remote tips (`git ls-remote`). Identical diffs skip content scanning, while SSH signatures, author emails, and commit messages are still checked on every new commit.

### Q5: How are Chinese Windows / GBK locales and Windows drive paths handled?
Shell wrappers export `PYTHONUTF8=1`, Python entry points reconfigure standard streams and pass explicit `encoding='utf-8'`, and `forbid-read-path.sh` accepts `C:\...` / `C:/...` paths and normalizes backslashes before rule matching.
