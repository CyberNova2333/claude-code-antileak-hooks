# Claude Code Antileak Hooks

[中文完整说明](README.md) · [Chinese source guide](repo-docs/README.md)

Content, attribution and SSH-signature guardrails for agent-assisted work and Git. Tool hooks inspect intended writes early; Git hooks inspect actual commits and pushes. Both call a shared Python policy engine. These local checks reduce mistakes and accidental disclosure; a process controlling the machine can still bypass them.

## Setup and operations

Requires Bash, Python 3, Git and OpenSSH. Read [the operations guide](docs/OPERATIONS.md) before using `policy/bootstrap.sh`: it installs hooks and settings, rewrites installation paths and configures local sources. This documentation sync did not execute installation or modify hook code or Git configuration.

After preparing a real installation:

```sh
python3 policy/doctor.py
```

The source tree's default paths are deployment templates, not proof that this checkout is configured. Keep private seeds, lists, credentials and generated token helpers outside distributable packages.

## Checks and boundaries

The engine separates `pass`, `violation` and `error`. Only `pass` succeeds; missing or stale dynamic lists do not count as a clean scan. Fast tool hooks do not use the network and reject malformed input. Successful tool checks exit silently, without an `allow` decision that could bypass host permissions. Git checks may explicitly refresh their data and validate real commit/push content, attribution and SSH signatures.

The content wrapper inspects `content`, `new_string` or `new_source`; it does not prove the entire existing file or repository is clean. Host timeouts can prevent a tool decision from returning. Doctor reports installation health and cannot replace interception tests or a full security audit.

## Verification

In an installed environment, `python3 policy/check.py content <neutral-test-file>` should return 0 only for `pass`. Review malformed event JSON, missing cache and denied content separately. No bundled full test suite is claimed, and no behavior checks were run during this documentation sync.

## License

[GPLv3](LICENSE). Existing operating instructions and changelog remain under `docs/`.

## Documentation site

The [Chinese source guide](repo-docs/README.md) follows one implemented workflow, then links to a code map and evidence audit. It does not claim complete architecture coverage.

```sh
pnpm --dir docs-site install --frozen-lockfile
pnpm --dir docs-site run docs:dev -- --host 127.0.0.1
pnpm --dir docs-site run docs:build
```

The documentation site uses the default VitePress theme, with dependencies installed separately from the application. Output defaults to `docs-site/.vitepress/dist/`; append `-- --outDir <external-absolute-directory>` for an isolated build. Markdown remains in `repo-docs/` and is included by the site. Repository source links are shown as exact paths; source files and local resources are not published.
