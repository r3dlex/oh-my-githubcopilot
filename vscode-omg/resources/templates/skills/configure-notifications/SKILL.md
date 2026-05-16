---
name: configure-notifications
description: >
  Guide configuration of notification integrations and status alerts.
  Activate when: configure notifications, notifications setup, alert me, Telegram, Discord, Slack.
argument-hint: "<notification channel and desired alerts>"
---

# Configure Notifications

> **OMG adapted scope:** This skill provides configuration guidance only. It does not implement a background notification daemon in this port.

## Workflow
1. Identify the desired channel and event types.
2. Check whether the repository already has notification hooks or CI integration points.
3. Recommend a minimal configuration path with placeholders for secrets.
4. If credentials are required, ask the user to enter secrets directly in the appropriate tool or local environment; do not collect secrets in chat.
5. Document how to test the notification path.

## Rules
- Never request or echo tokens, webhooks, or API keys.
- Prefer environment variables or secret stores over committed config.
- Clearly label unimplemented daemon behavior as out of scope.
