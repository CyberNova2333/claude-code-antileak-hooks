# 版本变更与迁移记录

本页整合了自 `rev4` 至 `rev4.4` 的重要机制调整、安全语义修正与升级迁移要点（原根目录历史变更记录已合并至此及 `repo-docs/change-log.md`）。

## 升级路径与破坏性变化概览

- **升级方式（幂等保留私有资产）**：重新运行 `policy/bootstrap.sh` 即可覆盖更新 `hooks/` 与 `policy/`，脚本会提前备份并还原 `$GUARD` 下的 `private-seed.json`、`sanitize-map.json`、`private-repos.json` 与 `.resolve.json` 缓存。
- **需要人工补配的新增项（若从早期版本升级）**：
  1. 若原本依赖在随包文件硬编码的私有仓列表、业务正则或发布包 URL，现在必须移入 `$GUARD/private-seed.json`（或环境变量 `GUARD_SEED_B64`）与构建环境变量 `GUARD_PKG_URL`。
  2. 为阻断 `Read` / `Grep` 绕过 Bash 读凭据路径，`settings.json` 与 `install-settings.py` 新增第 6 个 `PreToolUse` 钩子 `forbid-read-path.sh`（升级时再运行一次 `install-settings.py` 即可幂等合并）。
  3. 提交签名已改为通过 `ssh-keygen -Y check-novalidate` 直接核验，不再依赖或强求本地存在 `gpg.ssh.allowedSignersFile`。

## rev4.4：多托管平台主来源适配、凭据文件补全与 Windows 路径修补

1. **私有仓名单主来源演进**：将主托管平台 API（令牌文件或对应环境变量）作为首要来源，GitHub（`GH_TOKEN_1..N` 与 `gh` CLI）调整为可选来源，仍保持“已配来源取并集、已配即强校验失败不回写”的一贯契约。同步更新 `token-helper.cpp`、`build-secure-token.py`（不再强求必须存在 `GH_` 开头令牌）与 `doctor.py`（能识别环境变量种子 `seed-env` 与非强制 GitHub 令牌提示）。
2. **补充拦截命令行登录令牌文件**：将 `~/.git-credentials` 与托管 CLI 令牌路径纳入 `forbid-read-secret.sh` 和 `forbid-read-path.sh` 的保护清单。
3. **修复 Windows 下 `forbid-read-path.sh` 失效缺陷**：支持盘符绝对路径（`C:\...` 与 `C:/...`），并在 `realpath` 后将反斜杠 `\` 统一替换为 `/` 后再匹配敏感路径与白名单。

## rev4.3：统一 UTF-8 编解码消除中文 Windows / GBK 静默退化

- 在中文 Windows / GBK 区域设置下，Python 默认按本地编码处理标准流与子进程输出，曾导致读取含中文的 `policy.json` 或 `git` 输出时抛出 `UnicodeDecodeError` 并落入异常兜底（例如指纹退化成空串）。
- 修复分三层落地：所有 shell 入口（`_lib.sh`、Git 钩子、`bootstrap.sh`）统一导出 `PYTHONUTF8=1`；所有 Python 入口重配置 `stdin`/`stdout`/`stderr` 为 UTF-8；所有文件读写与 `subprocess.run` 均显式指定 `encoding='utf-8', errors='replace'`。

## rev4.2：重签豁免、真实远端顶点与 R2/R7 防误伤收敛

1. **`known_content` 重签豁免**：支持在整仓迁移、SSH 重签或 `rebase` 后对与远端内容逐字节一致的新提交跳过正文重复扫描，仅保留签名、作者邮箱与提交消息强查（支持 `tree + parent trees` 签名与 `--stable` `patch-id` 两种比对方式，任何环节算不出即退化为全扫）。
2. **`--net` 以 `git ls-remote` 真实顶点为准**：消除本地跟踪分支被 `update-ref` 篡改而绕过 `pre-push` 审查的风险。
3. **`R2` 过滤长编码串与 `R7` 收紧匹配**：`R2` 模型正则通过 `in_b64_run` 跳过 ≥ 24 位连续无分隔字母数字串；`R7` Google API Key 收紧为前后无同类字符紧邻的固定 39 位格式（`AIza` + 35 位）。

## rev4–rev4.1：核心 Fail-Closed 架构奠基

- **私有数据彻底出包**：从 `policy.json` 与可执行脚本中清空所有私有仓名、业务正则与硬编码发布 URL（改由 `GUARD_PKG_URL` 注入构建），解决分发泄密与 R1 自指拦截死锁。
- **修复 Claude Hooks 跳过权限弹窗漏洞**：废除通过时输出 `permissionDecision: allow` 的旧设计，改为“放行不表态（exit 0 无输出）、拦截与解析异常一律 `deny` JSON + `exit 2`”。
- **补齐工具与 Git 全路径覆盖**：补齐 `NotebookEdit`（`new_source`）、`Read|Grep`（`forbid-read-path.sh`）、`git push -u origin claude/...` 形态与 `pre-merge-commit` 钩子；统一 `check.py` 的 `content`/`commit`/`push` 三模式、脱敏前 8 位回显及 `pre-commit` 只扫 `+` 新增行的规则；完善 `refresh-private.py` 分页与 `expected_owners` 完整性校验。
