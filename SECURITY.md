# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Please do NOT file a public GitHub issue** for security vulnerabilities. Instead, please follow one of these channels:

1. **GitHub Security Advisories** (preferred)
   - Navigate to the [Security Advisories](https://github.com/r3dlex/oh-my-copilot/security/advisories) page
   - Click "Report a vulnerability" to submit a confidential report

2. **Email** (if GitHub advisories are unavailable)
   - Send details to `omp@oh-my-copilot.dev` with subject line: `[SECURITY]`

## What to Include

Please include as much of the following as possible:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes (optional)

## Response Timeline

- **Initial response**: Within 48 hours (acknowledgment that the report was received)
- **Assessment**: Within 7 days (severity classification and next steps)
- **Fix timeline**: Varies by severity — critical issues are addressed as quickly as possible

## Scope

OMP requests the following permissions (declared in `plugin.json`):

- **filesystem** — Read/write project files, config, state
- **network** — WebFetch for external docs, marketplace check
- **exec** — Spawn agent subprocesses, run build/test commands

Please ensure any changes respect these declared permissions and do not introduce new security risks beyond the stated scope.
