---
layout: home

hero:
  name: 代码防泄漏钩子
  text: 双层本地护栏与 Git 强校验
  tagline: 把 Claude Code 工具调用前拦截与 Git 提交/推送复查统一到同一套 R1–R7 策略引擎，在凭据、私有仓名与未签名提交进入仓库前完成 fail-closed 阻断。
  actions:
    - theme: brand
      text: 起步与配置部署
      link: /docs/
    - theme: alt
      text: API 与组件参考
      link: /api-reference/
    - theme: alt
      text: 接口与扩展契约
      link: /docs/contracts
    - theme: alt
      text: 架构全景与源码导览
      link: /docs/architecture

features:
  - title: 工具层与 Git 层双保险
    details: 6 个 PreToolUse 拦截器在 Write、Edit、NotebookEdit、Read、Grep 与 Bash 阶段离线快速介入，4 个 Git 钩子在提交、合并与推送阶段联网复查。
  - title: 静态与动态名单分离
    details: 随包分发的 policy.json 不含任何私有仓名或内部域名；私有列表与业务正则通过本机私有种子与托管平台 API 聚合为 6 小时 TTL 本地缓存。
  - title: 三态 Fail-Closed 与脱敏回显
    details: 策略引擎严格区分 pass、violation 与 error；放行保持安静不跳过宿主权限确认，命中凭据仅回显前 8 位与长度，并强制校验非通用 SSH 签名。
---

::: info 它能做到什么程度（已实现能力）
- 在 Claude Code 工具调用前通过 `6` 个离线 `PreToolUse` 包装器拦截高危写入、Secret 读取与护栏篡改（放行安静 `exit 0`，绝不输出 `permissionDecision: "allow"`）；配合 `SessionStart` 自动刷新动态名单。
- 在 Git `pre-commit`、`pre-merge-commit`、`commit-msg` 与 `pre-push`（`--net`）统一强制 `R1–R7`、`6h` TTL 缓存、非通用 `ed25519` SSH 签名直验（`ssh-keygen -Y check-novalidate`）与基于真实 `ls-remote` 的 `known_content` 重签豁免。
- 通过 [API 与组件参考](/api-reference/) 可按分类查阅每个 Hook 包装器、`policy/check.py`、`refresh-private.py`、`bootstrap.sh`、`doctor.py` 与 `scan-repo.py` 的参数契约与示例。
:::

::: warning 明确不做什么（边界与硬限制）
- **不替代平台受保护分支与强推拦截**：规则 `R5` 禁止推送至 `claude/`、`codex/` 等 `15` 个 Agent 分支前缀，但 `main` 分支保护和强推阻断有意交给 CNB / GitHub Rulesets。
- **不覆盖仅列举文件名的 `Glob` 调用**：`forbid-read-path.sh` 仅拦截可返回文件正文的 `Read` / `Grep`；高权限本机用户若绕过 Shell 提醒，最终强制防线为 Git 层钩子与远端权限隔离。
- **禁止直接将源码克隆目录作为运行目录**：源内脚本硬编码 `/root/.claude/...` 模板路径，必须经 `policy/bootstrap.sh` 改写至 `$GUARD`（且产品包钩子与本仓库维护脚本 `tools/repo_maintenance_guard.py` 严格分离）。
:::

## 架构全景图

<div class="archify-diagram-card" style="margin: 1.5rem 0; border: 1px solid var(--vp-c-border); border-radius: 12px; overflow: hidden; background: var(--vp-c-bg-soft); box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
  <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; background: var(--vp-c-bg-elv); border-bottom: 1px solid var(--vp-c-border); font-size: 13px;">
    <span style="font-weight: 600; color: var(--vp-c-text-1); display: flex; align-items: center; gap: 8px;">
      <span>📐</span> 代码防泄漏钩子审计流转（交互式架构图，支持平移、缩放与节点探查）
    </span>
    <a href="/diagrams/antileak-workflow.html" target="_blank" rel="noreferrer" style="font-size: 12px; color: var(--vp-c-brand-1); text-decoration: none; font-weight: 500;">
      在新窗口全屏打开 ↗
    </a>
  </div>
  <iframe src="/diagrams/antileak-workflow.html" width="100%" height="520px" frameborder="0" style="display: block; border: none;" allowfullscreen loading="lazy"></iframe>
</div>

## 安装状态自检速览

源码仓库本身预置了待改写的部署模板路径；正式使用需通过 `policy/bootstrap.sh` 铺设到 `$GUARD`（默认为 `$HOME/.claude/guardrails`）。在任何目录运行以下命令可只读检查本机接线与缓存健康度：

```bash
python3 policy/doctor.py
# 未铺设过的源码目录预期输出 Overall: DEGRADED；铺设且刷新缓存后预期 Overall: PASS
```

## 文档分层导航

::: tip 按照读者需求快速跳转
- **初次部署到本机 CLI 或云端容器**：阅读 [概览、边界与多环境部署](/docs/)，了解安装依赖、`bootstrap.sh` 铺设流程与只读自检 `doctor.py`；
- **需要调整设置、私有种子或排查误报/超时**：查阅 [配置矩阵、私有种子与排错 FAQ](/docs/configuration)，核对 `policy.json` 参数、多来源聚合逻辑、常见报错与 `known_content` 边界；
- **需要接入自定义规则或核对 JSON 输入输出契约**：查阅 [钩子协议、R1–R7 规则与扩展 FAQ](/docs/contracts)，获取 `PreToolUse`/`SessionStart` 载荷、`check.py` CLI 契约与规则定制要点；
- **想看懂整体架构、主流程走读或查找源码目录**：查阅 [架构全景与主流程走读](/docs/architecture)、[代码地图与维护守卫区分](/docs/code-map) 与 [版本变更与迁移记录](/docs/changelog)。
:::
