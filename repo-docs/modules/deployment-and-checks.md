# 部署安装、路径改写与本机自检

刚克隆下来的源码仓库本身并不是直接可运行的安全防线：仓库中的钩子与配置文件里预设了部署模板路径，必须经由铺设脚本把包解到目标目录、完成路径改写并写入宿主与 Git 配置后，拦截链路才能真正接通。

主流程的[Step 2 与 Step 5](../walkthroughs/one-real-run.md#step-2-在部署配置下运行同一个引擎)提到“不能把源码目录当作已安装环境”。这背后的约束是兼容双场景：同一份包既要放进单机终端的自定义目录，也要能在云端容器初始化时无人工干预地幂等铺设并保留已有本机私有数据。

## 铺设流程与路径改写机制

[铺设脚本](../../policy/bootstrap.sh)（默认目标 `$GUARD` 为 `$HOME/.claude/guardrails`）按固定顺序完成安装或幂等升级：

1. 检查基础依赖 `python3`、`git`、`curl`，并尽力安装 R6 验签所需的 `openssh-client`（`ssh-keygen`），同时导出 `PYTHONUTF8=1` 避免中文 Windows/GBK 区域下子进程编解码异常导致静默退化。
2. 从 `HOOK_PACKAGE_URL` 或修改后的默认地址下载 zip/tgz 包，解包前先备份保留已有的 `private-seed.json`、`sanitize-map.json`、`private-repos.json` 与 `.resolve.json` 缓存，替换 `hooks/` 与 `policy/` 后再还原私有文件。
3. 使用 `sed` 将 `policy/*`、`hooks/*.sh`、`hooks/*.py` 与 `hooks/git/*` 中写死的模板路径批量改写为实际的 `$GUARD/...` 与 `$HOME/.claude/settings.json`，并赋予可执行权限。
4. 将全局 `git config --global core.hooksPath` 指向 `$GUARD/hooks/git`。
5. 调用[设置注入脚本](../../policy/install-settings.py)分别向当前仓库（及 `GUARD_REPOS` 列表中的仓库）的 `<repo>/.claude/settings.json` 与用户级 `~/.claude/settings.json` 幂等合并 6 个 `PreToolUse`、1 个 `SessionStart` 和 `attribution.sessionUrl=false`。按脚本文件名去重，并在使用 `--exclude-untracked` 时把未跟踪的仓库级设置写入本地 git exclude 文件，避免污染 `git status`。
6. 尝试执行一次 `refresh-private.py` 并运行自检打印汇总状态。

## 凭证注入辅助与非敏感构建约定

为避免在云端或托管环境以明文文本形式存放 API 令牌文件，仓库提供了[凭证数据源模板](../../policy/token-helper.cpp)与[加密构建脚本](../../policy/build-secure-token.py)：

```text
手填令牌值的 cpp 模板 + 可选环境变量 GUARD_PKG_URL
  ──▶ build-secure-token.py 生成 32 字节随机会话密钥做 XOR 密文转换
  ──▶ 交叉编译为本地可执行文件 token-helper（chmod 700，只留本机不入库）
  ──▶ 运行时仅在内存解密写入环境变量并 exec 目标进程，绝不向终端打印值
```

注意构建时若需把发布包的下载地址注入 `PKG_URL_DEFAULT`，必须通过构建时环境变量 `GUARD_PKG_URL` 传入，绝不写死在源码中，以免包内的地址名称触发防泄漏规则自身（R1 自指拦截）。同时，这层 XOR 混淆针对的是自动文本扫描，不替代硬件或系统级密钥管理。

## 自检诊断的范围与边界

[一键自检脚本](../../policy/doctor.py)会从自身物理位置推算 `$GUARD` 路径，无需改写即可同时核查四个维度并输出 `[PASS]`、`[FAIL]`、`[WARN]` 与 `Overall: PASS|DEGRADED`：

| 检查维度 | 核对内容 | 代表性失败或告警边界 |
| --- | --- | --- |
| Claude 设置接线 | 检查 `~/.claude/settings.json` 必装钩子、`SessionStart`、`sessionUrl=false` 及未输出 `allow`；云端环境告警提醒仅仓库级设置生效 | 漏装钩子报 `FAIL`；`forbid-tamper.sh` 缺失为可选 `WARN` |
| Git 钩子接线 | 核对全局 `core.hooksPath` 指向预期目录、当前仓未用本地设置覆盖、脚本可执行以及 `--net` 仅存在于 Git 层 | 若本仓库启用了局部 `core.hooksPath`（如 `tools/repo_maintenance_hooks`），会提示局部覆盖 |
| R1/R4 名单健康 | 校验缓存存在、在 TTL 内非空、静态 `policy.json` 未反向泄露私有词或 R4 正则、缓存包含平台实时数据 | 缺失私有种子时提示 R4 未生效；未配平台令牌时提示名单不会随新建仓更新 |
| R6 签名配置 | 检查 `commit.gpgsign=true`、`gpg.format=ssh` 与 `ssh-keygen` 可用性 | 仅当上述任一必选项未通过时返回退出码 1 |

在任意仓库或克隆中只读排查安装状态时运行：

```sh
python3 policy/doctor.py
```

在全新未安装的源码克隆目录里运行该命令预期会看到 `FAIL` 与 `Overall: DEGRADED`，这正是“只读环境自检”的真实反馈，绝不能把它当作功能测试已通过的证明。如需查看所有源码文件的目录映射与改动入口，返回[代码地图](../code-map.md)；如需核对钩子与引擎的交互契约，查看[双层钩子包装与交互契约](hook-wrappers.md)。

证据状态：除特别标注外，本页基于当前源码已确认。
