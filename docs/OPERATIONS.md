# 护栏部署与规则参考

[返回项目入口](../README.md)

以下命令均从仓库根目录执行。

## 结构

```
policy/
  policy.json        # 规则单一来源: 静态正则(R2 型号/会话) + secret 正则(R7) + agent_branch_prefixes(R5) + 指纹/签名指引(R6) + 作者邮箱(R3) + 各路径 + expected_owners
  check.py           # 引擎: content / commit / push 三模式, 三态 pass|violation|error；三模式都做 R1(动态)。--net 才联网(git 钩子/scan-repo 传)
  doctor.py          # 一键自检(路径按自身位置推导，bootstrap 搬家后仍可用)
  install-settings.py# 幂等注入 settings.json(用户级，或 <repo>/.claude/settings.json 仓库级)：5 个 PreToolUse + SessionStart + attribution.sessionUrl=false
  bootstrap.sh       # 铺设脚本 = Anthropic 云端 Environment 的 Setup Script，本机也用它装(见「部署」)
  msgcb-hygiene.py   # filter-repo --message-callback body(消息中性化；映射表读本机 sanitize-map.json)
  token-helper.cpp   # token 焊入 ELF 模板(填值后 g++ 编译；产物只放本机)。唯一职责：把 PLATFORM_TOKEN / GH_TOKEN_n 写进环境，护栏本身只读环境变量
hooks/
  _lib.sh            # 五个 Claude hook 共用: 放行=不表态(exit 0 无输出), 拦截=deny JSON + exit 2
  forbid-content.sh  # Write|Edit|NotebookEdit: 拦新内容(content/new_string/new_source)
  forbid-commit.sh   # git … commit: 拦消息/作者 + 拦 --no-verify/-n/--no-gpg-sign/改 hooksPath/gpgsign
  forbid-push.sh     # git … push: 拦推向 Agent 分支(含 `push -u origin claude/x` 形态) + --no-verify
  forbid-read-secret.sh  # 拦"读 token/打 token 到会话"(提醒级)
  forbid-tamper.sh   # (新增, 可选) 拦改 core.hooksPath/disableAllHooks/删改护栏目录与 settings.json
  refresh-private.py # 私有仓并集: 种子(owners/private/patterns) + 托管平台(主来源: policy.platform_token_file 或 PLATFORM_TOKEN) + 可选的 GitHub(GH_TOKEN_n、gh)，owner 覆盖校验，原子写缓存
  resolve-private.py # R1 补充: 对缓存里没有的 xxx-xxx 裸名 / 已知 owner 下的 owner/repo 单名查询(由 check.py --net 调用; 负缓存 24h)。只问 refresh 成功过的来源(缓存 sources)
  scan-repo.py       # 存量审计(HEAD 树 + 全历史消息；--scan-history 全历史树)；R1 同样读动态缓存
hooks/git/           # Git 层强制执行(只调 check.py)
  pre-commit / pre-merge-commit / commit-msg / pre-push
settings.json        # 本机 CLI 用的 Claude Code hooks 示例(env 已脱敏)
```

不随包分发、只放本机(`local-only/`)；bootstrap 装完后的位置是 `$GUARD`(默认 `/root/.claude/guardrails/`)：
- `$GUARD/private-seed.json`(云端：环境变量 `GUARD_SEED_B64`) —— `{"owners":[…], "private":["Owner/repo", …], "patterns":["业务标识正则", …]}`：
  离线兜底 + 声明哪些 owner 必须被覆盖 + R4 业务标识(域名/内部流水线名)正则。
- `$GUARD/sanitize-map.json` —— msgcb-hygiene.py 的 名字→中性名 映射。
- token-helper 编译产物(含 token)——把 `PLATFORM_TOKEN` 与可选的 `GH_TOKEN_1..N` 写进 Claude Code / 钩子的运行环境；云端直接在 Environment 环境变量里配。

## 规则 R1–R7
- **R1** 私有仓名：来自 `private-repos.json`(`Owner/repo` 与裸名两种形态；裸名为子串匹配，设计如此)。缓存缺失/损坏/过期 → **ERROR → 拦**：git 钩子(`--net`)会先就地刷新一次，Claude hooks 不联网、直接让 Agent 跑 `refresh-private.py`。
  补充(`--net`)：缓存里没有、但长得像仓名的裸名(`xxx-xxx`，≥6 字符、至少一段含 2 个字母、后面不跟 `:`) 与 已知 owner 下的 `owner/repo`，交给 `resolve-private.py` 逐个问 refresh 成功过的平台(GitHub / 托管平台)：private → 拦；public/不存在 → 放；查不到(无令牌/网络) → ERROR。候选超过 `resolve_budget`(30) 时不逐个查，改为整体 refresh 一次再按新名单比。`Co-authored-by` 等 trailer 键与 `pre-commit` 等常见词在 `resolve_ignore` 里忽略。
- **R2** 具体型号与会话标识：完整清单见 `policy/policy.json` 的 `forbidden_patterns`（随包分发，不含私密信息）。此处不逐字列举——包若含禁词举例，会被自己的规则拦住提交。
  形态上有误伤(英文里的同类句式)——按约定提交信息全中文，不处理；注意这些正则也作用于文件内容。
- **R3** 作者/提交者不得是 Agent 提供商 noreply；非根提交必须带 `Co-authored-by:`。
- **R4** 业务标识(域名/内部流水线名)：**不在包里**，来自本机种子 `patterns` → 缓存 → check.py/scan-repo。没有种子的环境 R4 不生效(doctor 会 WARN)。
- **R5** 禁止推送到任何 Agent 分支：`agent_branch_prefixes`(claude/ codex/ chatgpt/ gpt/ openai/ agent/ deepseek/ kimi/ copilot/ cursor/ devin/ gemini/ jules/ aider/ anthropic/，大小写不敏感，含删除)。不做 main/强推保护——那是托管平台的活(GitHub 的 ruleset)。
  注意：Anthropic 云端 云端的 GitHub 代理只允许推会话工作分支 `claude/…`，所以云端会话在 R5 下推不出任何东西(按设计)。
- **R6** 必须 SSH 签名，且不能是 Agent 通用密钥。验签方式：从提交对象剥出 `gpgsig`，`ssh-keygen -Y check-novalidate -n git` 密码学验签并取指纹——**不需要 `gpg.ssh.allowedSignersFile`**(git 自带的 `%G?`/`%GK` 没有它时全为空，rev3 就死在这里)。
  发现未签名/通用密钥/非 SSH 签名 → 拦下并输出 `policy.signing_instructions`：让 Agent 生成 ed25519 密钥、配置 git、把公钥完整内容发给你，你手动加到托管平台账号(GitHub / 托管平台)。
- **R7** 禁提交凭据**值**(`gh[pousr]_`、`github_pat_`、私钥、AKIA、`sk-…`(含 sk-proj-/sk-ant-)、xox、AIza、glpat、npm_)。**不再匹配变量名**(`GH_TOKEN`/`GITHUB_TOKEN`)。deny 理由里的凭据只回显前 8 字符。

## 部署(两边都用 bootstrap.sh，装出来的目录结构完全一致：`/root/.claude/guardrails/`)
### 云端：Anthropic 云端 → Environment → Setup Script
1. 把 `policy/bootstrap.sh` 整段粘进 Setup Script，改第一处 `PKG_URL_DEFAULT` 为 CDN 上的包地址(zip/tgz 均可)。
2. Environment 环境变量：`PLATFORM_TOKEN`(托管平台 访问令牌，名单主来源，只需读组织/仓库)、`GUARD_SEED_B64`(`base64 -w0 private-seed.json`)；可选 `GH_TOKEN_1..N`(各 GitHub Owner 的 Metadata:Read PAT，只在仍有私有仓托管在 GitHub 时才需要)。
3. Environment 网络白名单：CDN 域名 + `api.github.com`；配了 GitHub 来源时再加 `api.github.com`。
4. 脚本做的事(幂等，不漏装不重装)：装包 → 改写路径 → `core.hooksPath`(git 层，所有仓库自动生效) → 当前仓库 `.claude/settings.json` 合并 5 个 PreToolUse + SessionStart + `attribution.sessionUrl=false`(云端唯一会读的 Claude 层来源；按脚本名去重，仓库里已提交过护栏 settings 的不会再装；新写的文件进 `.git/info/exclude`) → 用户级 settings(云端忽略) → 刷新名单(拿不到环境变量就留给 SessionStart) → doctor。
   下载/解包失败脚本退出 1(环境创建失败)——没有护栏就不该让 Agent 跑。
5. 云端已知限制：GitHub 代理只放挂载仓库、只允许推 `claude/…`(与 R5 相斥，云端推不出东西，按设计)；环境变量与 Setup Script 对环境使用者/Agent 可读。
### 本机 CLI(Droidspaces 容器)
```
HOOK_PACKAGE_URL=file:///sdcard/guardrails-rev4-package.zip bash bootstrap.sh     # 再跑一次 = 升级(种子/映射/缓存保留)
cp private-seed.json sanitize-map.json /root/.claude/guardrails/ && chmod 600 /root/.claude/guardrails/{private-seed.json,sanitize-map.json}
g++ -O2 -o /root/.claude/guardrails/token-helper policy/token-helper.cpp   # 先手填 token；chmod 700；由它把 PLATFORM_TOKEN(与可选的 GH_TOKEN_1..N)写进 Claude Code 的环境
# 产物 URL 不写死在包里：构建时用 GUARD_PKG_URL 注入（build-secure-token.py 读它）；不设则只是不导出 PKG_URL_DEFAULT
#   例：GUARD_PKG_URL=https://<你的发布地址>/guardrails-rev4-package.zip python3 policy/build-secure-token.py policy/token-helper.cpp /tmp/gen.cpp
apt-get install -y openssh-client                                            # ssh-keygen 是 R6 验签的硬依赖
python3 /root/.claude/guardrails/hooks/refresh-private.py && python3 /root/.claude/guardrails/policy/doctor.py
```
仓库级 `.claude/settings.json` 若要提交进仓库，两边路径一致(都是 `/root/.claude/guardrails/hooks/...`)，本机也直接生效；用户级 settings 里的同名 hook 会各跑一次(重复 deny 一次，无害)。
