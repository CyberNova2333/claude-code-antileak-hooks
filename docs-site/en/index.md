---
layout: home

hero:
  name: Claude Code Antileak Hooks
  text: Dual-Layer Guardrails & Git Signing Gates
  tagline: Deterministic PreToolUse inspection and Git commit/push verification backed by one shared policy engine, split private lists, and fail-closed SSH signing checks.
  actions:
    - theme: brand
      text: Setup & Configuration
      link: /en/docs/
    - theme: alt
      text: Contracts & Rules
      link: /en/docs/contracts
    - theme: alt
      text: Architecture & Internals
      link: /en/docs/architecture

features:
  - title: PreToolUse + Git Defense in Depth
    details: Six PreToolUse bash wrappers catch risky writes, reads, and bypass flags offline before execution; four Git hooks enforce R1–R7 and SSH signatures with --net at commit and push time.
  - title: Clean Package / Private Data Split
    details: Distributed policy.json carries zero private repo names or internal domains. Private lists and regexes come from local seeds and platform APIs cached locally with a 6-hour TTL.
  - title: Fail-Closed & Redacted Verdicts
    details: The policy engine emits pass, violation, or error; wrappers never emit allow (preserving interactive permission prompts) and mask secrets to the first 8 characters.
---

## Quick Routes by Role & Goal

| Role / Goal | Start Here | What You Get |
| --- | --- | --- |
| Installing into local CLI or cloud container environments | [Overview, Scope & Deployment](/en/docs/) | Runtime prerequisites, `bootstrap.sh` path rewriting, and read-only `doctor.py` checks |
| Tuning `policy.json`, private seeds, or fixing errors/false positives | [Config Matrix, Seeds & Troubleshooting FAQ](/en/docs/configuration) | Settings matrix, multi-source list sync, `resign_exempt` boundaries, and troubleshooting FAQ |
| Inspecting hook stdin/stdout JSON or extending rules | [Hook Protocols, R1–R7 & Extension FAQ](/en/docs/contracts) | `PreToolUse`/`SessionStart` JSON contract, `check.py` CLI semantics, and custom rule FAQ |
| Understanding internals or navigating repository files | [Architecture & Real-Run Walkthrough](/en/docs/architecture) | Interactive diagram, write-hook walkthrough, and [Code Map](/en/docs/code-map) |
| Upgrading from rev3/rev4 releases or reviewing design decisions | [Changelog & Migration Guide](/en/docs/changelog) | Breaking changes across rev4–rev4.4, UTF-8 Windows fixes, and security boundaries |

## Interactive Architecture Diagram

<div class="archify-diagram-card" style="margin: 1.5rem 0; border: 1px solid var(--vp-c-border); border-radius: 12px; overflow: hidden; background: var(--vp-c-bg-soft); box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
  <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; background: var(--vp-c-bg-elv); border-bottom: 1px solid var(--vp-c-border); font-size: 13px;">
    <span style="font-weight: 600; color: var(--vp-c-text-1); display: flex; align-items: center; gap: 8px;">
      <span>📐</span> Claude Code Antileak Hooks Workflow (Interactive Archify diagram; pan / zoom / inspect)
    </span>
    <a href="/diagrams/antileak-workflow.html" target="_blank" rel="noreferrer" style="font-size: 12px; color: var(--vp-c-brand-1); text-decoration: none; font-weight: 500;">
      Open Fullscreen ↗
    </a>
  </div>
  <iframe src="/diagrams/antileak-workflow.html" width="100%" height="520px" frameborder="0" style="display: block; border: none;" allowfullscreen loading="lazy"></iframe>
</div>

## Read-Only Installation Check

The source tree ships with template paths that must be rewritten by `policy/bootstrap.sh` into `$GUARD` (default `$HOME/.claude/guardrails`). Run the diagnostic script from any clone to inspect wiring without mutating system state:

```bash
python3 policy/doctor.py
# Uninstalled clones report Overall: DEGRADED; a deployed environment reports Overall: PASS
```
