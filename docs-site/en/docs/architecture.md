# Architecture & Real-Run Walkthrough

## Two-Layer Enforcement Flow

```text
Agent Tool Call (Write / Edit / Bash / Read / Grep)
  └─▶ Claude Code PreToolUse (offline, no --net, 30s–120s timeout)
        ├─ Parse error / rule match / stale cache ──▶ deny JSON + exit 2
        └─ Exact pass ──────────────────────────────▶ silent exit 0 (host prompts preserved)

Git Lifecycle (pre-commit / pre-merge-commit / commit-msg / pre-push)
  └─▶ Git Client Hooks (--net enabled: lazy cache refresh + single-slug lookup)
        └─▶ Single Policy Engine policy/check.py (R1–R7 + ssh-keygen -Y check-novalidate)
              ├─ pass ──────────────────────────────▶ exit 0
              └─ violation / error ─────────────────▶ exit 1 + masked diagnostics
```

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

## One Real Run: Write Tool Interception

1. **Extract Payload (`hooks/forbid-content.sh`)**: Reads stdin JSON on `Write`, `Edit`, or `NotebookEdit` (`content` / `new_string` / `new_source`). Invalid JSON triggers fail-closed `deny`; empty content exits `0` silently.
2. **Offline Engine Call (`hooks/_lib.sh` -> `policy/check.py content`)**: Invokes `check.py content` **without `--net`** so the check completes well inside the 120s hook timeout (a killed hook defaults to "no decision" in Claude Code).
3. **Static & Cache Evaluation (`full_check`)**: Runs `scan()` (`R2` with `in_b64_run` filtering + `R7` unskipped secret regexes masked to 8 chars) followed by `private_check()` (`R4` local seed patterns + `R1` cached private repo names within the `6h` TTL). Missing or expired caches return `error`, never `pass`.
4. **Output Mapping**: Only exact stdout `pass` exits `0` silently (never emitting `permissionDecision: allow`). Any `violation` or `error` outputs `permissionDecision: deny` JSON and exits `2`.
5. **Final Git Gate (`hooks/git/*`)**: Real `git commit`, `git merge`, and `git push` events re-run the same engine with `--net`, adding `R3` authorship, `R5` agent branch checks, `R6` SSH cryptographic verification, and `known_content` checks against `git ls-remote` tips.

See the [Code Map](/en/docs/code-map) for exact source locations and maintainer entry points.
