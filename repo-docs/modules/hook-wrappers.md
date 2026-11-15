# 双层钩子包装与交互契约

本仓库的防护动作拆分为两个彼此独立又互相兜底的层次：第一层在 Agent 工具调用瞬间介入以提前阻断误写入与凭据暴露，第二层在 Git 提交、合并和推送边界强制核验真实仓库对象。

主流程的[Step 1 与 Step 4](../walkthroughs/one-real-run.md#step-1-从工具事件取出真正的新增内容)体现了工具包装的最小闭环。拆层的核心压力在于两层运行环境完全不同：Claude Code 钩子一旦因为网络请求超过宿主超时时限，就会被宿主按“无决策”放行；而 Git 钩子可以同步等待网络检查并且必须检查历史差异与签名。

## Claude Code 工具钩子通道

根目录[设置模板](../../settings.json)与[设置注入脚本](../../policy/install-settings.py)共同定义了 6 个 `PreToolUse` 拦截器与 1 个 `SessionStart` 刷新钩子，同时把 `attribution.sessionUrl` 设为 `false`：

| 匹配工具与条件 | 包装脚本 | 超时 | 拦截机制与重点边界 |
| --- | --- | --- | --- |
| `Write\|Edit\|NotebookEdit` | [内容包装](../../hooks/forbid-content.sh) | 120s | 提取 `content` / `new_string` / `new_source`，调用离线 `check.py content` |
| `Bash`（条件 `Bash(git *)`） | [提交包装](../../hooks/forbid-commit.sh) | 120s | 阻断 `--no-verify`、`-n`、`--no-gpg-sign`、篡改配置、提供商邮箱及命令串违规词 |
| `Bash`（条件 `Bash(git *)`） | [推送包装](../../hooks/forbid-push.sh) | 120s | 阻断 `--no-verify`、向 `agent_branch_prefixes` 分支推送（含 `git push -u origin claude/...` 形态）及命令串扫描 |
| `Bash` | [防读凭据包装](../../hooks/forbid-read-secret.sh) | 30s | 提醒级拦截读取本地令牌文件、`env`/`printenv`、`os.environ`、`gh auth status -t` 与 `echo`/`printf` 凭据变量 |
| `Bash` | [防篡改包装](../../hooks/forbid-tamper.sh) | 30s | 拦截改动 `core.hooksPath`、`disableAllHooks` 及删改安装后护栏目录与配置文件 |
| `Read\|Grep` | [读路径拦截包装](../../hooks/forbid-read-path.sh) | 30s | 自带 JSON 解析取 `file_path` / `path`，`realpath` 归一化后把 Windows 反斜杠转为 `/` 再匹配敏感路径 |
| `SessionStart` | [名单刷新脚本](../../hooks/refresh-private.py) | 120s | 会话启动时离线外联网拉取最新私有名单缓存，避免工具执行期缓存过期 |

其中最容易踩坑的是[公共辅助](../../hooks/_lib.sh)的放行语义和[读路径拦截包装](../../hooks/forbid-read-path.sh)的跨平台归一：

```text
工具事件 stdin JSON
  ├─ 解析失败 ─────────────────────▶ deny JSON + exit 2（fail closed）
  ├─ 放行（pass / 无关命令 / 白名单）─▶ 无 stdout 输出 + exit 0（不发射 allow）
  └─ 命中规则或引擎返回 error ───────▶ deny JSON + exit 2 + stderr 原因
```

放行时不输出 `permissionDecision: allow` 是为了不跳过宿主自带的权限弹窗；`forbid-read-path.sh` 专门处理 `Read` / `Grep` 通道是因为它们使用 `file_path` / `path` 而不是 `command`，且需显式放行 `*.pub`、`authorized_keys`、`known_hosts`、`.ssh/config` 与 `.env.example` 等非机密文件以减少日常误报。

## Git 钩子强制复查边界

在全局 `core.hooksPath` 指向安装后的 `hooks/git` 目录后，四支 Git 钩子会带着 `--net` 调用策略引擎完成最终把关：

| Git 事件 | 钩子脚本 | 与工具层的职责差异 | 代表性边界处理 |
| --- | --- | --- | --- |
| `pre-commit` | [预提交钩子](../../hooks/git/pre-commit) | 强制校验 `commit.gpgsign=true`、`gpg.format=ssh` 与签名指纹非通用密钥；仅提取 `ACMR` 暂存路径与新增 `+` 行交 `check.py content --net` | 只扫新增行而不扫被删 `-` 行，确保清理违规词的修复提交能顺利通过 |
| `pre-merge-commit` | [预合并钩子](../../hooks/git/pre-merge-commit) | 合并产生新提交时直接 `exec` 复用 `pre-commit` | 补齐普通 `git merge` 不触发 `pre-commit` 的缺口 |
| `commit-msg` | [提交信息钩子](../../hooks/git/commit-msg) | 调用 `check.py commit <msgfile> --net` 核验正文、作者邮箱与 `Co-authored-by:` | 非首条提交缺少协作署名或消息含违规词即拒绝 |
| `pre-push` | [推送钩子](../../hooks/git/pre-push) | 将 remote 名与 stdin refs 交给 `check.py push <remote> --net` | 结合远端真实顶点跳过已存提交与重签豁免，未签名提交或推向 Agent 分支一律阻断 |

注意仓库里还存在一套[本地仓库维护守卫](../../tools/repo_maintenance_guard.py)，仅供克隆本仓库的开发者在本地执行 `pre-commit`、`commit-msg` 与 `pre-push` 离线扫描（包含 Conventional Commits 格式与 `.repo-security-allowlist.json` 例外校验），它属于仓库自身维护工具，与分发部署出去的防泄漏产品钩子互不混淆。

## 验证钩子协议的最小样本

在不改动系统配置的前提下，可用伪造的空工具 JSON 验证内容包装对未知输入或合法空内容的退出码差异：

```sh
printf '{"tool_input":{"file_path":"demo.txt","content":""}}' | bash hooks/forbid-content.sh
printf '{invalid-json' | bash hooks/forbid-content.sh
```

第一条对空内容安静退出 0；第二条因解析失败返回 exit 2 并在 stdout 输出 `permissionDecision: deny`。实际安装环境下需进一步配合[部署安装与自检机制](deployment-and-checks.md)核对路径改写与超时配置，或回到[策略引擎判据](policy-engine.md)对照内部报错细节。

证据状态：除特别标注外，本页基于当前源码已确认。
