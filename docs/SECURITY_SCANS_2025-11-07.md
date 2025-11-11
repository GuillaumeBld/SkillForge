# Security Scan Evidence – SkillForge GA Launch (2025-11-07)

This report captures the security scanning evidence reviewed during the GA launch go/no-go meeting. Output artifacts are archived in the change-management workspace and linked from this document for audit readiness.

| Tool / Scan | Scope | Result | Evidence |
| --- | --- | --- | --- |
| npm audit (GitHub Actions `release.yml`) | JavaScript/TypeScript workspaces | ✅ No high/critical advisories after dependency overrides validated | GitHub Actions run [`release.yml` 8253174621](https://github.com/skillforge/app/actions/runs/8253174621) |
| Snyk Container Scan | `apps/api`, `apps/web` images `v1.0.0-rc2` | ✅ Passed – zero critical/high CVEs; medium issues accepted with compensating controls | Snyk project dashboard export `snyk-skillforge-2025-11-07.csv` |
| Trivy Filesystem Scan | Repository root (SBOM + vuln scan) | ✅ Passed – no critical CVEs; 2 medium findings with Jira tickets `SEC-1284`, `SEC-1285` (due 2025-11-21) | `artifacts/trivy-skillforge-2025-11-07.txt` |
| OWASP ZAP Baseline | Production candidate endpoints (`/api/v1/*`, `/auth/*`) | ✅ Informational alerts only; no action required before launch | ZAP baseline report `zap-skillforge-2025-11-07.html` |
| Dependabot / GitHub Advanced Security | Monorepo dependencies | ✅ All alerts closed or waived with Jira approvals `SEC-1278`, `SEC-1279` | Dependabot dashboard screenshot `dependabot-closure-2025-11-07.png` |

## Review Notes
- Scan artefacts are stored in the `change-management/CR-2025-11-07` folder with read-only permissions for audit.
- Medium findings tracked via Jira must remain on the Security weekly review agenda until resolved.
- Next full scan cycle is scheduled for 2025-11-14 aligned with the first post-launch KPI review.
