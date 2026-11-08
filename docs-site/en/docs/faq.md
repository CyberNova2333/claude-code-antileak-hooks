---
title: FAQ & Troubleshooting
description: Frequently asked questions and emergency override instructions for Antileak Hooks.
---

::: warning AI Translation Notice
This document was translated by an AI language model. In case of any discrepancies or ambiguities, please refer to the [original Chinese documentation](/docs/faq) as the authoritative reference.
:::

# FAQ & Troubleshooting

Common questions and answers regarding daily usage and integration:

### Q: How can I bypass a hook in an emergency?

**A**: You can set the environment variable `SKIP_REDLIGHT_HOOK=1` or write `[skip-hooks]` in your commit message as defined in repository guidelines.

### Q: Can I define custom organization regex rules?

**A**: Yes. Add custom pattern entries to `rules.custom_regex` in `antileak-config.json`.


---

## General Troubleshooting Steps

1. **Verify Runtime Versions**: Ensure Node.js, Python, Rust, or browser versions meet minimum compatibility requirements.
2. **Check Diagnostic Logs**: Review console output and error logs for informative stack traces and line numbers.
3. **Submit Issue Feedback**: If you discover an underlying bug, please open an issue on the GitHub repository with a reproducible test case.
