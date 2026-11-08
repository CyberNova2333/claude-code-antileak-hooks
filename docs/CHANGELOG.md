# 护栏历史变更记录

[返回项目入口](../README.md)

保留原有 rev4 至 rev4.4 的变更与讨论记录。历史部署口径以当前代码和部署参考为准。

## rev4 相对 rev3 的改动(全部有沙箱测试)
1. **私有仓名出包**：policy.json / forbid-patterns(已删，无人读取) / refresh-private 写死种子 / private-repos.json / msgcb 映射 全部清除；名单进 `local-only/`。
2. **R1 三模式统一**：rev3 的 commit-msg / pre-push / scan-repo 只查静态表(只在缓存里、不在静态表里的私有仓名，在 commit 模式直接 pass)。
3. **deny 理由脱敏**：rev3 会把命中的完整 token 原文回显进 Agent 会话。
4. **Claude hooks 语义修正**：rev3 放行时输出 `permissionDecision:"allow"` = **跳过权限确认**——四个 hook 合起来等于把所有 Bash/Write/Edit 自动放行。rev4 放行=不表态；拦截 = deny JSON + `exit 2`；输入解析失败按拦截；豁免路径 realpath 归一化。
5. **R6 修复**：指纹比较(`SHA256:` 前缀)、pre-commit 指纹算法、`--no-gpg-sign` 等绕过开关在快速层被拦、`%G?`=B 也拒。
6. **pre-push 只审远端没有的提交**(`git rev-list <tip> --not --remotes=<remote>`)：rev3 推新分支会重审全历史，历史上任一未签名(人类)提交即永久卡死(实测)。
7. **pre-commit 只扫新增行 + 涉及路径**：rev3 扫整份 diff 含删除行，清理违规词的提交永远提交不上(实测)。新增 `pre-merge-commit`。
8. **refresh-private 修复**：`gh api --jq .login` 输出裸字符串致 `me` 永远为 None(个人私有仓从不枚举)；`user/repos` 只翻第 1 页；组织仓被错记到 username；403 限流被当"看不到"静默丢 owner；无任何来源时会写出空的"fresh"缓存(fail open)。rev4：无来源不回写、`expected_owners` 覆盖校验(只有"看到该 owner ≥1 个私有仓"或种子列出才算覆盖，HTTP 200 不算)、原子写。
9. **bootstrap 修复**：rev3 的 sed 漏掉 refresh/resolve/scan/doctor 与 token-helper 路径 → 缓存读写路径不一致，云端装出来即坏。rev4 覆盖 policy/*、hooks/*.sh、hooks/*.py、hooks/git/*。
10. **install-settings 修复**：rev3 漏装 forbid-read-secret.sh；matcher 补 NotebookEdit；hook timeout 15→120s(check.py 懒刷新最长 60s；**hook 超时 = 无决策 = 放行**，timeout 必须大于内部最慢路径)。
11. **快速层补漏**：`git push -u origin claude/x`(Claude Code 实际形态，rev3 放行)；`--no-verify`/`-c core.hooksPath=`；forbid-read-secret 去掉裸词 `token`/裸 `.env`(rev3 把 `grep -rn access_token src/`、`sed s/token/` 全拦)，补 printf/`${VAR:0:n}`/`env|`/`/proc/*/environ`/`os.environ`/`gh auth status -t`。
12. scan-repo：无 origin 远端时永远报"干净"(selfname='' 过滤掉全部命中)已修；不再按扩展名白名单(漏 .gitmodules/Dockerfile)。
13. 删除 check.py 里无人调用的 `tokens()/get_token()`；commit 模式先剥 `core.commentChar` 注释行。
14. **按你的决定**：R4 业务标识全部出包进种子；R5 = 禁推一切 Agent 分支、不做 main/强推保护；#8 resolve-private 接入(xxx-xxx 形态)；#10-1 pre-push 扫新提交内容(cherry-pick/rebase/am/合并/--no-verify 进来的内容在这里兜底，实测)；#10-2 TTL 6h + Claude hook 路径永不联网(过期直接 ERROR 并给出刷新命令)；R6 改为 check-novalidate 验签 + 签名指引文案(policy.signing_instructions)；R7 去掉变量名匹配、补 `sk-proj-/sk-ant-/ghu_/ghr_/glpat/npm_`；R2 补漏的型号；token 只从环境变量 `GH_TOKEN_n` 读(不再调用 token-helper get)。

## rev4.1 相对 rev4 的改动

15. **补上 Read/Grep 的凭据读取缺口（rev4 实测发现）**：`forbid-read-secret.sh` 只解析 Bash 的
    `tool_input.command`，而 Claude 的 Read / Grep 工具走 `tool_input.file_path` / `tool_input.path`。
    于是同一个动作换个工具就绕过：`cat /root/.claude/settings.json` 被拦，`Read /root/.claude/settings.json` 放行。
    新增 `hooks/forbid-read-path.sh` + matcher `Read|Grep` 补齐这一半。
    * **必须是新文件名**：`install-settings.py` 的去重按**脚本文件名**判定，复用
      `forbid-read-secret.sh` 会被判「已装」而跳过注入，缺口照旧。
    * 覆盖 Read 与 Grep（两者都能把文件**内容**带回会话）；**Glob 不覆盖**——它只回文件名不回内容。
    * 路径先 `realpath` 归一化再匹配，防 `../` 与软链绕过；白名单放行 `*.pub` / `known_hosts` /
      `.ssh/config` / `authorized_keys`，避免 rev4 改动 11 反对的那类过度拦截。
    * `_lib.sh` **未改动**（新 hook 自带 JSON 解析，不调用只认 `command` 的 `get_cmd()`），影响面仅限新增文件。

16. **私有仓名出包（rev4 漏网）**：`policy/token-helper.cpp` 与 `policy/build-secure-token.py` 里各硬编码了一次发布地址
    `https://github.com/<owner>/<repo>/releases/download/...`，而该仓是**私有**的。
    后果有两个，rev4 都没覆盖到：
    * 破坏「包内不含私有仓名、可放 CDN」的前提——真发到 CDN 就泄露了；doctor 只检查 `policy.json` 一项，查不到这里。
    * **自指死结**：护栏自己的 R1 会拦住任何把新版包提交进仓库的提交（`私有仓名: <本仓名>`），
      导致各仓 vendor 的 `guardrails/` 从引入该 URL 起就**再也同步不了**。
    改法：URL 不再写死，构建时由 `build-secure-token.py` 从环境变量 `GUARD_PKG_URL` 注入；未设置则只是不导出该项。

## 已按你的决定处理(rev4)
- token 设计：护栏只读环境变量 `GH_TOKEN_1..N`；token-helper 的职责就是把它们写进环境。
- R5：禁推一切 Agent 分支(claude/ codex/ chatgpt/ …)；不做 main/强推保护(ruleset 负责)。
- R4：域名/内部标识全部出包 → 本机种子 `patterns`。
- R6：不依赖 allowedSignersFile，直接验签；拦下即输出"生成 ed25519 + 发公钥给我"的指引。
- R2：只补漏的型号，不改形态；R7：去掉变量名匹配。
- #8 resolve 接入(xxx-xxx)；#9 裸名子串不改；#10-1 pre-push 扫内容、#10-2 TTL 6h + Claude 层不联网；#10-3/4/5 维持原设计。

## 已定(第二轮)
- 云端：Environment Setup Script = bootstrap.sh；Claude 层走仓库级 `.claude/settings.json`(幂等、去重、未跟踪即 exclude)；名单来源 = `GH_TOKEN_n` + `GUARD_SEED_B64`。`expected_owners` 因此不需要填(种子里的 owners 就是覆盖声明)。
- 护栏目录/`settings.json` 写入不再豁免，和普通文件一样扫(含规则词的 README 会被拦)。
- 放行 = 不表态，本机恢复正常权限弹窗；Claude hooks 不联网(缓存过期直接拦并给刷新命令；未知裸名只在 git 层查)。

## rev4.2 相对 rev4.1 的改动
1. **pre-push 重签豁免**：待推提交若与远端已有某个提交"内容改动完全相同"——只是换了签名 / committer / 父提交（整仓 SSH 重签、rebase、原样 cherry-pick）——不再重扫其新增行；**消息、签名、作者/提交者邮箱照查**。判定二选一：(a) 树签名相同，即 `(tree, 各父提交的 tree)` 逐一相等 ⇒ diff 必然相同，且完全不读 blob（远端历史缺 blob 的不完整镜像也能判）；(b) `git patch-id --stable` 相同，只对作者时间相同的远端候选逐个算 `diff-tree`，单个算不出就不豁免那一个。背景：迁移到新平台后整仓重签，重写后的历史对远端而言全是"新提交"，历史上早已放行的旧内容会被今天的规则整体重审而永久卡死。任何环节失败都只是"不豁免"，绝不因此放行。`policy.resign_exempt=false` 可整体关闭。
2. **远端"已有"不再只信本地 `refs/remotes/*`**：`--net` 下以 `git ls-remote` 拿到的真实顶点为准（本地跟踪 ref 一条 `update-ref` 就能伪造成"远端已有"，rev4 的 `--not --remotes=` 也有此问题，一并改为优先用真实顶点）；无网络退回本地跟踪 ref（git 钩子总是带 `--net`）。
3. **R2 型号规则跳过 base64 编码串**：命中若整个落在一段 ≥24 字符、无分隔符、大小写与数字混杂的串里（JSON 内嵌的图片/音频数据），视为编码数据不算命中。真实型号名从不会有 24 个以上连续字母数字且没有任何分隔符——带连字符/点号的长型号名照样命中。R7 凭据规则不走这条。
4. **R7 的 Google API key 形态收紧为固定 39 位**（`AIza` + 35 位，前后不能再接同类字符）：原 `{30,}` 会把 base64 里任意 `AIza…` 片段整段吞掉。

## rev4.3 相对 rev4.2 的改动
1. **中文 Windows / GBK 区域设置下的编码问题**：Python 在这类环境里默认按本地编码（GBK）读写标准流、`open()` 与子进程输出，而 git、gh、Claude Code 给的都是 UTF-8。后果是读到的中文乱码或直接抛 `UnicodeDecodeError`——不少调用点把异常当成「查不到」处理，于是**静默放行**；输出 `✘` 等 GBK 里没有的字符则直接崩溃。实测：内联 `json.load(open(policy.json))` 在 GBK 环境下抛错，`pre-commit` 随即退回兜底值，签名指纹变成空串。修法分三层：
   - 所有 shell 入口（`_lib.sh`、`commit-msg` / `pre-commit` / `pre-push`、`bootstrap.sh`）导出 `PYTHONUTF8=1`，内联 `python3 -c` 一并生效；
   - 每个 Python 入口脚本启动时把 stdin / stdout / stderr 统一设为 UTF-8，父子进程之间的管道两端编码一致；
   - `subprocess.run(text=True)` 一律显式 `encoding='utf-8', errors='replace'`，`open()` 显式 `encoding='utf-8'`——脚本被单独运行时也不依赖环境变量。

## rev4.4 相对 rev4.3 的改动
1. **名单来源以 托管平台 为主、GitHub 改为可选**：仓库已迁到 托管平台，托管平台 平台（令牌文件或 `PLATFORM_TOKEN`）成为私有仓名单的主来源；GitHub（`GH_TOKEN_n`、gh）只在仍有私有仓托管在 GitHub 时才需要配置。取并集、令牌配置了就必须成功、没配置就跳过的语义不变——refresh / resolve 的判定逻辑本来就与平台无关，这次改的是外围：
   - `token-helper.cpp` 新增 `PLATFORM_TOKEN` 槽位；`build-secure-token.py` 原先要求至少有一个 `GH_` 开头的令牌，**只填 平台令牌会直接报 `NO_TOKENS_EXTRACTED` 构建失败**，现在 `托管平台_` 与 `GH_` 任一即可；
   - `doctor.py` 新增「配置了 平台令牌」检查；没有 `GH_TOKEN_n` 降为提示而不再告警；判断「缓存含平台实时数据」时把 `seed-env`（来自环境变量的种子）也当作种子，此前会误判为实时数据；
   - `bootstrap.sh` 与部署说明：环境变量以 `PLATFORM_TOKEN` 为主，网络白名单加 `api.github.com`；`check.py` / `refresh-private.py` 的出错提示补上 平台令牌；`policy.json` 的来源说明同步改写；「main 保护是 GitHub ruleset 的活」改为平台中性的表述。
2. **把 CLI 命令行工具的登录令牌 `~/.git-credentials` 加入禁读名单**（`forbid-read-secret.sh` 与 `forbid-read-path.sh`）：此前 GitHub 的 `hosts.yml`、托管平台 的 `.git-auth-token` 都在名单里，唯独它不在，`cat ~/.git-credentials` 可以直接把令牌读进会话。
3. **`forbid-read-path.sh` 在 Windows 上完全不生效（rev4.1 起）**：一是开头只把以 `/` 开头的路径当绝对路径，Windows 上 Read / Grep 给的是 `C:\…` 形态，于是直接放行；二是 `realpath` 在 Windows 上返回反斜杠路径，按 `/` 写的规则一条也匹配不上。现在接受盘符路径，并在规范化后统一把 `\` 换成 `/`。实测 `C:\…`、`C:/…`、`/c/…` 三种形态下的令牌、私钥、Claude 配置与 `.env` 均能拦住，公钥、`.env.example` 与普通文件照常放行。
