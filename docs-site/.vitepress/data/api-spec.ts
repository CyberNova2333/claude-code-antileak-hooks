import type { ApiCatalogSpec } from './api-types';

export const apiSpecZh: ApiCatalogSpec = {
  project: 'Claude Code Antileak Hooks · 钩子、策略引擎与运维 CLI 参考',
  subtitle:
    '围绕 6 个 PreToolUse 离线拦截器、1 个 SessionStart 刷新器、4 个 --net Git 钩子、三态策略引擎 policy/check.py 及 bootstrap/doctor/scan-repo 运维脚本提供精确契约与调用示例。',
  environments: [
    { label: '默认本机安装目录 ($GUARD)', value: '$HOME/.claude/guardrails' },
    { label: '云端 Setup Script 模板基准', value: '/root/.claude' },
  ],
  searchPlaceholder: '搜索 PreToolUse、check.py、R1–R7、bootstrap.sh、doctor.py…',
  emptyText: '没有找到匹配的钩子、规则或运维脚本条目。',
  labels: {
    allGroups: '全部',
    canDo: '✅ 能做到',
    cannotDo: '⛔ 明确限制 / 不做什么',
    params: '输入参数、环境变量与策略约束',
    paramName: '字段 / 参数 / 钩子',
    paramLocation: '位置',
    paramType: '类型 / 格式',
    paramRequired: '要求',
    paramDesc: '行为与边界约束',
    responses: '输出状态与退出码语义',
    examples: '标准调用示例',
    responseSample: '输出 / 决策示例',
    copy: '复制',
    copied: '已复制',
    noParams: '无额外参数。',
    required: '必填',
    optional: '可选',
    deepDocs: '查看完整契约与部署说明',
    totalItems: '组钩子/脚本',
    envLabel: '目录基准切换',
    mobilePicker: '切换钩子或脚本',
    defaultLabel: '默认',
    plainIndexToggle: '纯文本检索与打印索引（Ctrl+K 站内搜索定位）',
  },
  groups: [
    { id: 'wrappers', title: 'Claude PreToolUse & SessionStart 钩子' },
    { id: 'engine-git', title: '策略引擎 check.py 与 Git 钩子' },
    { id: 'ops-sync', title: '名单同步、铺设安装与离线审计' },
  ],
  items: [
    {
      id: 'pretooluse-wrappers',
      group: 'wrappers',
      kind: 'HOOK',
      title: 'Claude PreToolUse (6) & SessionStart (1) 钩子包装层',
      signature: 'settings.json · forbid-{content,commit,push,read-secret,tamper,read-path}.sh + refresh-private.py',
      auth: '纯离线本地执行（不传 --net）',
      stability: '产品核心入口',
      summary:
        '通过 settings.json 挂载 6 个工具调用前拦截器与 1 个会话启动刷新器：拦截高危写入、Git 提交/推送与凭据读取，同时在放行时保持静默退出 0，绝不跳过宿主交互权限确认。',
      relatedLink: '/docs/contracts',
      relatedLabel: '查看钩子 JSON 载荷契约',
      capabilities: [
        'forbid-content.sh (Write|Edit|NotebookEdit, 120s) 与 forbid-commit/push.sh (Bash(git *), 120s) 调用 check.py 离线拦截私有仓名、业务正则与凭据格式',
        'forbid-read-secret.sh (Bash, 30s) 与 forbid-read-path.sh (Read|Grep, 30s) 先经 realpath 归一化防 ../ 与软链绕过，阻断直接读取 settings.json/.env/令牌文件',
        'forbid-tamper.sh (Bash, 30s) 拦阻篡改 core.hooksPath、disableAllHooks 与护栏目录；输入解析失败按 __PARSE_ERROR__ 直接 exit 2 拒绝',
        'SessionStart 挂载 refresh-private.py (120s)，解决云端 Setup Script 阶段环境变量尚未就位的问题',
      ],
      limitations: [
        '所有 PreToolUse 包装器刻意不传 --net：宿主对工具钩子有超时控制，超时强杀会等价于“无决策放行”，因此缓存过期时直接按 error 阻断并提示人工刷新',
        '刻意不覆盖 Glob 工具（只返回路径列表不回传正文内容）',
        '本机高权限用户（如 root）若刻意绕过提醒级 Shell 检查或直接写 .git/，强兜底防线由 Git 层钩子与远端受保护分支承担',
      ],
      params: [
        {
          name: 'tool_input.file_path / path / content',
          location: 'stdin',
          type: 'JSON (Claude Hook Payload)',
          required: true,
          description: 'Hook 标准输入 JSON；任一解析异常触发 __PARSE_ERROR__ 并输出 deny JSON + exit 2。',
        },
        {
          name: 'forbid-commit.sh / forbid-push.sh',
          location: 'config',
          type: 'if: "Bash(git *)" · timeout 120s',
          required: true,
          description: '同时阻断 --no-verify、--no-gpg-sign、agent 分支推送与违规消息。',
        },
        {
          name: 'forbid-tamper.sh / forbid-read-secret.sh',
          location: 'config',
          type: 'matcher: "Bash" · timeout 30s',
          required: false,
          description: 'forbid-tamper.sh 在 doctor.py 中标记为可选增强，推荐全部保留启用。',
        },
      ],
      responses: [
        {
          status: 'Pass -> exit 0 (无 stdout 输出)',
          tone: 'ok',
          summary: '不输出 permissionDecision: "allow"，保留宿主既有权限确认提示框。',
        },
        {
          status: 'Deny -> JSON + exit 2',
          tone: 'err',
          summary: '输出 hookSpecificOutput.permissionDecision="deny"，对命中凭据经 mask() 脱敏为前 8 位。',
          example: `{\n  "hookSpecificOutput": {\n    "hookEventName": "PreToolUse",\n    "permissionDecision": "deny",\n    "permissionDecisionReason": "[policy] 命中凭据: ghp_1234…(凭据已脱敏,40字符)"\n  }\n}`,
        },
      ],
      examples: [
        {
          label: '模拟 PreToolUse 写入拦截测试',
          lang: 'sh',
          code: `printf '{"tool_input":{"file_path":"a.txt","content":"sk-example-secret-placeholder"}}\n' \\\n  | bash "{{BASE_URL}}/hooks/forbid-content.sh"`,
        },
      ],
    },
    {
      id: 'policy-check-engine',
      group: 'engine-git',
      kind: 'CLI',
      title: '统一策略引擎与 R1–R7 规则判定 (policy/check.py)',
      signature: 'python3 {{BASE_URL}}/policy/check.py content|commit|push [target] [--net]',
      auth: '本地 policy.json + private-repos.json (+可选 --net)',
      stability: '核心裁决引擎',
      summary:
        'Claude 包装脚本与 Git 钩子共用的单一策略引擎，实现严格三态输出（pass / violation / error），覆盖 R1 私有仓名、R2 模型标识、R3 作者与 trailer、R4 业务正则、R5 Agent 分支、R6 SSH 签名及 R7 凭据正则。',
      relatedLink: '/docs/contracts',
      relatedLabel: '查看 R1–R7 规则细节',
      capabilities: [
        '对 R1/R4/R7 在 content、commit、push 三模式一致核对；对未知 xxx-xxx 裸名（避开 --flag、a/b-c 路径段与 HTTP/trailer 键）在 --net 模式下触发单名查询',
        'R2 内置 in_b64_run(minlen=24) 降噪：抑制长 Base64 数据串里的误报，同时保留 R7 凭据全量扫描与前 8 位脱敏 mask()',
        'R6 脱离 allowedSignersFile 限制：直接剥离提交对象 gpgsig 调用 ssh-keygen -Y check-novalidate 验签，并校验指纹不等于通用 Agent 密钥指纹 SHA256:32dP45...',
        'push 模式支持以 git ls-remote 真实顶点为锚点的 known_content (patch-id --stable) 重签豁免（resign_exempt=false 可关）',
      ],
      limitations: [
        '不做 main 受保护分支拦截或强推策略保护（R5 有意将其交给 CNB / GitHub 平台 ruleset 执行）',
        '缓存缺失、格式错误或已过期且未传 --net 时直接返回 error 并退出 1，绝不静默降级为 pass',
        '必须先经 bootstrap.sh 把源文件中 /root/.claude/... 模板路径替换为真实 $GUARD 路径，否则不可直接从源码克隆运行',
      ],
      params: [
        {
          name: 'mode (argv[1])',
          location: 'arg',
          type: 'content | commit | push',
          required: false,
          description: '默认 content；push 从 stdin 读取 local_ref local_sha remote_ref remote_sha 四元组。',
        },
        {
          name: 'extra (argv[2])',
          location: 'arg',
          type: 'file | msgfile | remote-name',
          required: false,
          description: 'content 传入待审文件路径（无文件读 stdin）；push 传入远端名以查询 --not --remotes=。',
        },
        {
          name: '--net',
          location: 'flag',
          type: 'boolean',
          required: false,
          description: '允许在缓存过期时懒刷新并对候选 xxx-xxx 裸名调用 resolve-private.py；仅供 Git 钩子与审计使用。',
        },
      ],
      responses: [
        {
          status: 'pass (exit 0)',
          tone: 'ok',
          summary: 'stdout 精确输出 pass（无额外告警）。',
        },
        {
          status: 'violation / error (exit 1)',
          tone: 'err',
          summary: 'stdout 输出 violation 或 error，stderr 输出脱敏命中明细与原因。',
        },
      ],
      examples: [
        {
          label: '内容模式与提交消息测试',
          lang: 'sh',
          code: `printf 'feat: normal change\n' | python3 "{{BASE_URL}}/policy/check.py" commit\nprintf 'test snippet\n' | python3 "{{BASE_URL}}/policy/check.py" content`,
        },
      ],
    },
    {
      id: 'git-hooks-layer',
      group: 'engine-git',
      kind: 'HOOK',
      title: 'Git 全局四支强校验钩子 (--net)',
      signature: 'git config --global core.hooksPath {{BASE_URL}}/hooks/git',
      auth: '联网按需校验 (--net)',
      stability: '最终本地防线',
      summary:
        '覆盖 pre-commit、pre-merge-commit、commit-msg 与 pre-push 的全局 Git 钩子层：在对象与推送边界强制执行 R1–R7 审查，并只审计远端尚未持有的新提交与新增行。',
      relatedLink: '/docs/',
      relatedLabel: '查看多环境部署指南',
      capabilities: [
        'pre-commit 与 pre-merge-commit 核查暂存新增行，commit-msg 核查提交消息、Co-authored-by 与 R3 作者身份',
        'pre-push 对 refs 列表做 R5 Agent 分支 prefix 大小写无关阻断，并对新提交执行 R6 SSH 密码学验签与 patch-id 豁免判定',
        '删除远端分支（local_sha 为 40 个 0）自动跳过，新分支采用真实远端顶点避免全历史重审',
      ],
      limitations: [
        '若单仓库手动设置了本地 core.hooksPath（如开发本仓库时启用了 tools/repo_maintenance_guard.py），将覆盖全局配置；doctor.py 会主动给出告警',
        '若在 GitHub/CNB 云端代理只允许推送到 claude/... 工作分支，R5 会按设计故意阻断推送，需人类切中性分支完成推送',
      ],
      params: [
        {
          name: 'core.hooksPath (global)',
          location: 'config',
          type: 'path ($GUARD/hooks/git)',
          required: true,
          description: '由 bootstrap.sh 自动写入全局 Git 配置。',
        },
        {
          name: 'agent_branch_prefixes',
          location: 'config',
          type: 'string[] (15 default prefixes)',
          required: true,
          description: '包含 claude/、codex/、chatgpt/、gpt/、openai/、agent/、deepseek/、kimi/、gemini/ 等。',
        },
      ],
      responses: [
        {
          status: 'Exit 0',
          tone: 'ok',
          summary: '所有暂存修改、提交消息、SSH 签名与待推送对象均通过核验。',
        },
        {
          status: 'Exit 1',
          tone: 'err',
          summary: '命中未签名提交、Agent 通用签名指纹、Agent 分支名或 R1–R4/R7 规则时立即阻断操作。',
        },
      ],
      examples: [
        {
          label: '检查 Git 钩子接线与签名配置',
          lang: 'sh',
          code: `git config --global --get core.hooksPath\ngit config --global --get gpg.format\ngit config --global --get commit.gpgsign`,
        },
      ],
    },
    {
      id: 'private-list-sync',
      group: 'ops-sync',
      kind: 'CLI',
      title: '多平台私有仓名单融合与单名解析',
      signature: 'python3 {{BASE_URL}}/hooks/refresh-private.py & resolve-private.py',
      auth: 'private-seed.json + CNB_TOKEN + 可选 GH_TOKEN_1..N / gh',
      stability: '6h 缓存 / 24h 负缓存',
      summary:
        '以“绝不将任何私有仓名或内部正则写进可分发包”为前提，动态从本机私有种子、CNB 平台 API 与可选 GitHub 令牌对等拉取并集，写入 6 小时 TTL 缓存与 24 小时单名解析缓存。',
      relatedLink: '/docs/configuration',
      relatedLabel: '查看配置矩阵与私有种子格式',
      capabilities: [
        'CNB 平台作为主来源枚举账号可见全部组织与子组织非公开仓，支持 CNB_TOKEN 或本地 cnb_token_file (Token: <值>)',
        '支持在云端环境通过 GUARD_SEED_B64（base64 -w0 private-seed.json）或 GUARD_SEED_JSON 注入私有种子，R4 业务正则仅来源于种子 patterns 字段',
        'resolve-private.py 对单次 ≤30 个（resolve_budget）疑似 xxx-xxx 裸名逐个向已验证 sources 查询（PER_CALL_TIMEOUT=3s），避免某平台失效拖死全局推送',
      ],
      limitations: [
        '随包分发的 policy.json 刻意将 expected_owners 留空且禁止填入私有词；若部署时未提供种子且无任何来源返回私有仓，refresh 判为不可信（FAIL, exit 1）',
        '已配置的令牌只要存在（如 CNB 令牌文件存在或 GH_TOKEN_n 非空）重试失败仍失败则整次 refresh 不回写，保持原有状态 fail-closed',
      ],
      params: [
        {
          name: 'private-seed.json / GUARD_SEED_B64',
          location: 'env',
          type: 'JSON { owners, private, patterns }',
          required: false,
          description: '本机权限建议 600；patterns 是 R4 业务正则的唯一来源，缺失则 R4 不生效。',
        },
        {
          name: 'CNB_TOKEN / GH_TOKEN_1..N',
          location: 'env',
          type: 'Read-only API Token',
          required: false,
          description: '云环境需在网络白名单放行 api.cnb.cool 与可选的 api.github.com。',
        },
        {
          name: 'private_cache_ttl / resolve_cache_ttl',
          location: 'config',
          type: 'int (21600s / 86400s)',
          required: true,
          description: '默认全量名单 6 小时 TTL；单名解析缓存 24 小时 TTL。',
        },
      ],
      responses: [
        {
          status: 'refresh -> 写入 private-repos.json (exit 0)',
          tone: 'ok',
          summary: '输出并集名单、patterns、expires_at 与可用 sources 列表。',
        },
        {
          status: 'resolve-private -> JSON (exit 0, status 判定)',
          tone: 'warn',
          summary: '每个查询名返回 private | public | absent | error；遇到 error 或 private 即拦截。',
          example: `{ "demo-priv-repo": { "status": "private", "owner": "CyberNova2333" } }`,
        },
      ],
      examples: [
        {
          label: '手动刷新缓存并查询单名可见性',
          lang: 'sh',
          code: `python3 "{{BASE_URL}}/hooks/refresh-private.py"\npython3 "{{BASE_URL}}/hooks/resolve-private.py" sample-repo-name`,
        },
      ],
    },
    {
      id: 'bootstrap-and-install',
      group: 'ops-sync',
      kind: 'CLI',
      title: '幂等铺设、Settings 合并与可选 token-helper',
      signature: 'HOOK_PACKAGE_URL=... bash policy/bootstrap.sh',
      auth: '本地文件系统 + 包 URL',
      stability: '幂等安装器',
      summary:
        '把模板路径 /root/.claude/... 一键改写到 $GUARD，自动备份并还原私有种子与缓存，设置全局 Git 钩子并幂等合并仓库/用户级 Claude settings.json；配套可选 XOR 混淆凭证包装器源码生成工具。',
      relatedLink: '/docs/',
      relatedLabel: '查看安装步骤明细',
      capabilities: [
        'bootstrap.sh 幂等升级：自动保留现有 private-seed.json、sanitize-map.json、private-repos.json 与 .resolve.json，缺失 ssh-keygen 时尝试 apt-get 安装',
        'install-settings.py 支持指定仓库级路径及 --exclude-untracked（写入 .git/info/exclude 避免污染 git status），按脚本名去重并关闭 attribution.sessionUrl',
        'build-secure-token.py + token-helper.cpp 通过 GUARD_PKG_URL 在编译期注入并在本地编译为 chmod 700 ELF 二进制，内存 XOR 还原环境变量',
      ],
      limitations: [
        '未修改 PKG_URL_DEFAULT 且未传 HOOK_PACKAGE_URL 时直接拒绝运行',
        'token-helper 的 32 字节 XOR 混淆仅防静态文本刮削与误读，不替代操作系统钥匙串（Keychain / Secret Service）或 HSM',
      ],
      params: [
        {
          name: 'HOOK_PACKAGE_URL / GUARD_DIR',
          location: 'env',
          type: 'URL / path',
          required: false,
          description: '支持 file:/// 与 https://；$GUARD 默认为 $HOME/.claude/guardrails。',
        },
        {
          name: 'GUARD_REPOS',
          location: 'env',
          type: 'colon-separated paths',
          required: false,
          description: '安装时同步合并仓库级 .claude/settings.json（供云端或按仓库覆盖使用）。',
        },
        {
          name: '--exclude-untracked',
          location: 'flag',
          type: 'install-settings.py option',
          required: false,
          description: '未跟踪的 .claude/settings.json 自动写入本地 .git/info/exclude。',
        },
      ],
      responses: [
        {
          status: 'Bootstrap Exit 0',
          tone: 'ok',
          summary: '完成路径改写、接线与 doctor.py 自检打印。',
        },
        {
          status: 'Bootstrap Exit 1',
          tone: 'err',
          summary: '缺少 python3/git/curl、包下载失败或包内缺少 policy/check.py 时立即中止。',
        },
      ],
      examples: [
        {
          label: '本机幂等铺设并向额外仓库注入 settings',
          lang: 'sh',
          code: `GUARD_REPOS="/path/to/repo1:/path/to/repo2" \\\n  HOOK_PACKAGE_URL=file:///path/to/guardrails-package.zip bash policy/bootstrap.sh\npython3 "{{BASE_URL}}/policy/install-settings.py" .claude/settings.json --exclude-untracked`,
        },
      ],
    },
    {
      id: 'doctor-and-scan-repo',
      group: 'ops-sync',
      kind: 'CLI',
      title: '只读自检 doctor.py、存量审计 scan-repo.py 与维护守卫区分',
      signature: 'python3 {{BASE_URL}}/policy/doctor.py | hooks/scan-repo.py <repo>',
      auth: '本地配置（scan-repo 依赖可用缓存）',
      stability: '运维 / 审计',
      summary:
        '提供无副作用的环境接线体检（doctor.py）、存量仓库当前树与全历史泄漏审计（scan-repo.py），同时与专用于维护本源码仓自身的 tools/repo_maintenance_guard.py 严格划分边界。',
      relatedLink: '/docs/code-map',
      relatedLabel: '查看代码地图与守卫区分',
      capabilities: [
        'doctor.py 动态推导 $GUARD：检查 policy.json 未回漏私有词、Claude 设置不含 permissionDecision=allow、全局与局部 core.hooksPath、--net 严格仅在 Git 层、缓存 TTL 与 R6 ssh-keygen 配置',
        'scan-repo.py 默认审计 HEAD 当前文本树与全历史提交消息，加 --scan-history 深入扫描历史所有提交树文本；采用前 8 KiB NUL 嗅探避免漏掉 .gitmodules/Dockerfile',
        'repo_maintenance_guard.py (Python 3.10+) 仅在开发者修改 claude-code-antileak-hooks 仓库自身时安装至仓库局部钩子',
      ],
      limitations: [
        '未铺设或缓存过期时，doctor.py 按 fail-closed 理念返回 Overall: DEGRADED (exit 1)；scan-repo.py 在缓存不可用时直接退出 2 拒绝假阳性放行',
        '切勿把产品包 Git 钩子与 tools/repo_maintenance_guard.py 混用，后者只做 Conventional Commits、大文件与明显私钥形态离线阻断',
      ],
      params: [
        {
          name: 'repo-path',
          location: 'arg',
          type: 'path (default ".")',
          required: false,
          description: 'scan-repo.py 要审计的目标本地 Git 仓库路径。',
        },
        {
          name: '--scan-current / --scan-history',
          location: 'flag',
          type: 'mode flag',
          required: false,
          description: '默认 current 审 HEAD 文件+历史提交消息；--scan-history 审历次提交全文本树（耗时较高）。',
        },
      ],
      responses: [
        {
          status: 'doctor Overall: PASS (exit 0)',
          tone: 'ok',
          summary: '所有 [FAIL] 检查项清零；可选 [WARN]（如缺少 forbid-tamper.sh）不影响退出码 0。',
        },
        {
          status: 'doctor DEGRADED (exit 1) / scan Exit 2',
          tone: 'err',
          summary: '任一必选检查失败（doctor exit 1），或 scan-repo 无法读取缓存（exit 2）。',
        },
      ],
      examples: [
        {
          label: '运行环境体检与目标仓库基线审计',
          lang: 'sh',
          code: `python3 "{{BASE_URL}}/policy/doctor.py"\npython3 "{{BASE_URL}}/hooks/scan-repo.py" /path/to/repo --scan-current`,
        },
      ],
    },
  ],
};

export const apiSpecEn: ApiCatalogSpec = {
  project: 'Claude Code Antileak Hooks · Hooks, Engine & CLI Reference',
  subtitle:
    'Deterministic specifications for all 6 PreToolUse wrappers, SessionStart sync, 4 --net Git hooks, the fail-closed R1–R7 engine (policy/check.py), and bootstrap/doctor/scan-repo tooling.',
  environments: [
    { label: 'Default Guard Install Dir ($GUARD)', value: '$HOME/.claude/guardrails' },
    { label: 'Template Placeholder Root', value: '/root/.claude' },
  ],
  searchPlaceholder: 'Search PreToolUse, check.py, R1–R7, bootstrap.sh, doctor.py…',
  emptyText: 'No matching hook wrapper, policy rule, or CLI utility found.',
  labels: {
    allGroups: 'All',
    canDo: '✅ Supported Capabilities',
    cannotDo: '⛔ Explicit Limits / Non-Goals',
    params: 'Inputs, Environment Variables & Policy Limits',
    paramName: 'Field / Flag / Hook',
    paramLocation: 'Scope',
    paramType: 'Type / Format',
    paramRequired: 'Required',
    paramDesc: 'Behavior & Boundaries',
    responses: 'Outcomes & Exit Semantics',
    examples: 'Standard Call Examples',
    responseSample: 'Sample Decision / Output',
    copy: 'Copy',
    copied: 'Copied',
    noParams: 'No additional parameters required.',
    required: 'Required',
    optional: 'Optional',
    deepDocs: 'Open Full Contracts & Setup Docs',
    totalItems: 'specs documented',
    envLabel: 'Path Preset',
    mobilePicker: 'Select hook or utility',
    defaultLabel: 'Default',
    plainIndexToggle: 'Plain-Text Index & Search Anchors (Ctrl+K searchable)',
  },
  groups: [
    { id: 'wrappers', title: 'Claude PreToolUse & SessionStart' },
    { id: 'engine-git', title: 'Policy Engine check.py & Git Hooks' },
    { id: 'ops-sync', title: 'Sync, Bootstrap, Doctor & Scan' },
  ],
  items: [
    {
      id: 'pretooluse-wrappers',
      group: 'wrappers',
      kind: 'HOOK',
      title: 'Claude PreToolUse (6) & SessionStart (1) Shell Wrappers',
      signature: 'settings.json · forbid-{content,commit,push,read-secret,tamper,read-path}.sh + refresh-private.py',
      auth: 'Strictly offline (never passes --net)',
      stability: 'Core Hook Entry',
      summary:
        'Six PreToolUse shell wrappers inspect writes, git commands, and sensitive reads offline before execution; passing calls exit 0 silently so interactive host permission prompts stay intact.',
      relatedLink: '/en/docs/contracts',
      relatedLabel: 'See Hook Payload Contracts',
      capabilities: [
        'forbid-content.sh (Write|Edit|NotebookEdit, 120s) and forbid-commit/push.sh (Bash(git *), 120s) enforce R1–R7 offline via check.py',
        'forbid-read-secret.sh (Bash, 30s) and forbid-read-path.sh (Read|Grep, 30s) canonicalize paths via realpath to defeat ../ and symlink traversal',
        'forbid-tamper.sh (Bash, 30s) blocks edits to core.hooksPath, disableAllHooks, and guard files; unparseable stdin fails closed with exit 2',
        'SessionStart runs refresh-private.py (120s) so cloud sessions hydrate dynamic lists once runtime environment variables become available',
      ],
      limitations: [
        'Wrappers never pass --net: a hook killed on network timeout turns into "no decision" in Claude Code; expired cache intentionally denies as error',
        'Glob tool calls (filenames only, no file contents) are intentionally out of scope',
        'Local shell checks cannot stop a privileged local user intentionally tampering outside Claude; mandatory remote rulesets and Git hooks remain the hard gate',
      ],
      params: [
        {
          name: 'tool_input.file_path / path / content',
          location: 'stdin',
          type: 'JSON (Claude Hook Payload)',
          required: true,
          description: 'Standard hook payload on stdin; parse errors emit deny JSON and exit 2.',
        },
        {
          name: 'forbid-commit.sh / forbid-push.sh',
          location: 'config',
          type: 'if: "Bash(git *)" · 120s timeout',
          required: true,
          description: 'Blocks --no-verify, --no-gpg-sign, agent branch pushes, and leaked commit payloads.',
        },
        {
          name: 'forbid-tamper.sh',
          location: 'config',
          type: 'matcher: "Bash" · 30s timeout',
          required: false,
          description: 'Optional WARN-level item in doctor.py; keep enabled in production setups.',
        },
      ],
      responses: [
        {
          status: 'Pass -> exit 0 (silent stdout)',
          tone: 'ok',
          summary: 'Never emits permissionDecision="allow", preserving native user confirmation.',
        },
        {
          status: 'Deny -> JSON + exit 2',
          tone: 'err',
          summary: 'Emits permissionDecision="deny" with credentials redacted via mask() to first 8 chars.',
          example: `{\n  "hookSpecificOutput": {\n    "hookEventName": "PreToolUse",\n    "permissionDecision": "deny",\n    "permissionDecisionReason": "[policy] Secret detected: ghp_1234…(凭据已脱敏,40字符)"\n  }\n}`,
        },
      ],
      examples: [
        {
          label: 'Test PreToolUse content wrapper locally',
          lang: 'sh',
          code: `printf '{"tool_input":{"file_path":"a.txt","content":"sk-example-secret-placeholder"}}\n' \\\n  | bash "{{BASE_URL}}/hooks/forbid-content.sh"`,
        },
      ],
    },
    {
      id: 'policy-check-engine',
      group: 'engine-git',
      kind: 'CLI',
      title: 'Shared R1–R7 Policy Engine (policy/check.py)',
      signature: 'python3 {{BASE_URL}}/policy/check.py content|commit|push [target] [--net]',
      auth: 'policy.json + private-repos.json (+ optional --net)',
      stability: 'Single Policy Core',
      summary:
        'Single Python policy engine shared across Claude wrappers and Git hooks, emitting strict 3-state verdicts (pass / violation / error) across R1–R7 rules.',
      relatedLink: '/en/docs/contracts',
      relatedLabel: 'Inspect R1–R7 Rule Table',
      capabilities: [
        'Enforces R1 private repo slugs, R2 model/session patterns (with 24+ char base64 noise suppression), R3 non-provider authorship, R4 private regexes, R5 agent branch ban, R6 non-generic SSH signatures, and R7 secret regexes',
        'R6 verifies gpgsig directly via ssh-keygen -Y check-novalidate without needing allowedSignersFile and rejects the generic agent key fingerprint',
        'Supports known_content (git patch-id --stable) resigning exemptions anchored against real git ls-remote tips (disable via resign_exempt=false)',
      ],
      limitations: [
        'Does NOT enforce main branch protection or force-push rules (left to GitHub rulesets / CNB branch protections by design)',
        'Missing or expired private cache fails closed with error (exit 1) when --net is absent',
        'Checked-in scripts contain /root/.claude/... template paths and must be rewritten by bootstrap.sh before invocation',
      ],
      params: [
        {
          name: 'mode',
          location: 'arg',
          type: 'content | commit | push',
          required: false,
          description: 'Defaults to content; push consumes ref tuples from stdin.',
        },
        {
          name: 'extra',
          location: 'arg',
          type: 'file | msgfile | remote-name',
          required: false,
          description: 'Optional input path (or remote name in push mode to scope --not --remotes=).',
        },
        {
          name: '--net',
          location: 'flag',
          type: 'boolean',
          required: false,
          description: 'Enables cache lazy refresh and single-slug resolve-private.py lookups (Git/audit only).',
        },
      ],
      responses: [
        {
          status: 'pass (exit 0)',
          tone: 'ok',
          summary: 'Clean content, commit, and push refs.',
        },
        {
          status: 'violation / error (exit 1)',
          tone: 'err',
          summary: 'Outputs redacted diagnostic details to stderr and blocks execution.',
        },
      ],
      examples: [
        {
          label: 'Run commit-msg and stdin content checks',
          lang: 'sh',
          code: `printf 'feat: normal change\n' | python3 "{{BASE_URL}}/policy/check.py" commit\nprintf 'sample change\n' | python3 "{{BASE_URL}}/policy/check.py" content`,
        },
      ],
    },
    {
      id: 'git-hooks-layer',
      group: 'engine-git',
      kind: 'HOOK',
      title: 'Global --net Git Hook Layer',
      signature: 'git config --global core.hooksPath {{BASE_URL}}/hooks/git',
      auth: 'Network-enabled (--net)',
      stability: 'Hard Local Gate',
      summary:
        'Four Git hooks (pre-commit, pre-merge-commit, commit-msg, pre-push) enforcing R1–R7 on staged diffs, commit metadata, SSH signatures, and push targets.',
      relatedLink: '/en/docs/',
      relatedLabel: 'See Deployment Modes',
      capabilities: [
        'Audits added diff lines on pre-commit/pre-merge-commit and authorship + Co-authored-by trailers on commit-msg',
        'pre-push blocks 15 default agent branch prefixes (claude/, codex/, etc.) and enforces direct SSH signature verification on unpushed commits',
      ],
      limitations: [
        'Repository-local core.hooksPath overrides global hooks (for example when using tools/repo_maintenance_guard.py on this repository clone)',
        'Cloud Git proxies restricted to claude/... branches are intentionally blocked by R5 until human push',
      ],
      params: [
        {
          name: 'core.hooksPath (global)',
          location: 'config',
          type: 'path ($GUARD/hooks/git)',
          required: true,
          description: 'Written globally by policy/bootstrap.sh.',
        },
      ],
      responses: [
        {
          status: 'Exit 0 / Exit 1',
          tone: 'ok',
          summary: 'Exits 0 cleanly on pass; blocks commit or push with violation/error message on exit 1.',
        },
      ],
      examples: [
        {
          label: 'Verify global Git hook and SSH signing config',
          lang: 'sh',
          code: `git config --global --get core.hooksPath\ngit config --global --get gpg.format`,
        },
      ],
    },
    {
      id: 'private-list-sync',
      group: 'ops-sync',
      kind: 'CLI',
      title: 'Multi-Source Private Repo Sync & Single-Slug Resolver',
      signature: 'python3 {{BASE_URL}}/hooks/refresh-private.py & resolve-private.py',
      auth: 'private-seed.json + CNB_TOKEN + optional GH_TOKEN_n / gh',
      stability: '6h TTL / 24h Negative Cache',
      summary:
        'Keeps distributable packages clean of private names by uniting local seeds, CNB OpenAPI (primary), and optional GitHub metadata into a 6h TTL local cache and 24h resolver cache.',
      relatedLink: '/en/docs/configuration',
      relatedLabel: 'See Config Matrix & Seeds',
      capabilities: [
        'Merges local private-seed.json (or cloud GUARD_SEED_B64 / GUARD_SEED_JSON), CNB groups, GH_TOKEN_1..N, and gh CLI',
        'resolve-private.py queries up to 30 candidate slugs (--net, 3s timeout) strictly against active sources',
      ],
      limitations: [
        'R4 business patterns can ONLY originate from private-seed.json / GUARD_SEED_B64',
        'Configured tokens that fail retries abort cache write-back (fail-closed)',
      ],
      params: [
        {
          name: 'GUARD_SEED_B64 / private-seed.json',
          location: 'env',
          type: 'JSON { owners, private, patterns }',
          required: false,
          description: 'Local chmod 600 seed file or base64 cloud env variable.',
        },
        {
          name: 'CNB_TOKEN / GH_TOKEN_1..N',
          location: 'env',
          type: 'Read-only PAT',
          required: false,
          description: 'Requires api.cnb.cool (and api.github.com if used) in cloud egress allowlists.',
        },
      ],
      responses: [
        {
          status: 'refresh exit 0 / resolve JSON',
          tone: 'ok',
          summary: 'Populates private-repos.json and returns per-slug private/public/absent/error status.',
        },
      ],
      examples: [
        {
          label: 'Refresh dynamic cache and resolve a candidate slug',
          lang: 'sh',
          code: `python3 "{{BASE_URL}}/hooks/refresh-private.py"\npython3 "{{BASE_URL}}/hooks/resolve-private.py" sample-repo-name`,
        },
      ],
    },
    {
      id: 'bootstrap-and-install',
      group: 'ops-sync',
      kind: 'CLI',
      title: 'Idempotent Bootstrap, Settings Merger & token-helper',
      signature: 'HOOK_PACKAGE_URL=... bash policy/bootstrap.sh',
      auth: 'Local filesystem + package archive',
      stability: 'Idempotent Installer',
      summary:
        'Unpacks guardrails to $GUARD, preserves seeds/caches across upgrades, rewrites template paths with sed, configures global Git hooks, and merges Claude settings cleanly.',
      relatedLink: '/en/docs/',
      relatedLabel: 'See Deployment Modes',
      capabilities: [
        'Upgrades $GUARD idempotently while restoring existing seeds, sanitize maps, and caches',
        'install-settings.py deduplicates hooks by script basename and supports --exclude-untracked (.git/info/exclude)',
        'build-secure-token.py + token-helper.cpp compiles XOR-obfuscated local credential injector (chmod 700)',
      ],
      limitations: [
        'Fails immediately if PKG_URL_DEFAULT placeholder is unchanged and HOOK_PACKAGE_URL is unset',
        '32-byte XOR stream in token-helper prevents plaintext static scraping, not OS keyring/HSM threats',
      ],
      params: [
        {
          name: 'HOOK_PACKAGE_URL / GUARD_REPOS',
          location: 'env',
          type: 'URL / colon paths',
          required: false,
          description: 'Archive source and extra repo paths for repo-level .claude/settings.json.',
        },
      ],
      responses: [
        {
          status: 'Exit 0 / Exit 1',
          tone: 'ok',
          summary: 'Exits 0 after wiring hooks and running doctor.py; exits 1 on missing binaries or invalid archives.',
        },
      ],
      examples: [
        {
          label: 'Install package locally and wire repo settings',
          lang: 'sh',
          code: `HOOK_PACKAGE_URL=file:///path/to/guardrails-package.zip bash policy/bootstrap.sh\npython3 "{{BASE_URL}}/policy/install-settings.py" .claude/settings.json --exclude-untracked`,
        },
      ],
    },
    {
      id: 'doctor-and-scan-repo',
      group: 'ops-sync',
      kind: 'CLI',
      title: 'Read-Only Diagnostics (doctor.py), Repo Audit & Repo Maintenance Guard',
      signature: 'python3 {{BASE_URL}}/policy/doctor.py | hooks/scan-repo.py <repo>',
      auth: 'Local read-only inspection',
      stability: 'Audit & Diagnostics',
      summary:
        'Verifies hook wiring and cache health via doctor.py, scans existing repositories via scan-repo.py, and separates end-user guardrails from tools/repo_maintenance_guard.py.',
      relatedLink: '/en/docs/code-map',
      relatedLabel: 'See Code Map & Guard Split',
      capabilities: [
        'doctor.py verifies policy.json non-leakage, absence of allow JSON, global/local hooksPath, --net separation, 6h TTL, and SSH signing prerequisites',
        'scan-repo.py inspects HEAD text files + commit messages (or full history with --scan-history) using NUL-byte sniffing for binary exclusion',
        'tools/repo_maintenance_guard.py enforces Conventional Commits and offline secret patterns solely for contributors modifying this repo clone',
      ],
      limitations: [
        'doctor.py exits 1 (Overall: DEGRADED) on expired caches or uninstalled clones; scan-repo.py exits 2 if private-repos.json is unreadable',
        'Never treat product hooks and tools/repo_maintenance_guard.py as interchangeable',
      ],
      params: [
        {
          name: 'repo-path / --scan-history',
          location: 'flag',
          type: 'scan-repo.py options',
          required: false,
          description: 'Default scans HEAD + all commit messages; --scan-history walks every historical tree.',
        },
      ],
      responses: [
        {
          status: 'doctor Overall: PASS (exit 0) / DEGRADED (exit 1)',
          tone: 'ok',
          summary: 'Reports per-check [PASS]/[FAIL]/[WARN] status and cache TTL expiry time.',
        },
      ],
      examples: [
        {
          label: 'Run environment diagnostics and baseline repo scan',
          lang: 'sh',
          code: `python3 "{{BASE_URL}}/policy/doctor.py"\npython3 "{{BASE_URL}}/hooks/scan-repo.py" . --scan-current`,
        },
      ],
    },
  ],
};
