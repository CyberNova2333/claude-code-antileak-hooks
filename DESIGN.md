---
version: 2.0.0
name: Claude Code Antileak Hooks Primer Tactile Design System
description: 面向 Agent 协作与 Git 提交内容安全防泄密护栏（claude-code-antileak-hooks）的 Primer 质感设计系统规范。将 GitHub Primer 功能原语与高对比度终端安全盾牌（Security Shield）美学深度融合，定义拦截阻断面板、Diff 敏感词高亮条、签名验真徽章与控制台输出规范。
colors:
  primary: '#0969da'
  accent-fg: '#0969da'
  accent-emphasis: '#0969da'
  accent-subtle: '#ddf4ff'
  accent-dark-fg: '#2f81f7'
  canvas-default: '#ffffff'
  canvas-overlay: '#ffffff'
  canvas-inset: '#f6f8fa'
  canvas-subtle: '#f6f8fa'
  canvas-dark-default: '#0d1117'
  canvas-dark-overlay: '#161b22'
  canvas-dark-inset: '#010409'
  canvas-dark-subtle: '#161b22'
  fg-default: '#1f2328'
  fg-muted: '#57606a'
  fg-on-emphasis: '#ffffff'
  fg-dark-default: '#f0f6fc'
  fg-dark-muted: '#8b949e'
  border-default: '#d0d7de'
  border-muted: '#d8dee4'
  border-dark-default: '#30363d'
  border-dark-muted: '#21262d'
  success-fg: '#1a7f37'
  success-emphasis: '#1f883d'
  success-subtle: '#dafbe1'
  success-dark-fg: '#3fb950'
  danger-fg: '#cf222e'
  danger-emphasis: '#cf222e'
  danger-subtle: '#ffebe9'
  danger-dark-fg: '#f85149'
  attention-fg: '#9a6700'
  attention-subtle: '#fff8c5'
  attention-dark-fg: '#d29922'
typography:
  body-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  body-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  ui-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4285
    letterSpacing: 0px
  heading-section:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0px
  code-inline:
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 3px
  md: 6px
  lg: 8px
  pill: 9999px
spacing:
  none: 0px
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
components:
  guard-block-banner:
    backgroundColor: '{colors.danger-subtle}'
    textColor: '{colors.danger-fg}'
    typography: '{typography.body-md}'
    rounded: '{rounded.md}'
    padding: '{spacing.md}'
  shield-badge:
    backgroundColor: '{colors.success-subtle}'
    textColor: '{colors.success-fg}'
    typography: '{typography.code-inline}'
    rounded: '{rounded.pill}'
    padding: '{spacing.xxs}'
---

# Claude Code Antileak Hooks 质感设计系统规范 (`DESIGN.md`)

本文档是 [`claude-code-antileak-hooks`](file:///D:/Projects/CyberNova2333/git-repos/claude-code-antileak-hooks) 的设计系统规范。针对 Git 提交钩子与 Claude Code 工具拦截器，基于 GitHub Primer 功能原语融合**开发者安全护栏与终端物理盾牌美学（Developer Guardrail & Terminal Shield Materiality）**，定义终端拦截提示框、敏感 Diff 审计面板与验证徽章的物理视觉规范。

---

## 1. 核心设计哲学与物理质感

1. **终端 ANSI 与 Primer 双轨质感（Terminal ANSI & Primer Dual-Track）**：
   - 终端 CLI 输出对齐 Primer 调色阶梯：警报红（ANSI Red `#cf222e` / `#f85149`）、通行绿（ANSI Green `#1a7f37` / `#3fb950`）、警示黄（ANSI Yellow `#9a6700` / `#d29922`）。
   - 终端拦截提示采用双线加粗边框（`╔═╗ / ║ / ╚═╝`），带有物理防暴门的重型工业感。
2. **审计 Diff 物理凹凸边界（Diff Audit Embossing）**：
   - 在 Web 审计与文档报告中，触发泄密规则的代码行被框定在沉降凹槽内，带有左侧 `3px solid var(--danger-fg)` 物理警示立柱与顶边缘微光。
3. **签名印章实体感（Signed Commit Seal）**：
   - 验证通过的 SSH 签名与规范作者署名附带激光压印微章，具备微微内凸的立体感。

---

## 2. 调色板与语义 Token

### 2.1 W3C `$value/$type` Token 注册表

| Primer 功能 Token | Light `$value` | Dark `$value` | 安全语义与终端映射 |
| :--- | :--- | :--- | :--- |
| `canvas.default` | `#ffffff` | `#0d1117` | 审计卡片主体 |
| `canvas.inset` | `#f6f8fa` | `#010409` | 终端代码内凹沉槽、私有规则白名单库 |
| `canvas.subtle` | `#f6f8fa` | `#161b22` | 规则分组列表头、过滤参数项 |
| `fg.default` | `#1f2328` | `#f0f6fc` | 拦截原因明细、提交标题 |
| `fg.muted` | `#57606a` | `#8b949e` | 规则名称、触发文件路径、行号偏移量 |
| `border.default` | `#d0d7de` | `#30363d` | 容器物理边框（1px solid） |
| `success.fg` | `#1a7f37` | `#3fb950` | 签名合规、无敏感泄漏通行 |
| `attention.fg` | `#9a6700` | `#d29922` | 模糊匹配嫌疑、待人工确认提示 |
| `danger.fg` | `#cf222e` | `#f85149` | 违规内容强行阻断（git reject）、泄密关键词命中 |

---

## 3. 字体栈与空间规范

- **工程字体栈（`--font-sans`）**：`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`
- **等宽数据字体（`--font-mono`）**：`ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`
- **排版要求**：正文 `14px`，敏感词比对、正则表达式与 Git Commit SHA 必须使用 `12px` 等宽排印。

---

## 4. 核心安全护栏约束

1. **强行拦截与不可篡改**：当检测到私有密钥、凭证泄露风险时，强行以 Exit Code 1 阻断提交，控制台渲染明确的错误提示框。
2. **零环境外传**：规则引擎与缓存读取完全在本地沙盒执行，不向任何未授权第三方回传代码片段。
3. **合规署名徽章**：严格要求签名私钥匹配与规范的合作者署名尾注，确保提交追溯性。
