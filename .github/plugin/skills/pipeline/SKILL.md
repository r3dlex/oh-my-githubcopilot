---
name: pipeline
description: Sequential pipeline mode with strict phase ordering
trigger: "pipeline:, /pipeline"
autoinvoke: false
---

# Pipeline

Sequential pipeline mode. Strict phase ordering enforced: plan → build → test → deploy.
