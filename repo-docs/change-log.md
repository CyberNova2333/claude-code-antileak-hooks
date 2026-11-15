# 指南变更记录

## 2026-11-15：升级为 Standard 全仓库指南并重置文档体系

- **升级触发**：执行文档体系全量重置，明确划分职责边界——根目录 `README.md` 与 `README.en.md` 收敛为 6 段式项目门户；`docs-site/` 按 Tier B 重构为中英双语三阶段指南；`repo-docs/` 从 Lite 模式升级为覆盖全仓库的 Standard 指南包。
- **结构补齐**：保留并审校主流程 [一次工具写入怎样得到策略判定](walkthroughs/one-real-run.md)，新建四个专题模块页（[策略引擎](modules/policy-engine.md)、[双层钩子包装](modules/hook-wrappers.md)、[动态私有名单同步](modules/private-list-sync.md)、[部署安装与自检](modules/deployment-and-checks.md)），补全覆盖 `hooks/`、`hooks/git/`、`policy/` 与 `tools/` 的[代码地图](code-map.md)，并新增[项目术语表](glossary.md)及更新[源码证据审计](references/source-evidence.md)与[阅读质量审计](references/quality-review.md)。
- **文档迁移与清理**：确认原根目录下的运维参考与历史变更文档未被任何钩子、测试脚本或 CI 工作流直接引用；将其核实无误的部署矩阵、R1–R7 细节（同步修正原手册将 `PreToolUse` 数量写为 5 个而实际 `settings.json` 与 `install-settings.py` 为 6 个的偏差）及 rev4–rev4.4 演进决策迁移整合到 `docs-site/` 与 `repo-docs/` 后移除原孤立文件。
- **内容卫生**：严格遵循仓库与安全边界要求，不在任何提交文档中出现特定内部平台标识、特定模型档位版本号或失效本机绝对路径；多来源聚合说明统一使用中性功能表述并指引维护者查阅对应脚本与配置源码。
- **验证边界**：完成 `validate_repo_docs.py` 全量结构校验与 `docs-site` VitePress 静态构建；未在本机执行 `policy/bootstrap.sh` 安装、远端私有仓刷新或修改本机全局 Git/Claude 配置。

Synced through 9ff000c216e6ddd20c72d8e0554945115e5b0c6a

## 2026-10-29：建立初版指南、统一维护复核与站点恢复默认主题

- 建立初版 `repo-docs/` 主流程、代码地图、双遍源码证据与质量审计记录，同步对齐根 `AGENTS.md`、`CONTRIBUTING.md`、`SECURITY.md` 与双语 `README` 入口，并由仓库本地离线维护守卫（`tools/repo_maintenance_guard.py`）接管常规提交前扫描与 Conventional Commits 校验。
- 将文档发布载体从 MkDocs 迁移为 VitePress 默认主题静态站（位于 `docs-site/`），配置 `.vitepress/guide-links.mts` 将正文中的仓库源码链接转译为稳定文本定位标识，避免静态站产生悬空相对链接。
- 历史锚点曾记录至 `49d6e90e1e2eceef4894d08e92c0a7c6f65358b5`；该初版仅覆盖 `Write` / `Edit` 内容拦截的 Lite 范围，现已由 2026-11-15 的全仓库 Standard 指南完整接替。
