# 源码证据审计

这是固定审计记录，记录对当前源码、策略配置与维护工具的多遍核查结果；行为解释由主流程页承载，源码导航由代码地图承载。

## 遍历记录

| 遍历 | 实际检查 | 得到的依据 |
| --- | --- | --- |
| Pass 1 | 仓库目录树、Git 状态、配置与入口文件（根 `settings.json`、`meta.json`、`AGENTS.md`、`CONTRIBUTING.md`、`SECURITY.md`） | 区分“安装到宿主与全局 Git 的防泄漏产品（`hooks/` + `policy/`）”与“本仓库本地维护守卫（`tools/`）”两套独立入口 |
| Pass 2 | 逐行核对 `hooks/_lib.sh`、`hooks/forbid-*.sh`、`hooks/git/*`、`policy/check.py`、`policy/policy.json` | 确认输入提取、三态输出（`pass` / `violation` / `error`）、`--net` 隔离、R1–R7 规则、SSH 验签与 `resign_exempt` 重签豁免 |
| Pass 3 | 逐行核对 `hooks/refresh-private.py`、`hooks/resolve-private.py`、`hooks/scan-repo.py`、`policy/bootstrap.sh`、`policy/install-settings.py`、`policy/doctor.py`、`policy/build-secure-token.py`、`policy/token-helper.cpp`、`policy/msgcb-hygiene.py`、`tools/repo_maintenance_guard.py` | 确认多来源名单并集与完整性兜底、单名即时解析与负缓存、路径改写与部署自检、XOR 凭证编译辅助与本地维护守卫边界 |

## 覆盖与排除

覆盖范围包括 `hooks/`、`hooks/git/`、`policy/`、`tools/` 及根目录 `settings.json` 的真实实现与交互逻辑。

以下区域属于相邻或外部部署边界，本页仅标明边界、不替代运行时安全审计：`docs-site/` 为文档站发布载体；`$GUARD/private-seed.json`、`$GUARD/sanitize-map.json`、`private-repos.json` 与编译后的 `token-helper` 为部署侧本地产物，不随仓库分发。历史未在本地安装环境跑通的真实拦截回归、宿主外部进程超时行为，以及远程私有仓 API 实时连通性在本轮未执行端到端压测。

## 声明与证据

| Claim | Evidence | Confidence | Caveat | Used by |
| --- | --- | --- | --- | --- |
| Write、Edit、NotebookEdit 只提取待写文本并静默放行或拒绝 | [内容拦截脚本](../../hooks/forbid-content.sh) 读取 `content`、`new_string`、`new_source`；[公共辅助](../../hooks/_lib.sh) `pass` 与 `deny` | 已确认 | 仅审查本次工具增量内容，不证明文件存量干净 | 主流程 Step 1、Step 4；[钩子包装模块](../modules/hook-wrappers.md) |
| Claude 工具链钩子禁止联网，通过不返回 `allow` 避免跳过权限确认 | [公共辅助](../../hooks/_lib.sh) `engine_content` 不带 `--net`；[自检脚本](../../policy/doctor.py) 检查 `.sh` 不含 `--net` 与 `permissionDecision` | 已确认 | 宿主超过 `timeout`（30s/120s）仍可能按无决策放行 | 主流程 Step 2–4；[钩子包装模块](../modules/hook-wrappers.md) |
| 策略引擎区分 `pass`、`violation`、`error` 三态，仅精确 `pass` 返回退出码 0 | [策略引擎](../../policy/check.py) `full_check`、`private_check`、`main` | 已确认 | 直接在未部署克隆目录执行可能因默认路径未改写而报错 | 主流程 Step 2–3；[策略引擎模块](../modules/policy-engine.md) |
| Read/Grep 路径拦截统一 Windows 盘符分隔符与 `realpath` 并放行公钥类白名单 | [读路径拦截脚本](../../hooks/forbid-read-path.sh) 匹配 `[A-Za-z]:[\\/]` 与白名单 `case` | 已确认 | 相对路径不在该脚本拦截，仍由 Bash 命令扫描覆盖 | [钩子包装模块](../modules/hook-wrappers.md) |
| Git 层对新推送提交采用 `ssh-keygen -Y check-novalidate` 验签并支持重签豁免 | [策略引擎](../../policy/check.py) `commit_signature`、`known_content`、`cmd_push`；[预提交钩子](../../hooks/git/pre-commit) | 已确认 | 不验证公钥是否在远程托管平台登记；`resign_exempt=false` 可关闭豁免 | [策略引擎模块](../modules/policy-engine.md)；[钩子包装模块](../modules/hook-wrappers.md) |
| 动态名单刷新执行来源并集、owner 覆盖校验与非空兜底，失败时不回写缓存 | [名单刷新脚本](../../hooks/refresh-private.py) 完整性校验与原子 `os.replace` | 已确认 | 缺失私有种子时 R4 业务正则为空；单靠种子不会自动纳入新建私有仓 | [名单同步模块](../modules/private-list-sync.md) |
| `bootstrap.sh` 通过 `sed` 改写模板路径并写入全局 Git 与仓库/用户级设置 | [铺设脚本](../../policy/bootstrap.sh) 路径改写与 [设置注入脚本](../../policy/install-settings.py) | 已确认 | 本轮未运行安装或更改本机 Git 配置；云端只读仓库级设置 | [部署自检模块](../modules/deployment-and-checks.md) |
| 仓库自身维护守卫由 `tools/` 离线执行，与防泄漏产品钩子相互独立 | [维护守卫脚本](../../tools/repo_maintenance_guard.py) `staged`、`message_problems`、`pushed` | 已确认 | 仅检查 Git 对象与 8 MiB 内 blob，不替代业务安全审计 | [代码地图](../code-map.md) |

## 证伪检查与读者下一问

证伪检查：若 `hooks/forbid-content.sh` 在解析 JSON 失败时退出 0、在通过时输出 `permissionDecision=allow`、在快速路径中传递 `--net`，或者 `policy/check.py` 在缓存缺失/损坏时返回 `pass`，则说明本指南关于 fail-closed 与离线隔离的边界模型已经失效。

读者下一问：如果在未运行 `policy/bootstrap.sh` 的本地克隆里直接挂载 `hooks/git`，为什么 `policy/doctor.py` 或 Git 钩子会报错？请接着查看[部署安装与自检机制](../modules/deployment-and-checks.md)中的路径改写与模板边界说明。

## 验证边界

本轮仅通过静态源码核对、`validate_repo_docs.py` 结构校验与 VitePress 文档站静态构建验证文档准确性；未执行 `policy/bootstrap.sh` 安装、未刷新线上私有仓缓存、未改动全局 `~/.claude/settings.json` 或本机 Git 签名配置。
