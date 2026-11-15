# 项目术语表

本页汇总阅读本仓库源码与架构说明时高频出现的核心概念、规则编号与关键环境变量，方便与源码实现对齐理解。

| 术语 | 项目里的意思 | 延伸阅读 |
| --- | --- | --- |
| `R1`–`R7` | 策略引擎执行的七组规则：私有仓名与动态解析（R1）、模型与会话标记（R2）、作者邮件与 `Co-authored-by:` 署名（R3）、私有业务标识正则（R4）、禁用 Agent 分支前缀（R5）、非通用密钥 SSH 签名校验（R6）与凭据/私钥正则（R7） | [策略引擎模块](modules/policy-engine.md) |
| `PreToolUse` / `SessionStart` | Claude Code 提供的两个钩子生命周期事件：`PreToolUse` 在工具调用前执行拦截（匹配 `Write` / `Edit` / `NotebookEdit`、`Bash`、`Read` / `Grep`），`SessionStart` 在会话初始化时运行 `refresh-private.py` | [双层钩子包装模块](modules/hook-wrappers.md) |
| `Pass` / `VIOLATION` / `ERROR` | 策略引擎内部及命令行返回的三种裁决状态（输出为 `pass`、`violation`、`error`）；只有精确等于 `pass` 时以退出码 `0` 放行，其余全部阻断（fail-closed） | [策略引擎模块](modules/policy-engine.md) |
| `Fail-closed` | 保守失败原则：当 JSON 无法解析、动态名单缓存缺失/过期、`ssh-keygen` 不可用或正则异常时，一律视作拒绝或错误退出，绝不静默返回通过 | [一次工具写入判定](walkthroughs/one-real-run.md) |
| `PASS` / `FAIL` / `WARN` / `DEGRADED` | 一键自检脚本 `doctor.py` 输出的检查项状态及汇总结论 `Overall`；任一必选项未通过即返回 `Overall: DEGRADED` 并退出码 `1` | [部署安装与自检模块](modules/deployment-and-checks.md) |
| `$GUARD`（`GUARD_DIR`） | 护栏安装目录环境变量，默认值为 `$HOME/.claude/guardrails`；`bootstrap.sh` 会把包内的模板路径改写为该目录 | [部署安装与自检模块](modules/deployment-and-checks.md) |
| `GUARD_REPOS` / `HOOK_PACKAGE_URL` / `PKG_URL_DEFAULT` | `bootstrap.sh` 使用的部署参数：`HOOK_PACKAGE_URL` 与默认包地址 `PKG_URL_DEFAULT` 指定发布包位置；`GUARD_REPOS` 以冒号分隔附加需要注入仓库级设置的仓库路径 | [部署安装与自检模块](modules/deployment-and-checks.md) |
| `GUARD_SEED_B64` / `GUARD_SEED_JSON` | 在容器或云端无本地文件挂载时，通过环境变量传入私有种子 `private-seed.json` 内容的两种载体 | [动态私有名单同步模块](modules/private-list-sync.md) |
| `GUARD_PKG_URL` | 编译 `token-helper` 时通过环境变量向 `build-secure-token.py` 注入 `PKG_URL_DEFAULT`，防止把含私有仓名的下载地址写死进仓库源码 | [部署安装与自检模块](modules/deployment-and-checks.md) |
| `GH_TOKEN_1..N` / `GH_TOKEN` / `gh` CLI | 可选 GitHub 私有仓数据源：支持多所有者只读令牌及 `gh` CLI，与主托管平台数据源取并集 | [动态私有名单同步模块](modules/private-list-sync.md) |
| `TTL` | 缓存有效期；本项目中动态私有名单缓存默认为 21600 秒（6 小时），单名解析正负缓存默认为 86400 秒（24 小时） | [动态私有名单同步模块](modules/private-list-sync.md) |
| `R1` 单名即时查询（`resolve_budget`） | 当 `--net` 模式下发现不在缓存内的 `xxx-xxx` 或已知 owner 的 `owner/repo` 候选时，若候选数不超过 `resolve_budget`（默认 `30`），交由 `resolve-private.py` 逐个查询并写入 24 小时缓存；超出则改为整体刷新一次名单 | [动态私有名单同步模块](modules/private-list-sync.md) |
| `in_b64_run` | `check.py` 在评估 `R2` 时使用的过滤函数：当命中切片落在长度 ≥ 24、无分隔符且同时包含大小写字母与数字的连续串中时跳过，降低图片/音频编码误报 | [策略引擎模块](modules/policy-engine.md) |
| `known_content` / `resign_exempt` | `push` 模式下的重签豁免逻辑：在 `--net` 取回 `ls-remote` 真实顶点后，通过树签名或 `--stable` `patch-id` 验证新提交与远端已有提交内容逐字节一致，从而跳过重复正文的 `R1`/`R2`/`R4`/`R7` 扫描（仍逐条核查签名、作者与消息） | [策略引擎模块](modules/policy-engine.md) |
| `permissionDecision` / `attribution.sessionUrl` | Claude Code 设置项与钩子输出契约：通过时**不输出** `permissionDecision: allow`（避免跳过用户权限确认），拒绝时输出 `permissionDecision: deny`；部署时将 `attribution.sessionUrl` 设为 `false` | [双层钩子包装模块](modules/hook-wrappers.md) |
| `core.hooksPath` | Git 钩子目录配置：产品部署设置全局指向 `$GUARD/hooks/git`；维护本仓库自身时则会将其设为仓库局部 `tools/repo_maintenance_hooks` | [代码地图](code-map.md) |
| `commit.gpgsign=true` / `gpg.format=ssh` | R6 强制要求的 Git 签名配置，配合 `user.signingkey` 生成 SSH 提交签名，由 `pre-commit`、`check.py` 与 `doctor.py` 检查 | [策略引擎模块](modules/policy-engine.md) |
| `core.commentChar` | Git 提交消息注释前缀配置（默认 `#`）；`check.py commit` 先按该配置剥除注释行，防止待提交状态列表引起误报 | [策略引擎模块](modules/policy-engine.md) |
| `pre-commit` / `commit-msg` / `pre-push` | Git 客户端钩子生命周期：分别拦截暂存区提交、提交信息与推送引用范围；产品层通过 `hooks/git/*` 带 `--net` 调用 `check.py`，本仓库自身维护则走 `tools/repo_maintenance_guard.py` | [双层钩子包装模块](modules/hook-wrappers.md) |
| `--no-verify` | Git 跳过钩子开关（以及 `git commit -n`、`--no-gpg-sign`）；会被 `forbid-commit.sh` 与 `forbid-push.sh` 在 Claude Code Bash 调用阶段直接阻断 | [双层钩子包装模块](modules/hook-wrappers.md) |
| `Bash(git *)` | Claude Code 设置里的工具条件过滤器（`if` 字段），将 `forbid-commit.sh` 与 `forbid-push.sh` 限定为仅对 Git 命令预触发，脚本内再做精确子命令匹配 | [双层钩子包装模块](modules/hook-wrappers.md) |
| `ACMR` | `git diff --diff-filter=ACMR` 参数，只挑选新增、复制、修改、重命名的路径与 `+` 新增行，避免旧违规文本在清理删除时反向阻断修复提交 | [双层钩子包装模块](modules/hook-wrappers.md) |
| `PYTHONUTF8=1` | 在入口脚本强制开启 Python UTF-8 模式（并辅以显式 `encoding='utf-8'` 与流重配置），消除中文 Windows/GBK 区域下读配置或子进程输出时的乱码与静默退化 | [部署安装与自检模块](modules/deployment-and-checks.md) |
| `ELF` / `XOR` | 指代本机 `token-helper` 辅助机制：`build-secure-token.py` 用 32 字节随机会话密钥对令牌明文做流式 `XOR` 编码后编译为本机可执行 `ELF` 二进制，仅用于规避自动文本扫描 | [部署安装与自检模块](modules/deployment-and-checks.md) |
| `Conventional Commits` | 本仓库自身使用的提交标题约定（`type(scope): 描述`，不超过 100 字符），由本地 `tools/repo_maintenance_guard.py` 离线检验 | [代码地图](code-map.md) |
| `Claude` / `CLI` / `Bash` / `Write` / `Edit` / `NotebookEdit` / `Read` / `Grep` / `SSH` / `JSON` / `Git` | 文档与源码中按接口规范保留的宿主工具、命令行与协议标准专有名词 | [双层钩子包装模块](modules/hook-wrappers.md) |

证据状态：除特别标注外，本页基于当前源码已确认。
