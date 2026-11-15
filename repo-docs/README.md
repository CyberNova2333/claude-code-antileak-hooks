# Claude Code Antileak Hooks：源码阅读指南

Claude Code Antileak Hooks 把工具调用前拦截（PreToolUse）与 Git 提交/推送复查统一到同一个本地策略引擎：工具层以无网络离线判定抢在落盘前阻断误泄，Git 层则在提交与推送边界联网核对私有名单、作者署名和 SSH 签名。

本指南采用 Standard 模式覆盖全仓库代码实现（`hooks/`、`hooks/git/`、`policy/` 与 `tools/`）。所有结论均源于静态源码核对与文档站构建，不替代已安装环境中的运行时安全审计或集成验证。

## 阅读路径

| 读者目标 | 从这里开始 | 读完后获得什么 |
| --- | --- | --- |
| 第一次理解主工作流 | [沿一次真实工具写入走到底](walkthroughs/one-real-run.md) | 理清工具事件提取、离线三态判定、安静放行与拒绝输出交接 |
| 深入策略引擎规则细节 | [策略引擎、R1–R7 判据与三态裁决](modules/policy-engine.md) | 掌握三种模式、R1–R7 防误伤边界、`known_content` 重签豁免与脱敏退出码 |
| 查清外围拦截契约 | [双层钩子包装与交互契约](modules/hook-wrappers.md) | 对照 6 个工具包装器、4 个 Git 钩子与本地维护守卫的职责拆分 |
| 理解动态名单与离线种子 | [动态私有名单刷新、单名解析与离线种子机制](modules/private-list-sync.md) | 弄清多来源并集、完整性 fail-closed 校验、24h 负缓存与存量审计边界 |
| 查看安装接线与自检逻辑 | [部署安装、路径改写与本机自检](modules/deployment-and-checks.md) | 看懂 `bootstrap.sh` 路径改写、`install-settings.py` 去重与 `doctor.py` 诊断范围 |
| 准备改代码或找入口 | [代码地图与维护入口](code-map.md) | 按目录职责、重要符号与调用方快速定位源文件 |
| 查询规则、环境变量与缩写 | [项目术语表](glossary.md) | 快速对齐 `R1`–`R7`、三态裁决、环境变量与内部机制术语 |
| 审核源码证据与边界 | [源码证据审计](references/source-evidence.md) | 区分已逐行核对的源码事实与未在本地执行的运行时环节 |
| 评估讲解质量与风险 | [阅读质量审计](references/quality-review.md) | 复核读者问答模拟、可证伪边界与本轮剩余风险 |
| 查看指南同步历史 | [指南变更记录](change-log.md) | 确认基线提交号、结构升级与文档迁移范围 |

## 运行与验证

本套件运行依赖 Bash、Python 3、Git 与 OpenSSH（`ssh-keygen`）。由于包内脚本预置了部署模板路径，源码克隆目录不能直接视作已生效的护栏环境；在安装完成后，可通过自检脚本排查设置接线、缓存健康与签名配置：

```sh
python3 policy/doctor.py
```

在未执行过铺设脚本的源码克隆里运行该命令预期输出 `Overall: DEGRADED` 并以退出码 `1` 结束，这说明只读自检准确反映了本机未接线状态，不能把自检输出或文档构建误认为防泄漏拦截已验证通过。仓库自身的维护提交检查则使用 `tools/repo_maintenance_guard.py`。

## 文档站

面向使用者的渐进式文档站位于 `docs-site/`（VitePress 静态站点，独立维护前端依赖）。其中阶段 3（架构与源码导览）通过 `@include` 复用本目录的主流程与代码地图片段；`docs-site/.vitepress/guide-links.mts` 会把指南里的仓库源码相对链接转换为无失效跳转的文件路径说明。

```sh
pnpm --dir docs-site install --frozen-lockfile
pnpm --dir docs-site run docs:dev -- --host 127.0.0.1
pnpm --dir docs-site run docs:build
```

证据状态：除特别标注外，本页基于当前源码已确认。
