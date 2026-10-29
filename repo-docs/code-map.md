# 代码地图

先读[一次真实操作的阶段交接](walkthroughs/one-real-run.md)，再按这里的职责定位。覆盖范围为 Write/Edit 工具事件到本地策略 content 判定与拒绝结果；这不是全仓库架构清单。

| 路径 | 职责 | 关键代码 | 与主流程的关系 |
| --- | --- | --- | --- |
| `hooks/` | 工具事件包装与公共辅助 | [内容包装](../hooks/forbid-content.sh)、[_lib.sh](../hooks/_lib.sh) | 提取事件内容，快速调用引擎，映射拒绝结果 |
| `hooks/` 的相邻入口 | 读路径、提交、推送与名单辅助 | `forbid-read-path.sh`、`forbid-read-secret.sh`、`forbid-commit.sh`、`forbid-push.sh`、`forbid-tamper.sh`、`scan-repo.py` | 本页仅索引，不追踪全部 shell 检测分支 |
| `hooks/git/` | 实际 Git 事件检查 | [commit-msg](../hooks/git/commit-msg)、`pre-commit`、`pre-merge-commit`、`pre-push` | 在实际提交/推送边界复核，独立于待写文本 |
| `policy/` | 单一判定引擎和部署策略 | [check.py](../policy/check.py)、`policy.json`、`doctor.py` | content 三态判断，部署状态自检 |
| `policy/` 的部署辅助 | 安装、设置和本机令牌辅助 | `bootstrap.sh`、`install-settings.py`、`build-secure-token.py`、`token-helper.cpp` | 会改变安装状态或处理秘密，本轮不执行 |
| 根 `settings.json` | 工具事件接线模板 | [设置模板](../settings.json) | 安装后实际设置仍需核对路径与宿主支持 |

## `hooks/`

| 重要代码 | 功能 | 关键符号 | 调用方 / 使用方 |
| --- | --- | --- | --- |
| `forbid-content.sh` / `_lib.sh` | 事件取文本并映射拒绝 | `pass` / `deny` / `engine_content` | PreToolUse 事件；已安装路径需核对 |
| `refresh-private.py` / `resolve-private.py` | 名单刷新和未知候选查询 | 本页不跟踪网络分支 | 显式维护流程及 Git --net 路径 |

## `hooks/git/`

| 重要代码 | 功能 | 关键符号 | 调用方 / 使用方 |
| --- | --- | --- | --- |
| `pre-commit` / `pre-merge-commit` / `commit-msg` | 把实际 Git 事件交给策略 | content/commit 模式 | Git；已安装钩子环境 |
| `pre-push` | 交接远端及 refs 给引擎 | push 模式 | Git；与工具待写内容检查不同 |

## `policy/`

| 重要代码 | 功能 | 关键符号 | 调用方 / 使用方 |
| --- | --- | --- | --- |
| `check.py` | 内容、缓存与三态判断 | `cmd_content` / `full_check` / `private_check` / `main` | 工具包装与 Git 包装 |
| `doctor.py` / `policy.json` | 安装健康检查和策略输入 | `Overall` 状态与配置键 | 维护者；不是完整拦截回归 |
| `bootstrap.sh` / `install-settings.py` | 安装与路径接线 | 本页仅定位，本轮不执行 | 明确授权的安装流程 |

## 修改入口与验证

工具参数提取与宿主退出码从 `hooks/forbid-content.sh` 和 `_lib.sh` 开始；判定条件从 `policy/check.py` 的 `cmd_content`、`full_check` 和缓存状态进入。不要仅改包装而让 Git 入口保留另一套规则。

名单维护由 `hooks/refresh-private.py` 和 `resolve-private.py` 支持，部署说明仍在 `docs/OPERATIONS.md`。源码的安装路径不等于本机实际配置；doctor 的输出应按当前环境记录，不能预填 PASS。

## 覆盖范围

Git 签名密码学验证、远端提交枚举、历史重签豁免、名单网络刷新和安装脚本仅索引，不作完整安全审计；没有安装或更改任何安全钩子。

源码链接指向仓库文件。独立文档站不携带这些文件；可按表中的精确路径在克隆中查找。需要确认哪些代码已经逐段核对，查看[证据覆盖记录](references/source-evidence.md)。

证据状态：除特别标注外，本页基于当前源码已确认。
