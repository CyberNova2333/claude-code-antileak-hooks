# 配置矩阵、私有种子与排错 FAQ

## `policy/policy.json` 与运行时配置矩阵

`policy/policy.json` 是随包分发的唯一静态规则定义文件，刻意保持**不含任何私有仓库名称、内部域名或真实访问令牌**。以下列出核心配置键与环境变量对照：

| 配置键 / 环境变量 | 位置 / 载体 | 默认值或格式 | 职责说明 |
| --- | --- | --- | --- |
| `forbidden_patterns` | `policy/policy.json` | 正则数组（大小写不敏感） | **R2** 模型档位、版本标识与会话标签匹配规则 |
| `agent_branch_prefixes` | `policy/policy.json` | 15 个前缀（含 `claude/`、`codex/`、`openai/`、`cursor/` 等） | **R5** 禁止向任何 Agent 工作分支推送或删除 |
| `agent_provider_emails` | `policy/policy.json` | 4 个默认 noreply 邮箱 | **R3** 禁止作为 Git 作者或提交者使用 |
| `agent_signing_fingerprint` | `policy/policy.json` | `SHA256:...` 指纹串 | **R6** 拒绝与通用 Agent 密钥相同指纹的签名 |
| `signing_instructions` | `policy/policy.json` | 中文命令行指引 | R6 阻断时向终端输出生成个人 `ed25519` 密钥的步骤 |
| `secret_regexes` | `policy/policy.json` | 9 组凭据/私钥正则 | **R7** 匹配常见 Token 前缀、固定 39 位 Google key 与私钥头 |
| `private_cache` / `private_cache_ttl` | `policy/policy.json` | `/root/.claude/hooks/private-repos.json` / `21600` | 动态私有名单缓存位置与有效期（默认 6 小时） |
| `private_seed` | `policy/policy.json` | `/root/.claude/private-seed.json` | 本机离线私有种子文件路径（`bootstrap.sh` 改写为 `$GUARD/private-seed.json`） |
| `expected_owners` | `policy/policy.json` | `[]`（部署按需填写） | 声明刷新时必须覆盖看到至少 1 个私有仓的 Owner，防止空结果伪装健康 |
| `resolve_budget` / `resolve_cache_ttl` | `policy/policy.json` | `30` / `86400`（24 小时） | `--net` 下未知 `xxx-xxx` 候选的单名查询上限与正负缓存 TTL |
| `resolve_ignore` | `policy/policy.json`（可选合并） | 与内置 trailer/常用词集合并集 | 追加排除不会作为仓库名查询的 `xxx-xxx` 短语 |
| `resign_exempt` | `policy/policy.json`（可选） | 默认开启（设 `false` 关闭） | **push 模式**通过树签名或 `--stable` `patch-id` 豁免远端已有内容的重签扫描 |
| `GUARD_DIR` | 环境变量 | `$HOME/.claude/guardrails` | 覆盖 `bootstrap.sh` 的默认安装目标 `$GUARD` |
| `HOOK_PACKAGE_URL` / `GUARD_REPOS` | 环境变量 | 发布包 URL / 冒号分隔仓库路径 | 覆盖包下载地址；为额外仓库注入 `<repo>/.claude/settings.json` |
| `GUARD_SEED_B64` / `GUARD_SEED_JSON` | 环境变量 | Base64 或原始 JSON 字符串 | 无磁盘文件环境下注入私有种子内容 |
| `GH_TOKEN_1..N` / `GH_TOKEN` | 环境变量 | GitHub 只读 Metadata PAT | 可选 GitHub 私有仓来源（自动忽略占位符 `proxy-injected`） |
| 主托管平台来源键 | `policy.json` + 本机令牌文件或环境 | 详见 `policy/policy.json` 与 `hooks/refresh-private.py` | 启用时必须成功枚举全部可见组织与私有仓，失败即拒绝回写缓存 |

## 本机私有数据格式（仅限部署侧）

为防止敏感资产进入可分发压缩包或仓库历史，以下两个文件只放在 `$GUARD/`（权限建议 `600`）：

### 1. `private-seed.json`（R1 兜底 + R4 唯一来源）

```json
{
  "owners": ["your-org", "your-user"],
  "private": ["your-org/private-app"],
  "patterns": ["internal\\.example\\.invalid", "corp-pipeline-[a-z0-9]+"]
}
```

- **`owners`**：与 `policy.json` 的 `expected_owners` 合并作为覆盖校验清单；任一 owner 既不在 `private` 兜底列表又未从平台看到至少 1 个私有仓（仅见公开仓不算覆盖），`refresh-private.py` 将拒绝写出缓存。
- **`private`**：离线兜底私有仓清单（同时按 `owner/repo` 与裸名纳入检查）。
- **`patterns`**：**R4** 内部业务标识正则（如内部域名、流水线标识）的唯一来源。未配置该字段时，`doctor.py` 会提示 `[WARN]` 且 R4 不生效。

### 2. `sanitize-map.json`（历史清理脱敏映射）

供 `policy/msgcb-hygiene.py` 配合 `git filter-repo --message-callback` 清理历史提交消息中的敏感名称。若文件缺失或不可读，脚本直接以 `SystemExit` 拒绝执行，防止在不完整映射下改写历史。

## 多来源私有名单聚合与存量审计

`hooks/refresh-private.py` 采用“对等并集 + fail-closed 完整性校验”机制生成 `private-repos.json`，使用 `os.replace` 原子替换：
- 主托管平台（若配置了对应环境变量或本机令牌文件）、可选 GitHub（`GH_TOKEN_1..N` / `gh` CLI）与本地私有种子结果取并集；任一已显式配置令牌的来源若重试失败或遭限流，整体刷新立即退出 `1` 并保留原有缓存不覆盖。
- 若存在非空白列表但无 `expected_owners`，当聚合后的 `private` 为空时同样拒绝回写“空健康缓存”。
- 如需对现有仓库做一次性基线审计，可使用内置存量扫描脚本（缓存缺失时以退出码 `2` 拒绝审计，自动豁免当前 `origin` 远端对应仓库自身名称）：

```bash
# 扫描当前 HEAD 文本文件（前 8 KiB 无 NUL 字节）+ 全历史提交消息
python3 "$HOME/.claude/guardrails/hooks/scan-repo.py" /path/to/repo --scan-current

# 重量级审计：遍历每个历史提交的完整文件树
python3 "$HOME/.claude/guardrails/hooks/scan-repo.py" /path/to/repo --scan-history
```

## 部署与误报排错 FAQ

### Q1：Claude Code 提示缓存缺失或过期并拒绝写入，该如何恢复？
这是按设计工作的离线保护：所有 `PreToolUse` 钩子不携带 `--net`，绝不在工具调用期发起网络请求（否则超时后会被宿主视作无决策而直接放行）。请按错误提示先运行 `python3 $GUARD/hooks/refresh-private.py`（或检查平台令牌 / `GUARD_SEED_B64` 是否就位），确认刷新成功后重试操作。

### Q2：为何配置了 `gh` CLI 却依然报错、或私有仓未更新？
`refresh-private.py` 中只有已显式配置的 `GH_TOKEN_*` 和主托管平台令牌属于强契约来源（失败即阻断），未配置环境变量时仅靠 `gh` CLI 属于 best-effort，且不覆写空结果。若主要仓库位于其他托管平台或 GitHub 多组织下，请确认对应读权限令牌已正确写入运行环境或 `$GUARD/token-helper`。

### Q3：提交信息里只是列出受影响文件名，为什么被 `commit` 模式拦截？
Git 在执行 `commit-msg` 钩子时尚未剥离提交模板里的 `#` 状态注释行。`check.py commit` 已内置读取 `core.commentChar` 并在扫描前剔除注释行；若仍命中，请检查提交正文自身或作者身份（`GIT_AUTHOR_IDENT`）是否命中 R1–R4、供应商 noreply 邮箱或缺少 `Co-authored-by:`。

### Q4：正文中有一段 Base64 图片或音频编码，为何没有误报 `R2` 却触发了 `R7`？
这是出于安全权衡的差异化设计：`R2`（模型名称正则）启用了 `in_b64_run` 过滤器，当匹配完整落在 ≥ 24 位无分隔符的大小写数字混合编码串内部时自动跳过；而真实 API Token 与密钥本身就常表现为无分隔符的高熵字母数字串，因此 `R7` 凭据正则特意**不跳过** `in_b64_run`，确保不漏放真实泄露。另 `R7` 的 Google API Key 正则已收紧为前后无同类字符紧邻的固定 39 位格式（`AIza` + 35 位），尽量减少 Base64 切片误中。

### Q5：旧项目整仓补做 SSH 签名或 `rebase` 后，`pre-push` 会把历史旧文件全部重新扫描卡死吗？
不会。默认开启的 `known_content` 重签豁免会在 `--net` 下通过 `git ls-remote` 拉取远端真实顶点（防本地伪造跟踪引用），并核对新提交与远端已有提交的 `(tree, parent trees)` 树签名或 `git patch-id --stable`。若内容逐字节未变，仅跳过重复增行扫描，**仍会逐条强制复查 SSH 签名、作者邮箱与提交消息**。如确需禁用豁免，可在 `policy.json` 设置 `"resign_exempt": false`。

### Q6：在中文 Windows / GBK 环境或容器里钩子莫名退出或中文乱码怎么办？
确认使用原版包装入口而非手动绕开调用脚本——所有 shell 入口（`_lib.sh`、`bootstrap.sh`、Git 钩子）均导出 `PYTHONUTF8=1`，所有 Python 入口脚本也已在启动时重配置标准流为 UTF-8 并显式以 `encoding='utf-8'` 打开文件与管道。同时 `forbid-read-path.sh` 已支持 Windows 盘符路径（`C:\...`）归一化后再匹配敏感规则。
