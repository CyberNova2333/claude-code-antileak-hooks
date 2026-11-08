---
title: Configuration Guide
description: Hook rule configuration, custom regex patterns, and whitelist specifications.
---

::: warning AI Translation Notice
This document was translated by an AI language model. In case of any discrepancies or ambiguities, please refer to the [original Chinese documentation](/docs/configuration) as the authoritative reference.
:::

# Configuration Guide

### Primary Configuration

```json
{
  "rules": {
    "block_private_keys": true,
    "block_aws_tokens": true,
    "block_github_tokens": true,
    "entropy_threshold": 4.5
  },
  "whitelist_patterns": [
    "tests/fixtures/dummy_key.pem",
    "*.sample.env"
  ]
}
```

---

## Production Recommendations

1. **Environment Variable Protection**: Never commit real API keys or sensitive credentials into Git repositories.
2. **Graceful Shutdown & Timeouts**: Set appropriate timeout constraints on long-running processes to prevent orphan executions.
3. **Continuous Monitoring**: Combine console logs and health telemetry to monitor service uptime and operational status.
