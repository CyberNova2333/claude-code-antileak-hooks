---
title: 快速入门
description: Claude Code Antileak Hooks 是一套开箱即用的**敏感凭证与内部拓扑防泄漏 Git 钩子套件**。
---

# 快速入门

Claude Code Antileak Hooks 是一套开箱即用的**敏感凭证与内部拓扑防泄漏 Git 钩子套件**。

## 解决的核心痛点

- **痛点 1**：AI 编程助手在多轮生成代码时容易误将用户提供的真实 API Key 或内网域名写进文件
- **痛点 2**：传统预提交检查工具配置繁琐、误报率高，开发者容易习惯性跳过
- **痛点 3**：私钥或凭据一旦推送至公开仓库，即使随后 revert 历史提交依然留存

---

## 环境准备

Git 2.30+，Python 3.10+（本地预检运行时）。

---

## 快速安装与运行

```bash
# 1. 在任意 Git 仓库中一键安装钩子
git config core.hooksPath /path/to/claude-code-antileak-hooks/hooks

# 2. 模拟触发敏感信息检测
git add .
git commit -m "feat: 新增测试功能"

# 若检测到违规 Token，钩子将立刻返回退出码 1 并打印详细文件与行号
```

---

## 接下来探索

- 深入了解系统内部流转：查阅 [系统架构与设计](/docs/architecture)
- 探索全部配置参数与高级场景：查阅 [配置与使用指南](/docs/configuration)
- 遇到问题排错：查阅 [常见问题与排错](/docs/faq)
