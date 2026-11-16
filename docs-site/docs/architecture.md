---
repoGuideSource: repo-docs/walkthroughs/one-real-run.md
---

# 架构全景与主流程走读

## 分层设计概览

```text
Agent 工具调用 (Write / Edit / Bash / Read / Grep)
  └─▶ Claude Code PreToolUse（无 --net，30s–120s 超时窗口内快速阻断）
        ├─ 解析失败 / 违规 / 缓存缺失过期 ──▶ permissionDecision: deny JSON + exit 2
        └─ 精确 pass ────────────────────────▶ exit 0 安静放行（交回宿主权限流转）

Git 生命周期 (pre-commit / pre-merge-commit / commit-msg / pre-push)
  └─▶ Git 客户端钩子（带 --net，联网懒刷新 + 单名即时查询）
        └─▶ 统一策略引擎 policy/check.py (R1–R7 三态裁决 + ssh-keygen 验签)
              ├─ pass ──────────────────────▶ exit 0 允许提交或推送
              └─ violation / error ─────────▶ exit 1 并输出脱敏原因或签名指引
```

<DiagramFrame
  src="/diagrams/antileak-workflow.html"
  title="代码防泄漏钩子审计流转图（支持平移、缩放与节点点击查看）"
  aspect="997 / 652"
  new-tab-label="在新窗口全屏打开 ↗"
/>

## 主工作流走读

以下核心走读直接复用自仓库维护的源码指南 `repo-docs/walkthroughs/one-real-run.md`：

<!--@include: ../../repo-docs/walkthroughs/one-real-run.md{2,49}-->
