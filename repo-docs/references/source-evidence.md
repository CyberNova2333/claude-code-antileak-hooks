# 源码证据审计

这是固定审计记录，记录 2026-10-29 的两遍调查；行为解释由主流程页承载，源码导航由代码地图承载。

## 遍历记录

| 遍历 | 实际检查 | 得到的依据 |
| --- | --- | --- |
| Pass 1 | 仓库目录、Git 状态、父级及 root AGENTS/CLAUDE、README、`settings.json`、`hooks/`、`policy/`、原有 `docs/OPERATIONS.md` 与许可证 | 确定真实入口、运行命令及现存文档；README 只作线索 |
| Pass 2 | `hooks/forbid-content.sh`、`_lib.sh`，`policy/check.py` 的缓存状态/三态/主入口，以及 `policy/doctor.py` 的实际检查项 | 追踪主路径的输入、输出与失败分支，并对照测试断言 |

## 覆盖与排除

覆盖：Write/Edit 工具事件到本地策略 content 判定与拒绝结果。Git 签名密码学验证、远端提交枚举、历史重签豁免、名单网络刷新和安装脚本仅索引，不作完整安全审计；没有安装或更改任何安全钩子。


## 声明与证据

| Claim | Evidence | Confidence | Caveat | Used by |
| --- | --- | --- | --- | --- |
| 工具事件只检查新增文本 | [内容包装](../../hooks/forbid-content.sh) 搜索 `tool_input`、`new_source` | 已确认 | 不代表存量仓库全部通过 | 主流程 Step 1 |
| 快速工具路径不启用网络 | [辅助](../../hooks/_lib.sh)、[内容包装](../../hooks/forbid-content.sh) | 已确认 | 缓存过期需独立刷新 | 主流程 Step 2 |
| error 与 violation 都映射拒绝 | [引擎主入口](../../policy/check.py)、[包装](../../hooks/forbid-content.sh) | 已确认 | 配置装载可在主处理前失败，包装仍须拒绝 | 主流程 Step 3–4 |
| 通过保持安静，不输出 allow | [公共退出辅助](../../hooks/_lib.sh) 搜索 `pass`、`deny` | 已确认 | 宿主超时仍可能无决定 | 主流程 Step 4 |
| doctor 检查部署状态 | [自检](../../policy/doctor.py) | 已确认 | 未运行；也不等于拦截测试 | 主流程 Step 5 |

## 证伪检查与读者下一问

证伪检查：若包装在解析失败时放行、把 error 当 pass、通过时输出 allow，或工具快速路径调用网络刷新，就会推翻本指南的边界模型。缺少已安装环境的行为运行证据，因此这里不评价实际防护覆盖率。

读者下一问：真实 push 如何验证 SSH 签名和只扫描新增提交？需独立追踪 `cmd_push`、`commit_signature` 和 Git 事件包装，本轮未作密码学或提交枚举审计。

## 验证边界

本轮执行 `validate_repo_docs.py` 和 MkDocs 构建，退出码及完整输出保存在独立维护报告中；不将静态阅读当作业务测试通过。没有部署、生产验收或历史改写。
所有 `../../` 源码链接按当前磁盘核对；独立站点没有这些仓库文件，MkDocs 对此记 INFO，站内链接仍正常检查。未解析、展示或引用真实凭据和运行时数据库内容；现有未提交文件仅作本地摘要保全。
