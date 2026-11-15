# 策略引擎、R1–R7 判据与三态裁决

[策略引擎](../../policy/check.py)是整个防泄漏套件唯一的判定核心：无论入口来自工具调用前的文本拦截，还是 Git 提交、合并与推送钩子，最终都收敛到同一套规则、脱敏逻辑和三态裁决标准。

主流程的[Step 2 与 Step 3](../walkthroughs/one-real-run.md#step-2-在部署配置下运行同一个引擎)展示了工具事件如何落入这一层。引擎要解决的核心压力是区分“确认干净”和“无法完成检查”——当缓存缺失、过期或签名校验命令不可用时，它绝不静默返回通过。

## 三种检查模式与输入边界

引擎通过命令行子命令区分调用上下文，把不同的触发来源转换成待审查文本与元数据：

| 模式 | 命令形态 | 接收输入 | 联网能力 |
| --- | --- | --- | --- |
| `content` | `check.py content [file] [--net]` | 文件内容或 stdin 原文 | 工具钩子不传 `--net`；`pre-commit` 传入 `--net` |
| `commit` | `check.py commit [msgfile] [--net]` | 提交说明（先剥离 `core.commentChar` 注释行）及 `GIT_AUTHOR_IDENT` | Git `commit-msg` 传入 `--net` |
| `push` | `check.py push [remote] [--net]` | stdin 四列引用协议及远端未覆盖的新提交对象 | Git `pre-push` 传入 `--net` |

这里容易忽视的是 `commit` 模式的注释剥离时机：Git 在 `commit-msg` 执行完之后才清理 `#` 开头的状态提示行，因此引擎先读取 `core.commentChar` 并剔除注释，防止待提交文件列表中出现敏感目录名导致提交说明误报。

## R1–R7 规则与防误伤边界

引擎从[策略配置](../../policy/policy.json)读取静态规则，并结合动态私有名单缓存依次扫描：

| 规则 | 检查目标 | 关键判据与防误伤设计 | 典型失败输出 |
| --- | --- | --- | --- |
| `R1` | 私有仓库名 | 从 `private-repos.json` 读取 `owner/repo` 与裸名做大小写无关子串匹配；`--net` 下对未知 `xxx-xxx` 候选调用单名即时查询 | `VIOLATION` 或缓存不可用 `ERROR` |
| `R2` | 模型档位与会话标记 | 匹配 `forbidden_patterns`；用 `in_b64_run` 跳过长度 ≥24 且大小写数字混杂的连续编码串，避免内嵌媒体数据误报 | `VIOLATION` |
| `R3` | 作者与协作署名 | 在 `commit` / `push` 模式拦截 `agent_provider_emails`；非根提交缺失 `Co-authored-by:` Trailer 时拒绝 | `VIOLATION` |
| `R4` | 内部业务标识正则 | 仅来自动态缓存中从本机私有种子导入的 `patterns`，绝不写入可随包分发的配置；正则语法错误按 `ERROR` 阻断 | `VIOLATION` 或 `ERROR` |
| `R5` | Agent 命名分支 | `push` 模式拦截推送目标引用匹配 `agent_branch_prefixes`（含删除操作）；不接管主分支保护（由托管平台负责） | `VIOLATION` |
| `R6` | SSH 提交签名 | `push` 模式从提交对象剥出 `gpgsig`，直接运行 `ssh-keygen -Y check-novalidate` 验签并核对指纹不等于 `agent_signing_fingerprint`，不依赖 `allowedSignersFile` | `VIOLATION` 或 `ERROR` |
| `R7` | 凭据与私钥格式 | 匹配 `secret_regexes`（含前缀令牌、固定 39 位 Google API key、私钥头）；`mask` 仅回显前 8 个字符与长度，禁止把完整密钥写回会话 | `VIOLATION`（`SECRET:` 脱敏提示） |

注意 `R2` 与 `R7` 对编码串的处理差异：`in_b64_run` 只对 `R2` 模型正则生效，因为高危凭据本身常常表现为连续无分隔符的大小写数字混合字符串，因此 `R7` 不会跳过这类片段。

## 三态裁决与代表性输入/输出案例

引擎向 stdout 只输出 `pass`、`violation` 或 `error` 三个单词之一，向 stderr 输出脱敏原因，并严格规定只有 `pass` 以退出码 `0` 结束：

| 场景分类 | 典型输入状态 | 引擎动作与状态变化 | stdout / 退出码 |
| --- | --- | --- | --- |
| 正常放行 | 中性正文，私有仓缓存处于 6 小时 TTL 内 | 通过静态正则与缓存扫描，无命中 | `pass` / `0` |
| 规则命中（违规） | 正文含匹配 `secret_regexes` 的前缀串（如 `ghp_` 长令牌） | `mask` 截断为前 8 字符并加脱敏长度注释 | `violation` / `1` |
| 边界失败（fail-closed） | 未带 `--net` 且 `private-repos.json` 缺失或过期 | 不冒充未命中，也不发起联网阻塞工具超时，提示手动刷新 | `error` / `1` |
| 推送重签豁免边界 | 整仓重签或原样 rebase 后推送，`--net` 校验通过 | `known_content` 通过树签名或 `--stable` `patch-id` 匹配 `ls-remote` 真实顶点，跳过重复行扫描，仍逐条复查签名、作者与消息 | 视签名与消息结果而定；算不出时退化为全扫 |

在本地已安装环境中，可通过一条最小只读命令核对三态退出语义：

```sh
python3 policy/check.py content <中性测试文件>
```

需注意在源码未安装目录直接执行时，引擎会因默认读取部署路径的 `policy.json` 或缺少新鲜缓存而返回 `error` 并以非零退出。若要追踪 Git 远端顶点如何建立本地基准、以及动态缓存如何安全刷新，继续阅读[动态私有名单刷新与解析机制](private-list-sync.md)；若要核对外围包装如何把引擎输出翻译给宿主与 Git，查看[双层钩子包装与交互契约](hook-wrappers.md)。

证据状态：除特别标注外，本页基于当前源码已确认。
