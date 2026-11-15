# 代码地图

先通过[一次真实工具写入判定](walkthroughs/one-real-run.md)理解主路径上的阶段交接，再按本页的目录职责与专题模块快速定位具体源码。

| 路径 | 职责 | 关键代码 | 与主流程的关系 |
| --- | --- | --- | --- |
| `hooks/` | Claude Code 事件包装、读路径保护、动态名单刷新、单名解析与存量审计 | [双层钩子包装与交互契约](modules/hook-wrappers.md)、[动态私有名单刷新机制](modules/private-list-sync.md) | 截获工具调用并做快速离线阻断，或在会话启动/联网层刷新名单 |
| `hooks/git/` | Git 客户端强制钩子入口（预提交、预合并、提交信息、推送复查） | [双层钩子包装与交互契约](modules/hook-wrappers.md) | 带 `--net` 对真实 Git 对象、作者署名与 SSH 签名做最终强制门禁 |
| `policy/` | 统一策略引擎、静态规则集、部署铺设、设置注入、凭证编译辅助与一键自检 | [策略引擎判据](modules/policy-engine.md)、[部署安装与自检机制](modules/deployment-and-checks.md) | 承担唯一规则裁决，并负责将包内模板路径改写并接线到宿主和 Git |
| `tools/` | 本仓库自身的离线维护安全守卫（对象扫描、Conventional Commits 校验、精确哈希白名单） | [repo_maintenance_guard.py](../tools/repo_maintenance_guard.py) | 仅保护维护本仓库自身提交，独立于分发部署的产品防泄漏套件 |

## `hooks/`

| 重要代码 | 功能 | 关键符号 | 调用方 / 使用方 |
| --- | --- | --- | --- |
| [hooks/_lib.sh](../hooks/_lib.sh) | 公共环境设置（`PYTHONUTF8=1`）、安静放行 `pass`、`deny` JSON 输出与命令读取 | `pass`、`deny`、`get_cmd`、`engine_content` | 各 `.sh` 包装脚本 |
| [hooks/forbid-content.sh](../hooks/forbid-content.sh) | 拦截 `Write` / `Edit` / `NotebookEdit` 工具写入payload并委托 `check.py content` | `PreToolUse`、`__PARSE_ERROR__` | Claude Code 设置模板 |
| [hooks/forbid-commit.sh](../hooks/forbid-commit.sh) | 阻断 `--no-verify`、`-n`、`--no-gpg-sign`、篡改配置、提供商邮箱及命令违规词 | `get_cmd`、`engine_content` | Claude Code `Bash(git *)` |
| [hooks/forbid-push.sh](../hooks/forbid-push.sh) | 阻断推送到 `agent_branch_prefixes` 分支及绕过标志，并扫描推送命令文本 | `agent_branch_prefixes`、`engine_content` | Claude Code `Bash(git *)` |
| [hooks/forbid-read-secret.sh](../hooks/forbid-read-secret.sh) | 提醒级拦截读取本地令牌文件、`env`、`os.environ`、`process.env`、`gh auth status -t` 等暴露命令 | `get_cmd`、`deny` | Claude Code `Bash` |
| [hooks/forbid-read-path.sh](../hooks/forbid-read-path.sh) | 针对 `Read` / `Grep` 对绝对路径做 `realpath` 与 Windows 反斜杠归一，放行公钥白名单并拦截敏感文件 | `file_path`、`path`、`SENSITIVE` | Claude Code `Read\|Grep` |
| [hooks/forbid-tamper.sh](../hooks/forbid-tamper.sh) | 拦截改动 `core.hooksPath`、`disableAllHooks` 与删改 `$GUARD` 目录或 `settings.json` | `BASE`、`HOMEDIRS` | Claude Code `Bash` |
| [hooks/refresh-private.py](../hooks/refresh-private.py) | 聚合本机种子、主托管平台 API 与可选 GitHub 来源，执行完整性校验后原子写缓存 | `collect`、`all_tokens`、`fail` | `SessionStart`、`check.py` `--net`、`bootstrap.sh` |
| [hooks/resolve-private.py](../hooks/resolve-private.py) | 对缓存外 `xxx-xxx` 与已知 owner 候选按成功来源即时查询，并维护 24 小时正负缓存 | `resolve_github`、`merge`、`main` | `check.py` `--net`、`scan-repo.py` |
| [hooks/scan-repo.py](../hooks/scan-repo.py) | 基于动态缓存与二进制嗅探对当前树或 `--scan-history` 全历史树做存量审计 | `scanbytes`、`is_text`、`keep` | 人工显式审计与基线清理 |

## `hooks/git/`

| 重要代码 | 功能 | 关键符号 | 调用方 / 使用方 |
| --- | --- | --- | --- |
| [hooks/git/pre-commit](../hooks/git/pre-commit) | 强制 `commit.gpgsign=true`、`gpg.format=ssh` 与非通用指纹，扫描 `ACMR` 暂存路径及 `+` 新增行 | `check.py content --net`、`ssh-keygen` | Git 全局 `core.hooksPath` |
| [hooks/git/pre-merge-commit](../hooks/git/pre-merge-commit) | 直接 `exec` 转发到同目录 `pre-commit`，补齐 `git merge` 触发缺口 | `exec` | Git `pre-merge-commit` |
| [hooks/git/commit-msg](../hooks/git/commit-msg) | 提交信息与作者检查入口，传递提交消息文件并强制三态 fail-closed | `check.py commit --net` | Git `commit-msg` |
| [hooks/git/pre-push](../hooks/git/pre-push) | 把 remote 名与标准输入 refs 交给引擎核查未推送提交与分支规则 | `check.py push --net` | Git `pre-push` |

## `policy/`

| 重要代码 | 功能 | 关键符号 | 调用方 / 使用方 |
| --- | --- | --- | --- |
| [policy/check.py](../policy/check.py) | 唯一策略引擎：提供 `content` / `commit` / `push` 三模式、R1–R7 规则、SSH 验签与重签豁免 | `full_check`、`private_check`、`resolve_unknown`、`commit_signature`、`known_content`、`cmd_push` | Claude 包装脚本、Git 钩子、`scan-repo.py` |
| [policy/policy.json](../policy/policy.json) | 可分发静态策略配置：定义 `forbidden_patterns`、`secret_regexes`、`agent_branch_prefixes`、指纹、邮箱与 TTL 参数 | `R1`–`R7` 参数、`resolve_budget` | `check.py`、`doctor.py`、`forbid-*.sh` |
| [policy/bootstrap.sh](../policy/bootstrap.sh) | 解包到 `$GUARD`、保护本机私有文件、用 `sed` 改写模板路径并配置 Git 与 Claude 设置 | `PKG_URL_DEFAULT`、`HOOK_PACKAGE_URL`、`GUARD_REPOS` | 本机终端与云端容器 Setup Script |
| [policy/install-settings.py](../policy/install-settings.py) | 向 `~/.claude/settings.json` 或仓库设置幂等合并 6 个 `PreToolUse`、1 个 `SessionStart` 与 `attribution.sessionUrl=false` | `HOOKS`、`ATTRIB`、`git_exclude_if_untracked` | `bootstrap.sh` 与手动设置接线 |
| [policy/doctor.py](../policy/doctor.py) | 从自身位置推算 `$GUARD`，只读检查设置接线、Git 钩子、名单健康与 SSH 签名配置 | `Overall`、`ok`、`warn` | `bootstrap.sh` 末尾及人工排错 |
| [policy/build-secure-token.py](../policy/build-secure-token.py) | 读取令牌源码模板并注入 `$GUARD_PKG_URL`，生成 32 字节随机会话密钥 XOR 混淆的 C++ 源码 | `enc`、`DEFAULT_PKG_URL` | 构建本机 `token-helper` ELF 时使用 |
| [policy/token-helper.cpp](../policy/token-helper.cpp) | 仅作本机编译用的凭证数据源模板，运行时解密写入环境变量并 `exec` 子进程 | `TOKENS` | 配合 `build-secure-token.py` 交叉编译 |
| [policy/msgcb-hygiene.py](../policy/msgcb-hygiene.py) | `git filter-repo --message-callback` 历史消息中性化回调，依赖本机 `sanitize-map.json` | `sanitize-map.json` | 历史清理迁移工作流 |

## `tools/`

| 重要代码 | 功能 | 关键符号 | 调用方 / 使用方 |
| --- | --- | --- | --- |
| [tools/repo_maintenance_guard.py](../tools/repo_maintenance_guard.py) | 本仓库专用离线安全扫描与提交标题格式检查器，支持按对象与精确 SHA-256 白名单审计 | `staged`、`message_problems`、`pushed`、`blocked_path`、`install` | 仅维护本仓库的本地维护钩子 |
| `tools/repo_maintenance_hooks` | 仓库内本地安装目录，包含 [pre-commit](../tools/repo_maintenance_hooks/pre-commit)、[commit-msg](../tools/repo_maintenance_hooks/commit-msg) 与 [pre-push](../tools/repo_maintenance_hooks/pre-push) 启动器 | `repo_guard_python` | 执行 `install` 后由本克隆局部 `core.hooksPath` 调用 |

## 修改入口与常见陷阱

- 需要增减静态禁止正则、凭据正则或 Agent 分支前缀：先改[策略配置](../policy/policy.json)，并在[策略引擎](../policy/check.py)的 `scan` 或 `cmd_push` 中核对匹配方式（例如 `R2` 受 `in_b64_run` 影响而 `R7` 不受影响）。
- 需要调整 Claude Code 工具拦截与 JSON 契约：同步核对[配置模板](../settings.json)、[设置注入脚本](../policy/install-settings.py)（去重依赖脚本文件名）与[公共辅助](../hooks/_lib.sh)，避免新包装脚本因复用旧文件名而被 `install-settings.py` 跳过。
- 需要排查本仓库自身提交为什么被拒：注意区分`tools/repo_maintenance_guard.py`（检查提交标题是否符合 Conventional Commits 及本地对象）与`$GUARD/hooks/git/*`（已安装产品的全局防泄漏钩子）；本仓库的[自检脚本](../policy/doctor.py)会在启用了本地 `tools/repo_maintenance_hooks` 时明确提示全局钩子被局部覆盖。

## 覆盖范围

本指南已覆盖仓库中除文档载体以外的全部核心运行源码，包括[配置模板](../settings.json)中的 6 个 `PreToolUse` + 1 个 `SessionStart` 接线定义；根目录的[项目元数据](../meta.json)仅作为个人主页展示索引未作业务修改。

以下边界不在本仓库源码中直接分发或未在本轮执行：
- 运行时本地隐私文件（`$GUARD/private-seed.json`、`$GUARD/sanitize-map.json`、`private-repos.json`、`.resolve.json` 与编译产物 `token-helper`）只存在于部署侧，绝不进入仓库。
- `docs-site/` 为 VitePress 文档发布载体，`.github/workflows/` 负责发布工作流，均不参与防泄漏拦截判定。
- 本轮验证边界为源码核对、`validate_repo_docs.py` 与 VitePress 静态构建；未在本机执行 `bootstrap.sh` 安装、远端 API 刷新或 Git 历史改写。完整源码依据见[源码证据审计](references/source-evidence.md)，关键术语定义见[项目术语表](glossary.md)。

证据状态：除特别标注外，本页基于当前源码已确认。
