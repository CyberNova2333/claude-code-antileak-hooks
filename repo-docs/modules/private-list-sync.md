# 动态私有名单刷新、单名解析与离线种子机制

为了做到“可分发包内不夹带任何私有仓库名或内部域名”，引擎在运行时把静态正则和私有资产名单彻底拆开：随包分发的 `policy.json` 只放通用模型与凭据正则，真正的私有名称和内部业务标识全部通过本地动态缓存注入。

主流程的[Step 2](../walkthroughs/one-real-run.md#step-2-在部署配置下运行同一个引擎)依赖这份缓存完成本地 R1 与 R4 判定。这套机制必须解决两个矛盾：既要及时捕获新建的私有仓库，又绝不能在某个平台凭据失效或权限不足时写出一个空的“健康缓存”而静默放行一切（fail open）。

## 多来源并集与完整性校验

[名单刷新脚本](../../hooks/refresh-private.py)负责把多方来源聚合为统一的 `private-repos.json`（默认 TTL 21600 秒 / 6 小时），并用 `os.replace` 原子替换写入磁盘：

| 来源类型 | 配置/环境变量载体 | 提供的数据内容 | 失败时的兜底语义 |
| --- | --- | --- | --- |
| 本机私有种子 | `private_seed` 文件、或环境变量 `GUARD_SEED_B64` / `GUARD_SEED_JSON` | `owners`、`private` 兜底列表及 R4 `patterns` 业务标识正则 | 解析或正则编译失败直接退出 1，不写缓存 |
| GitHub（可选） | `GH_TOKEN_1..N`、`GH_TOKEN`（忽略占位符 `proxy-injected`）与 `gh` CLI | 名下私有非 fork 仓 `full_name` 与裸名 | 任一已配置 `GH_TOKEN_*` 重试 3 次仍失败或遇限流即整体退出 1；`gh` 为 best-effort |
| 第三方托管平台（主来源） | `policy.json` 中配置的平台 API 端点、令牌文件或环境变量 | 递归展开全部可见组织及非公开仓库路径、末段路径与裸名 | 令牌存在即启用，任一组织枚举失败即整体退出 1；未配置则跳过 |

刷新脚本最后会做两道完整性关卡：第一，若 `sources` 为空，或者 `expected_owners` 中存在既未在种子列出、又未在平台看到至少 1 个私有仓的 owner，则判定来源不可信并拒绝回写（HTTP 200 但仅见公开仓不算覆盖）；第二，若 `expected_owners` 留空且聚合出的 `private` 列表也为空，同样拒绝写出“空健康缓存”，防止配置残缺时 R1 退化成放行一切。

## 缓存外候选词的即时查询（R1 补充）

如果某次 Git 提交或推送出现了一个形似仓库名（由连字符连接且包含至少两字母段的 `xxx-xxx` 裸名，或已知 owner 下的 `owner/repo`）、但尚未被上次定时刷新覆盖的字符串，带有 `--net` 的检查路径会交由[单名解析脚本](../../hooks/resolve-private.py)即时核查：

```text
提取候选 slug（跳过常见 trailer 与 pre-commit 等忽略词）
  ├─ 候选数 > resolve_budget（默认 30）──▶ 触发整体 refresh 一次后再比对新增私有仓
  └─ 候选数 ≤ 30 ──▶ 查询 24h 负/正缓存（.resolve.json）
                        ├─ 命中缓存 ──▶ 直接返回 private / public / absent
                        └─ 未命中   ──▶ 仅向最近一次 refresh 成功的来源提问并合并裁决
```

合并裁决遵循保守顺序：任一来源返回 `private` 即拦；否则任一来源返回 `error` 即拦；否则任一来源返回 `public` 即放行；全部确认看不到才返回 `absent`。仅向 `sources` 记录中上次刷新成功的平台提问，避免某一家平台登录态失效时把正常推送永久卡死。

## 存量审计与历史消息脱敏

除实时拦截外，仓库还提供两个离线/显式维护脚本共用这套名单体系：

- [存量扫描脚本](../../hooks/scan-repo.py)默认检查 `HEAD` 当前树文本文件（前 8 KiB 含 NUL 字节则跳过）和全历史提交消息，加 `--scan-history` 可遍历全部历史提交树；脚本会自动豁免当前 `origin` 远端对应的自身仓库名，并在缓存缺失时以退出码 2 明确拒绝审计。
- [历史消息卫生脚本](../../policy/msgcb-hygiene.py)作为 `git filter-repo --message-callback` 回调运行，强制要求本机 `sanitize-map.json` 可读，否则拒绝在不完整映射下改写历史。

验证多来源刷新与缓存状态的典型命令（会读写缓存或访问已配置网络来源，仅在授权维护环境执行）：

```sh
python3 hooks/refresh-private.py
python3 hooks/scan-repo.py . --scan-current
```

如需核对这些本地私有产物如何在首次部署时落盘并保留升级，请接着阅读[部署安装与自检机制](deployment-and-checks.md)；若要查看各规则在引擎内的具体匹配优先级，回到[策略引擎判据](policy-engine.md)。

证据状态：除特别标注外，本页基于当前源码已确认。
