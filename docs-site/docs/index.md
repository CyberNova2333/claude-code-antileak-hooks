# 概览、边界与多环境部署

## 核心定位与能力边界

**Claude Code Antileak Hooks** 是一套由本地 Bash 包装脚本与单一 Python 策略引擎构成的防泄漏护栏套件，专门用于在使用 AI 编程助手和 Git 协作时提前阻断敏感内容落盘与违规提交推送：

- **它做什么**：在 Claude Code 工具调用前离线拦截违规文本写入（`Write` / `Edit` / `NotebookEdit`）、高危读取（`Bash` 与 `Read` / `Grep`）、绕过标志（`--no-verify`、`--no-gpg-sign`）及 Agent 分支推送；在 Git `pre-commit`、`pre-merge-commit`、`commit-msg` 与 `pre-push` 阶段强制检查私有仓名、业务标识正则、凭据格式、非提供商作者与非通用 SSH 提交签名。
- **它不做什么**：不替代托管平台的受保护分支规则集或强推拦截（`R5` 明确把主分支保护留给托管平台）；不覆盖只返回文件名不读取正文的 `Glob` 工具；当本机拥有最高系统权限时，提醒级拦截不能抵御刻意绕过，真正的强防线是 Git 推送前复查与远端权限隔离。
- **两套钩子严格隔离**：仓库内的 `hooks/` + `hooks/git/` + `policy/` 是可分发部署的防泄漏产品；而 `tools/repo_maintenance_guard.py` 与 `tools/repo_maintenance_hooks/` 仅用于克隆本仓库自身的离线提交卫生与格式检查，请勿混用。
- **交互式接口参考**：各 Hook 包装脚本、`policy/check.py`、`refresh-private.py`、`bootstrap.sh`、`doctor.py` 与 `scan-repo.py` 的参数约束与标准调用示例集中汇总在 [API 与组件参考](/api-reference/)。

## 运行前提依赖

| 组件 | 用途 | 缺失时的表现 |
| --- | --- | --- |
| `python3` | 运行 `check.py`、名单刷新与设置注入引擎 | `bootstrap.sh` 直接退出 1 阻断安装 |
| `git` | 计算暂存新增行、`ls-remote`、读取配置与提交对象 | `bootstrap.sh` 直接退出 1 |
| `curl` 与 `unzip`/`tar` | 下载并解包发布包（zip 或 tgz） | `bootstrap.sh` 下载/解包失败退出 1 |
| `openssh-client`（`ssh-keygen`） | R6 密码学验签与 `user.signingkey` 指纹提取 | 缺失时由 `bootstrap.sh` 尝试安装；仍缺失则按保守失败拦截提交与推送 |

跨平台运行时统一通过入口脚本导出 `PYTHONUTF8=1` 并显式使用 UTF-8 读写，防止中文 Windows / GBK 区域设置下 `json.load` 或管道解码崩溃后落入误放行路径。

## 多模式与多环境部署指南

**重要前提**：源码里的 `hooks/`、`hooks/git/` 与 `policy/` 硬编码了模板路径（如 `/root/.claude/...`），因此**不能直接把源码克隆中的 `hooks/` 或 `hooks/git/` 当作现成安装目录**，必须通过 `policy/bootstrap.sh` 完成解包与 `sed` 路径改写。

### 方式一：本机 CLI 环境安装与幂等升级

准备发布压缩包（或将仓库打包为 zip/tgz），通过 `HOOK_PACKAGE_URL` 指定包地址执行铺设脚本；重复运行即可完成幂等升级，并自动保留已有私有文件与缓存：

```bash
# 1. 下载/指定发布包并铺设到 $GUARD（默认为 $HOME/.claude/guardrails）
HOOK_PACKAGE_URL=file:///path/to/guardrails-package.zip bash policy/bootstrap.sh

# 2. 部署本机私有种子与历史映射表（绝不进入可分发仓库）
cp private-seed.json sanitize-map.json "$HOME/.claude/guardrails/"
chmod 600 "$HOME/.claude/guardrails/private-seed.json" "$HOME/.claude/guardrails/sanitize-map.json"

# 3. 注入本机平台与可选 GitHub 只读令牌（见下方可选编译步骤）并刷新名单与自检
python3 "$HOME/.claude/guardrails/hooks/refresh-private.py"
python3 "$HOME/.claude/guardrails/policy/doctor.py"
```

`bootstrap.sh` 在铺设过程按顺序完成以下动作：
1. **保护本机私有状态**：解包替换 `hooks/` 与 `policy/` 前，先备份 `$GUARD` 中已有的 `private-seed.json`、`sanitize-map.json`、`private-repos.json` 与 `.resolve.json` 缓存并在解包后还原。
2. **批量改写模板路径**：使用 `sed` 把 `$GUARD/policy/*`、`hooks/*.sh`、`hooks/*.py` 与 `hooks/git/*` 中的 `/root/.claude/...` 模板路径替换为当前实际的 `$GUARD/...` 与 `$HOME/.claude/settings.json`，并加上可执行权限。
3. **接线 Git 全局钩子**：执行 `git config --global core.hooksPath "$GUARD/hooks/git"`，使本机所有已有与新克隆仓库自动受四支 Git 钩子保护。
4. **幂等注入 Claude Code 设置**：调用 `policy/install-settings.py` 同时向当前仓库（及冒号分隔的 `GUARD_REPOS` 列表）的 `<repo>/.claude/settings.json` 与用户级 `~/.claude/settings.json` 合并 6 个 `PreToolUse`、1 个 `SessionStart` 和 `attribution.sessionUrl=false`。注入按脚本文件名去重；加上 `--exclude-untracked` 时会把未跟踪的仓库级设置写入本地 `.git/info/exclude`，不污染 `git status`。

### 方式二：托管容器 / 云端 Setup Script 部署

云端托管编码环境通常只读取仓库级 `.claude/settings.json` 而忽略用户级 `~/.claude/settings.json`，并且需要无人工干预自动初始化：

1. 将 `policy/bootstrap.sh` 内容配置为环境 Setup Script，并将脚本内的 `PKG_URL_DEFAULT` 改为托管发布包的真实地址（`https://...`）。
2. 在环境配置中注入以下敏感变量，并在网络白名单中放行发布包域名、主托管平台 API 域名及可选的 `api.github.com`：
   - 环境变量传入 `private-seed.json` 内容：`GUARD_SEED_B64`（`base64 -w0 private-seed.json` 生成）或 `GUARD_SEED_JSON`。
   - 平台只读令牌环境变量：主托管平台令牌（对应 `policy.json` 配置键），以及可选的 `GH_TOKEN_1..N`（仅当仍有私有仓库托管在 GitHub 时需要）。
3. **已知云端限制**：若托管平台的 GitHub 代理仅允许推送 `claude/...` 这类工作分支，而 `R5` 明确禁止向任何 Agent 分支推送，则云端会话按设计将无法直接推送，需要切回中立分支或在受控环境完成后由人类提交推送。若 Setup Script 执行阶段拿不到运行时环境变量，`bootstrap.sh` 允许最佳努力失败并在会话启动时由 `SessionStart` 钩子自动补刷，刷通前引擎按 `error` 保守阻断。

### 方式三：使用 `token-helper` 为本地会话注入令牌（可选）

为避免在工作目录或配置文件中留下明文访问令牌文件，可利用 `policy/token-helper.cpp` 与 `policy/build-secure-token.py` 编译一个仅在内存解密并写入子进程环境变量的本地二进制文件（只留在本机，权限 `700`）：

```bash
# 1. 在副本中填写 TOKEN 槽位后生成 32 字节随机密钥 XOR 混淆的 C++ 源码
#    若需写入 PKG_URL_DEFAULT，务必通过构建时环境变量 GUARD_PKG_URL 注入，绝不写死进源码
GUARD_PKG_URL=https://example.invalid/guardrails.zip \
  python3 policy/build-secure-token.py /tmp/filled-token-helper.cpp /tmp/gen.cpp

# 2. 编译为本地 ELF 可执行文件并限制权限
g++ -O2 -o "$HOME/.claude/guardrails/token-helper" /tmp/gen.cpp
chmod 700 "$HOME/.claude/guardrails/token-helper"
```

注意：`XOR` 编码用于防范自动文本扫描与非授权明文读取，不替代硬件或操作系统级密钥保管库。

### 方式四：仓库自身维护守卫安装（仅限开发本仓库）

如果正在本地修改并提交 `claude-code-antileak-hooks` 仓库自身，请勿使用产品包钩子检查未部署代码，而是安装仓库内置的离线维护守卫（需要 Python 3.10+）：

```bash
python tools/repo_maintenance_guard.py install
python tools/repo_maintenance_guard.py status
```

该命令只修改当前仓库的局部 `core.hooksPath`（指向 `tools/repo_maintenance_hooks`）与 `commit.template`（`.gitmessage.txt`）。

## 安装后只读自检

使用 `policy/doctor.py` 验证接线与策略健康度；脚本从自身磁盘位置动态推导 `$GUARD`，无需改写即可运行：

```bash
python3 "$HOME/.claude/guardrails/policy/doctor.py"
```

| 检查模块 | 核心检查项 | 典型状态与含义 |
| --- | --- | --- |
| 策略配置 | `policy.json` 可读且含静态规则；未反向包含缓存私有词或 R4 业务正则 | `[FAIL]` 表示配置损坏或包内意外漏入私有资产 |
| Claude 设置 | 校验 `~/.claude/settings.json` 必装钩子、`SessionStart`、`sessionUrl=false` 与无 `permissionDecision=allow` | `forbid-tamper.sh` 为可选 `[WARN]`；云端环境提醒仅仓库级设置生效 |
| Git 钩子 | 全局 `core.hooksPath` 匹配当前 `$GUARD/hooks/git`、无局部覆盖、脚本可执行、`--net` 仅存在于 Git 层 | 若启用了局部 `core.hooksPath`（如仓库维护守卫）会告警 |
| 动态名单 | `private-repos.json` 存在、未过期（6h TTL）、非空且含平台实时数据；私有种子与平台令牌状态 | 仅靠种子运行或缺失 R4 正则时发出 `[WARN]` |
| R6 签名 | `commit.gpgsign=true`、`gpg.format=ssh` 与 `ssh-keygen` 可用性 | `allowedSignersFile` 缺失仅作 `[INFO]` 提示，不影响 R6 直接验签 |

只有所有 `[FAIL]` 清零时才会打印 `Overall: PASS` 并以 `0` 退出；否则打印 `Overall: DEGRADED` 并退出 `1`。下一步请阅读 [配置矩阵、私有种子与排错 FAQ](/docs/configuration)。
