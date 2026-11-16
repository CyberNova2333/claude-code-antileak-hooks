---
layout: page
sidebar: false
title: API & Component Reference
description: Reference for Claude Code Antileak Hooks PreToolUse/SessionStart wrappers, --net Git hooks, the R1–R7 check.py policy engine, and bootstrap/doctor/scan-repo tooling.
---

<script setup lang="ts">
import { apiSpecEn } from '../../.vitepress/data/api-spec'
</script>

<ApiExplorer :spec="apiSpecEn">

### Claude PreToolUse (6) & SessionStart (1) Shell Wrappers (`settings.json`) {#pretooluse-wrappers}

Runs offline without `--net`, exits `0` silently on pass without emitting `allow`, and emits `deny` JSON + exit `2` on violations or malformed payloads. Intentionally omits `Glob`.

### Shared R1–R7 Policy Engine (`policy/check.py`) {#policy-check-engine}

Evaluates `content|commit|push [target] [--net]` with strict 3-state verdicts (`pass`, `violation`, `error`), direct `ssh-keygen -Y check-novalidate` verification, and 8-character secret masking.

### Global `--net` Git Hook Layer (`hooks/git/*`) {#git-hooks-layer}

Enforces R1–R7 on staged diffs, commit messages, agent branches (R5), and SSH signatures before local commits or pushes leave the machine.

### Multi-Source Private Repo Sync & Single-Slug Resolver (`refresh-private.py` / `resolve-private.py`) {#private-list-sync}

Builds a 6h TTL cache from local seeds (`private-seed.json` / `GUARD_SEED_B64`), CNB OpenAPI, and optional GitHub metadata while keeping R4 regexes strictly in local seeds.

### Idempotent Bootstrap, Settings Merger & `token-helper` (`bootstrap.sh`) {#bootstrap-and-install}

Rewrites template `/root/.claude/...` paths into `$GUARD`, preserves seeds/caches across upgrades, and supports `.git/info/exclude` via `--exclude-untracked`.

### Read-Only Diagnostics (`doctor.py`), Repo Audit & Maintenance Guard Split {#doctor-and-scan-repo}

Audits wiring health (`Overall: PASS/DEGRADED`), scans existing repos (`scan-repo.py`), and separates user guardrails from `tools/repo_maintenance_guard.py`.

</ApiExplorer>
