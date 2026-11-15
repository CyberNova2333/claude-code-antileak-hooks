# 钩子协议、R1–R7 规则与扩展 FAQ

## Claude Code 工具钩子 JSON 契约

根目录 `settings.json` 与 `policy/install-settings.py` 注册了 **6 个 `PreToolUse` 钩子**、**1 个 `SessionStart` 钩子**，并强制将 `attribution.sessionUrl` 设为 `false`。所有包装脚本共同遵守 `_lib.sh` 约定的精确契约：

| 匹配器与条件 | 脚本与超时 | 解析的 `tool_input` 字段 | 拦截目标 |
| --- | --- | --- | --- |
| `Write\|Edit\|NotebookEdit` | `forbid-content.sh` (`120s`) | `content` / `new_string` / `new_source` 及 `file_path` / `notebook_path` | 离线调用 `check.py content`，对新增正文做全套规则与缓存校验 |
| `Bash`（`if: Bash(git *)`） | `forbid-commit.sh` (`120s`) | `command` | 阻断 `--no-verify`、`-n`、`--no-gpg-sign`、篡改 hooks/签名配置、供应商 noreply 作者并扫描命令串 |
| `Bash`（`if: Bash(git *)`） | `forbid-push.sh` (`120s`) | `command` | 阻断 `--no-verify`、修改 `hooksPath`、向 `agent_branch_prefixes` 推送（含 `push -u origin claude/x`）并扫描命令串 |
| `Bash` | `forbid-read-secret.sh` (`30s`) | `command` | 提醒级阻断读取凭据文件、`env`/`printenv`、`os.environ`/`process.env`、`gh auth status -t` 与 `echo`/`printf` 凭据变量 |
| `Bash` | `forbid-tamper.sh` (`30s`) | `command` | 提醒级阻断修改 `core.hooksPath`、`disableAllHooks` 与删改 `$GUARD`、`.git/hooks/*` 或 `settings.json` |
| `Read\|Grep` | `forbid-read-path.sh` (`30s`) | `file_path` / `path` | 先按 `realpath` 归一并转换 Windows `\` 为 `/`，放行公钥与 `.env.example` 类模板后拦截私钥与令牌目录 |
| `SessionStart` | `refresh-private.py` (`120s`) | 无（独立进程） | 会话启动时后台联网更新动态私有名单缓存 |

### 关键响应语义（不输出 `allow` 与 Fail-Closed）

- **静默放行**：检查通过或无待检内容时，仅以退出码 `0` 结束且**不向 stdout 输出任何 JSON**。旧版曾输出 `permissionDecision: allow`，会导致 Claude Code 跳过原本的宿主权限弹窗，已被彻底废除（`doctor.py` 会专项校验该红线）。
- **明确拒绝**：命中规则、策略引擎返回 `error` 或 `stdin` JSON 解析出现 `__PARSE_ERROR__` 时，均向 stdout 输出拒绝 JSON、向 stderr 打印脱敏原因并以退出码 `2` 终止：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "[policy] 脱敏后的拒绝原因"
  }
}
```

## 策略引擎 CLI 与三态裁决契约

`policy/check.py` 是工具层和 Git 层共用的唯一裁决核心，仅向 stdout 输出 `pass`、`violation` 或 `error` 三个单词之一，明细输出至 stderr，并严格遵守**只有精确 `pass` 返回退出码 `0`**，其余一律返回 `1`：

| 子命令形态 | 调用方 | 输入载体 | `--net` 行为与补充检查 |
| --- | --- | --- | --- |
| `check.py content [file] [--net]` | `forbid-content.sh`（无 `--net`） / Git `pre-commit`（带 `--net`） | 指定文件路径或 stdin 正文 | 工具层缓存失效直接返回 `error`；Git 层先尝试原地刷新一次，再对缓存外候选词调用 `resolve-private.py` |
| `check.py commit [msgfile] [--net]` | Git `commit-msg`（带 `--net`） | 提交说明文件路径及 `GIT_AUTHOR_IDENT` | 先读取 `core.commentChar` 剥离注释行；检查 **R3**（禁止供应商邮箱、非根提交强制含 `Co-authored-by:`）与 `full_check` |
| `check.py push [remote] [--net]` | Git `pre-push`（带 `--net`） | stdin 四列 Git 引用协议 `<local_ref> <local_sha> <remote_ref> <remote_sha>` | 校验 **R5** 分支前缀（含删除引用）、查询 `ls-remote` 真实顶点获取新提交、校验 **R6** SSH 签名、**R3** 与新提交 `+` 新增行 |

## Git 钩子强制复查边界

当全局 `core.hooksPath` 指向 `$GUARD/hooks/git` 后，四支 Git 钩子全部携带 `--net` 承担最终兜底：

1. **`pre-commit`**：强制检查本地 `commit.gpgsign=true`、`gpg.format=ssh` 与 `user.signingkey` 已配置；直接通过 `ssh-keygen -lf` 提取当前签名公钥指纹并核对不等于 `policy.agent_signing_fingerprint`；随后仅提取 `ACMR` 暂存路径及 `diff` 中的 `+` 新增行交由 `check.py content --net` 审查，确保删除旧违规词的修复提交能够顺利通过。
2. **`pre-merge-commit`**：直接 `exec` 复用同级 `pre-commit`，补齐 `git merge` 产生合并提交时不触发 `pre-commit` 的漏洞。
3. **`commit-msg`**：把消息临时文件交给 `check.py commit --net`，对三态输出按 fail-closed 要求只放行精确 `pass`。
4. **`pre-push`**：把远端名与 stdin 引用交由 `check.py push --net`。`commit_signature` 会从每个新提交对象直接剥离 `gpgsig` 签名块，调用 `ssh-keygen -Y check-novalidate -n git` 密码学验签并比对公钥指纹，完全无需配置 `gpg.ssh.allowedSignersFile`（从而避免缺失该文件时 `%G?`/`%GK` 返回空值导致的误判或假阳性）。

## 规则与契约扩展 FAQ

### Q1：需要拦截新的内部关键词或私有服务正则，应该写进哪里？
绝对**不要**写入随包分发的 `policy/policy.json`，否则分发包自身或跨仓库提交就会把内部特征暴露并触发自指拦截。请写入部署侧 `$GUARD/private-seed.json`（或云端 `GUARD_SEED_B64`）的 `patterns` 字段，由 `refresh-private.py` 注入本地缓存生效。

### Q2：添加一个新的通用凭据格式或静态模型正则，有哪些关键步骤与注意事项？
可按顺序编辑 `policy/policy.json` 的 `secret_regexes` 或 `forbidden_patterns`（均为标准 Python 正则；`forbidden_patterns` 会在合并后启用 `re.I`）。新增高熵凭据格式时，建议在 `policy/check.py` 与 `hooks/scan-repo.py` 的 `CRED_PREFIX` 中同步确认脱敏逻辑（`mask`），保证命中时只输出前 8 个字符；新增模型正则时注意不要写出太宽泛的普通英文词组。

### Q3：增加新的 `PreToolUse` 包装脚本时，为什么必须使用独立文件名？
`policy/install-settings.py` 通过提取命令末尾脚本**文件名**（`os.path.basename`）去重，判断 `~/.claude/settings.json` 或仓库设置中是否已安装过该钩子。例如当初补充 `Read|Grep` 通道拦截时，若复用 `forbid-read-secret.sh` 会被误判为“已安装”而跳过注入，因此必须创建新文件名（`forbid-read-path.sh`）并在 `settings.json`、`install-settings.py` 与 `doctor.py` 中同步登记。

### Q4：为何 `forbid-read-path.sh` 不调用 `_lib.sh` 里的 `get_cmd()`？
`_lib.sh` 的 `get_cmd()` 会读取整个标准输入并只提取 `tool_input.command`（仅适用于 `Bash` 工具），而 `Read` 和 `Grep` 的参数字段是 `tool_input.file_path` 或 `tool_input.path`。因此 `forbid-read-path.sh` 自带 stdin JSON 解析并在需要拦截时调用 `_lib.sh` 的 `deny` / `pass` 函数，保持公共库改动最小。

### Q5：仓库里有一些合法的 `foo-bar` 短语总在 Git 提交时触发联网单名查询报错，怎么排除？
`policy/check.py` 通过 `RX_SLUG` 提取 ≥ 6 字符的 `xxx-xxx` 候选（自动忽略后跟 `:` 的 header/trailer 与不含两字母段的日期如 `2026-09-04`），并结合 `RESOLVE_IGNORE` 排除常规短语。如需长期跳过特定的中性复合词，可将其以小写形式加入 `policy/policy.json` 的 `resolve_ignore` 数组，或在非离线环境通过 `refresh-private.py` 确认网络与 API 令牌可用。
