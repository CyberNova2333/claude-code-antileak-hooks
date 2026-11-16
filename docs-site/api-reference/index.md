---
layout: page
sidebar: false
title: API 与组件参考
description: Claude Code Antileak Hooks 的 6 个 PreToolUse 离线包装器、4 个 --net Git 钩子、R1–R7 策略引擎与 bootstrap/doctor/scan-repo 运维 CLI 参考。
---

<script setup lang="ts">
import { apiSpecZh } from '../.vitepress/data/api-spec'
</script>

<ApiExplorer :spec="apiSpecZh">

### Claude PreToolUse (6) & SessionStart (1) 钩子包装层 (`settings.json`) {#pretooluse-wrappers}

`forbid-{content,commit,push,read-secret,tamper,read-path}.sh` 严格离线运行（不传 `--net`），放行安静退出 `0`，解析异常或命中违规输出 deny JSON 并退出 `2`。故意不覆盖仅返回路径名的 `Glob`。

### 统一策略引擎与 R1–R7 规则判定 (`policy/check.py`) {#policy-check-engine}

接受 `content|commit|push [target] [--net]` 参数，输出严格三态 `pass` / `violation` / `error`，具备 24 字符 Base64 降噪、前 8 位凭据脱敏与基于 `ssh-keygen -Y check-novalidate` 的直接 SSH 验签。

### Git 全局四支强校验钩子 (`hooks/git/*`) {#git-hooks-layer}

覆盖 `pre-commit`、`pre-merge-commit`、`commit-msg` 与 `pre-push`，携带 `--net` 执行最终提交内容、作者、Agent 分支拦截（R5）与签名检验。

### 多平台私有仓名单融合与单名解析 (`refresh-private.py` / `resolve-private.py`) {#private-list-sync}

融合本地 `private-seed.json`（或云端 `GUARD_SEED_B64`）、CNB OpenAPI 与可选 GitHub 令牌构建 6 小时动态缓存与 24 小时单名解析缓存；R4 正则仅来源于本地种子。

### 幂等铺设、Settings 合并与可选 token-helper (`bootstrap.sh` / `install-settings.py`) {#bootstrap-and-install}

改写模板路径 `/root/.claude/...` 至 `$GUARD`，跨升级保留私有文件与缓存，支持 `--exclude-untracked` 写入 `.git/info/exclude`。

### 只读自检 `doctor.py`、存量审计 `scan-repo.py` 与维护守卫区分 {#doctor-and-scan-repo}

核验部署完整性与仓库基线，并将产品包钩子与仅用于本源码仓自身的 `tools/repo_maintenance_guard.py` 严格隔离。

</ApiExplorer>
