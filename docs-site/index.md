---
layout: home
repoGuideSource: "repo-docs/README.md"

hero:
  name: Claude Code Antileak Hooks
  text: 本地防泄漏安全钩子与隐私守卫套件
  tagline: 针对 API Token、SSH 私钥、内网敏感地址与环境凭据建立严密的事前/事中/事后三重阻断机制。
  actions:
    - theme: brand
      text: 开启文档阅读
      link: /walkthroughs/one-real-run
    - theme: alt
      text: 架构代码地图
      link: /code-map
    - theme: alt
      text: GitHub 仓库
      link: https://github.com/CyberNova2333/claude-code-antileak-hooks

features:
  - title: 毫秒级凭据模式匹配
    details: 内置 OpenAI/Anthropic/AWS/GitHub 密钥、私钥指纹及私有 IPv4/IPv6 正则库，毫秒级快速扫描拦截。
  - title: Git 钩子与 CLI 深度协同
    details: 可同时作为本地 Git pre-commit / pre-push 门禁与 Claude Code 插件运行钩子，从源头阻断意外泄露。
  - title: 零网络上报，纯本地自闭环
    details: 所有的规则解析、内容匹配与判定裁决完全在本地机器完成，绝不向任何外部第三方服务器外传敏感内容。
---

## 这是什么

**Claude Code Antileak Hooks** 是用于防护 AI 辅助研发过程中机密凭据意外泄露的安全工具包。

在与 LLM 交互和自动化 Agent 代码修改过程中，配置文件、私钥文件或敏感环境信息极易被无意纳入提示词、上下文或 Git 提交树。本工具包在代码写入、提交暂存和推送远端的最前线设立防线，一旦发现高风险敏感字符串，立即熔断操作并给出脱敏建议。


## 架构全景

<div class="archify-diagram-card" style="margin: 1.5rem 0; border: 1px solid var(--vp-c-border); border-radius: 12px; overflow: hidden; background: var(--vp-c-bg-soft); box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
  <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; background: var(--vp-c-bg-elv); border-bottom: 1px solid var(--vp-c-border); font-size: 13px;">
    <span style="font-weight: 600; color: var(--vp-c-text-1); display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">📐</span> 代码防泄漏钩子审计流转（交互式架构图表，支持平移 / 缩放 / 探查）
    </span>
    <a href="/diagrams/antileak-workflow.html" target="_blank" rel="noreferrer" style="font-size: 12px; color: var(--vp-c-brand-1); text-decoration: none; font-weight: 500;">
      在新窗口全屏打开 ↗
    </a>
  </div>
  <iframe src="/diagrams/antileak-workflow.html" width="100%" height="520px" frameborder="0" style="display: block; border: none;" allowfullscreen loading="lazy"></iframe>
</div>

## 怎么用 / 快速上手

### 1. 本地安装与钩子挂载

```bash
# 进入工程目录安装钩子
pnpm install

# 将防泄漏钩子挂载到当前工作区 Git 仓库
node scripts/install-hooks.js --target /path/to/repo
```

### 2. 模拟泄漏测试与扫描

```bash
# 执行本地规则自检套件
node scripts/test-leak-detection.js
```

当检测到疑似私钥（如 `BEGIN PRIVATE KEY`）或敏感 Token 时，操作将被强制阻断并提示错误。

## 分层阅读与快速跳转

::: tip 按读者角色快速检索
- **初次接触 / 快速理解**：从[一条真实主流程](/walkthroughs/one-real-run)开始，追踪一次含有敏感凭据的提交尝试如何被拦截并触发熔断。
- **架构设计 / 模块定位**：从[代码地图](/code-map)进入，查阅规则匹配引擎（PatternMatcher）、Git 拦截器与审计日志生成机制。
- **审计复核 / 核心贡献**：从[源码证据](/references/source-evidence)核对拦截断言，查阅[阅读质量审计](/references/quality-review)了解支持的密钥类型与白名单规则。
:::

---

## 完整项目指南概览

<!--@include: ../repo-docs/README.md-->
