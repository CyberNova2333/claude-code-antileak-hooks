# Claude Code Antileak Hooks 🛡️

> **用于 Agent 协作与 Git 提交的内容检查、署名和签名护栏。**

[部署与规则](docs/OPERATIONS.md) · [变更记录](docs/CHANGELOG.md) · [GPLv3](LICENSE)

通过 Claude Code hooks 提前提示，通过 Git hooks 检查实际提交与推送。它用于减少误操作和意外泄露；拥有本机控制权的进程仍能绕过本机检查。

<a id="-系统结构"></a>

**阅读导航**

[🏛️ 分层代码架构](#section-1) · [🚀 快速开始](#section-2) · [⚙️ 检查范围](#section-3) · [📚 维护与许可](#section-4) · [🧪 验证与故障定位](#section-5)

---

<a id="section-1"></a>

## 🏛️ 分层代码架构

工具钩子与 Git 钩子是不同入口，共用 Python 策略判定。规则引擎读取部署策略和名单缓存，并在需要时通过独立刷新或查询脚本补充依据；安装脚本只负责接入，不属于判定核心。

图中展示主要代码依赖：实线箭头指向被调用或被依赖的模块，虚线表示实现或生成关系；数据读写另用连线文字标明。

```mermaid
flowchart TB
    subgraph L0["事件适配层"]
        TOOLS["hooks · 工具事件包装"]
        GIT["hooks/git · Git 事件包装"]
    end
    subgraph L1["策略与检查层"]
        CHECK["policy/check.py"]
        SCAN["scan-repo.py"]
    end
    subgraph L2["策略数据与来源适配"]
        POLICY["policy.json / 私有缓存"]
        REFRESH["refresh-private.py"]
        RESOLVE["resolve-private.py"]
    end
    TOOLS --> CHECK
    GIT --> CHECK
    CHECK --> POLICY
    SCAN --> POLICY
    CHECK --> REFRESH
    CHECK --> RESOLVE
    REFRESH --> POLICY
    RESOLVE --> POLICY
```

| 层次 | 源码入口 | 职责与边界 |
|---|---|---|
| 事件适配层 | [hooks · 工具事件包装](hooks/) | 将 Agent 工具参数交给对应检查；包含 shell 包装与公共辅助。 |
| 事件适配层 | [hooks/git · Git 事件包装](hooks/git/) | 转交提交、合并和推送参数。 |
| 策略与检查层 | [policy/check.py](policy/check.py) | content、commit、push 入口共享内容扫描、身份和签名等判据。 |
| 策略与检查层 | [scan-repo.py](hooks/scan-repo.py) | 独立存量扫描入口，按策略遍历仓库内容。 |
| 策略数据与来源适配 | [policy.json / 私有缓存](policy/policy.json) | 声明规则、脚本位置和缓存路径；实际私有数据由部署侧提供。 |
| 策略数据与来源适配 | [refresh-private.py](hooks/refresh-private.py) | 聚合配置过的来源并更新名单。 |
| 策略数据与来源适配 | [resolve-private.py](hooks/resolve-private.py) | 解析缓存外的候选名称，返回可见性或错误。 |

<a id="-快速开始"></a>

<a id="section-2"></a>

## 🚀 快速开始

运行环境为 Bash、Python 3、Git 和 OpenSSH。先按 [部署参考](docs/OPERATIONS.md) 配置名单来源、本机种子与安装路径，再使用 `policy/bootstrap.sh` 安装。

安装后可先运行只读检查：

```sh
python3 policy/doctor.py
```

详细安装命令、云端与本机的区别、名单刷新方式见 [部署与规则](docs/OPERATIONS.md)。不要把本机名单、凭据或带凭据的辅助程序打进分发包。

<a id="-检查范围"></a>

<a id="section-3"></a>

## ⚙️ 检查范围

| 规则 | 检查内容 |
|---|---|
| R1 / R4 | 私有仓库名称与内部业务标识 |
| R2 | 具体模型标识与会话标记 |
| R3 | 人类作者与 Agent 协作署名 |
| R5 | Agent 命名分支 |
| R6 | SSH 提交签名 |
| R7 | 凭据值与私钥形态 |

检查结果区分通过、违规与执行错误；错误按拒绝处理。快速工具钩子不联网，Git 检查可刷新名单。缓存缺失或过期时按提示修复来源，不把“无法检查”当作通过。

<a id="-维护与许可"></a>

<a id="section-4"></a>

## 📚 维护与许可

- [部署与规则](docs/OPERATIONS.md)：配置、安装、检查模式及适用边界。
- [历史变更](docs/CHANGELOG.md)：编码、路径、签名和名单来源问题的修复记录。
- [协作约定](CLAUDE.md)：内容卫生与署名要求。

代码采用 [GPLv3](LICENSE)。


<a id="section-5"></a>

## 🧪 验证与故障定位

先运行 `python3 policy/doctor.py` 核对安装路径、配置和 Git 钩子，再按 [操作说明](docs/OPERATIONS.md) 分别检查内容、提交和推送入口。安装自检不能替代真实拦截验证；需要确认缺配置、缺名单和违规样本按设计返回非成功结果。

`settings.json` 是工具钩子接线入口，`policy/` 是 Git 检查实现；更换安装位置时须一起核对，避免工具层有提示而 Git 层没有接上。
