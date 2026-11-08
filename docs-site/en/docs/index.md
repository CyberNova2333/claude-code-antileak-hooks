---
title: Quick Start
description: Prevent API keys, private certificates, and sensitive credentials from leaking into Git history or AI prompts.
---

::: warning AI Translation Notice
This document was translated by an AI language model. In case of any discrepancies or ambiguities, please refer to the [original Chinese documentation](/docs/) as the authoritative reference.
:::

# Quick Start

Prevent API keys, private certificates, and sensitive credentials from leaking into Git history or AI prompts.

## Core Problems Solved

- **Pain Point 1**: Accidental commit of `.env`, RSA/ED25519 private keys, or cloud access tokens.
- **Pain Point 2**: AI assistants reading local files containing live credentials and echoing them into public contexts.
- **Pain Point 3**: Sluggish Git hooks causing developer friction and bypassing.

---

## Prerequisites

Bash / PowerShell, Python 3.8+, Git 2.30+, pnpm 12.6.0.

---

## Quick Installation & Launch

```bash
# 1. Install project dependencies
pnpm install

# 2. Run local tests and verification
pnpm test
```

---

## Next Steps

- Explore internal mechanics: [Architecture & Design](/en/docs/architecture)
- Comprehensive configuration reference: [Configuration Guide](/en/docs/configuration)
- Troubleshooting & FAQ: [FAQ & Diagnostics](/en/docs/faq)
