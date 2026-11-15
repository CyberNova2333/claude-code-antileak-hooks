# 阅读质量审计

这是固定审计记录，用于检验本套 Standard 指南是否向不同读者传递了准确、可定位的源码行为模型，并明示本轮验证尚未覆盖的真实环境风险。

## 读者模拟

| 检查问题 | 从指南得到的答案 | 主要承接页面 |
| --- | --- | --- |
| 产品主路径如何把工具写作请求变成拦截或放行 | 提取载荷 → 离线调用策略引擎 `content` → 静态与缓存判定 → 安静退出 0 或 `deny` JSON + exit 2 | [一次工具写入判定](../walkthroughs/one-real-run.md) |
| 为什么 Claude 工具层与 Git 层拆分且 `--net` 严格隔离 | 工具层受宿主超时制约（超时即无决策放行），因此只查本地缓存；Git 层可在提交与推送时同步联网刷新、单名解析并复查 SSH 签名与历史新增行 | [双层钩子包装](../modules/hook-wrappers.md)、[策略引擎](../modules/policy-engine.md) |
| 不带私有数据随包分发时，R1 与 R4 如何工作且不 fail-open | 通过 `refresh-private.py` 合并本机种子、主托管平台 API 与可选 GitHub 来源，执行 `expected_owners` 与非空校验并原子落盘；`check.py` 对缺失或超期缓存返回 `error` | [动态私有名单同步](../modules/private-list-sync.md) |
| 源码目录为什么不能直接当作已安装防线，如何诊断接线 | 包内脚本硬编码模板路径，需经 `bootstrap.sh` 改写为 `$GUARD` 并注入全局 Git 与 Claude 设置；`doctor.py` 会按物理位置诊断接线、缓存与签名配置 | [部署安装与自检](../modules/deployment-and-checks.md) |
| 怎样定位具体文件入口，如何区分产品钩子与本仓维护守卫 | 按目录职能查看 `hooks/`、`hooks/git/`、`policy/` 与 `tools/`，其中 `tools/repo_maintenance_guard.py` 仅服务于维护本仓库克隆自身 | [代码地图](../code-map.md) |

## 可证伪性与后续问题

证伪检查：如果源码出现以下任一变化，即会推翻本指南建立的核心约束模型：
- 任意 Claude Code 包装脚本在输入解析失败时返回 `0`、在通过时输出 `permissionDecision=allow`，或在工具层直接传入 `--net`；
- `policy/check.py` 在缓存缺失、损坏或过期时返回 `pass`，或 `refresh-private.py` 在全部来源均失败或结果为空时覆盖写入有效缓存；
- `policy/bootstrap.sh` 未改写全部脚本路径模板即写入 `core.hooksPath`，或把本机私有种子/令牌明文打包进仓库。

读者下一问：如果在跨平台容器或 Windows Git Bash 环境下排查单次推送的 `known_content` 重签豁免为何失效，可直接定位[策略引擎](../../policy/check.py)中的 `remote_tips`、`commit_index` 与 `patch_id` 实现并核对 `git ls-remote` 输出。

## 剩余风险

- 本轮仅执行了源码逐文件核对、`validate_repo_docs.py` 结构完整性检查以及 VitePress 文档站静态构建；**未在本机运行** `policy/bootstrap.sh` 安装流程，也未修改系统级 `core.hooksPath`、个人 `~/.claude/settings.json` 或私钥配置。
- 动态私有仓列表刷新（外部平台 API 连通性、限流重试）、`resolve-private.py` 实时查询、`token-helper` 交叉编译与真实 Claude Code 会话中的超时行为属于运行时集成边界，本轮没有跑端到端压测，因此不宣称功能测试全部通过。
- 文档中对托管平台来源的描述刻意隐去特定内部品牌与端点名称，具体端点键名与环境变量名需由已获授权的维护者在阅读[策略配置](../../policy/policy.json)及[名单刷新脚本](../../hooks/refresh-private.py)源码后对照使用。

证据状态：除特别标注外，本页基于当前源码已确认。
