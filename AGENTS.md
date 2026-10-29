# 防泄漏护栏协作约定

## 当前工作入口

先读现有部署手册与源码指南。运行依赖为 Bash、Python 3、Git、OpenSSH；`python3 policy/doctor.py` 检查实际安装状态，源码 checkout 不代表已安装。没有现成的独立测试命令可宣称“全套通过”；记录真实检查输入、退出码及配置缺口。

## 内容卫生

- 不写具体模型档位与版本、会话链接或会话标记；只用供应商/Agent 通用名称。
- 不提交秘密、令牌、私钥、访问凭据及原有规则禁止的相关变量标识，不把命中值完整回显到日志或会话。
- 不写私有仓库名、内部业务域名、运行时端点、主机名、资源管线细节；需要说明时用中性功能称呼。历史敏感表述按同一口径处理，不因它已存在就继续复制。
- 保留快速工具路径不联网、动态名单缺失/过期按 error、策略三态和 fail-closed 的区别；通过仅安静退出，不能输出 allow 跳过宿主权限确认。
- 私有种子、名单、映射和含凭据的辅助产物仅保存在部署侧，不打进分发包。安装、名单刷新、全局设置或 Git 配置修改需明确授权；文档工作不执行这些操作。

## 提交、分支与签名

- Conventional Commits：`type(scope): 描述`；说明实际变更和文档影响。
- 所有非初始提交由实际人类贡献者作为作者，Agent 仅以完整 `Name <email>` co-author 署名，使用通用名，不写型号。禁止供应商 noreply 作为作者，不猜身份。
- 必须 SSH 签名，禁止未签名提交与 Agent 通用密钥。生成密钥只在本机，私钥不外传，仅交公钥供维护者登记。
- 正式分支或有明确用途的特性分支工作，禁止向 Agent 命名分支推送；当前任务不授权提交、推送或历史改写。
- 原有内容卫生、署名和签名约束集中在本文件；发生冲突先说明，遵守当前明确任务与上级指令，不以通用模板自动覆盖项目约束。


## Repo docs

The living guide is [repo-docs/README.md](repo-docs/README.md); start with the [main walkthrough](repo-docs/walkthroughs/one-real-run.md), then use the [code map](repo-docs/code-map.md) to locate changes.
This repo's `repo-docs/` guide is reader-facing Chinese documentation. When updating reader-facing guide pages, use `repo-docs-zh` when available; keep Chinese reader handles in the prose and preserve exact source identifiers for lookup.
Read current source, scripts, configuration and tests before relying on guide claims. Repo questions, behavior-changing edits, user uncertainty, stable knowledge clarified in conversation and knowledge about to enter memory trigger the `repo-docs` Sync gate before the final response (or the same manual check if the skill is unavailable).
Choose `none`, `answer-only`, `foreground patch`, or `background sync`. Patch the smallest owning page before answering when stale content would mislead; delegate broader non-critical sync only with a real tracked handoff. Record meaningful guide changes and validation limits in `repo-docs/change-log.md`, with `Synced through <sha>` when HEAD exists. Do not log every answer.


## 贡献与维护入口

提交采用 Conventional Commits：`type(scope): 描述`；项目已有的中文描述、署名、签名和文档交代要求继续生效。保留用户未提交内容，只暂存本次明确审查的路径。
贡献与安全约定分别见 [贡献说明](CONTRIBUTING.md) 和 [安全说明](SECURITY.md)；相关维护由统一任务协调，避免并行覆盖。
维护守卫安装命令为 `python tools/repo_maintenance_guard.py install`。仅在明确安装任务下执行；文档修改不自动安装或更改 Git 配置。保留已有安全钩子，安装与验证结果按实际执行另行记录。

文档站统一使用 VitePress 默认主题；样式与动效遵循原生主题，构建输出独立于业务界面。
