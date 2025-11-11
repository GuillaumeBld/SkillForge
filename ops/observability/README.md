# Observability Instrumentation Overview

This directory contains declarative assets that provision the Grafana dashboards and Prometheus alerting rules described in [`docs/OPERATIONS.md`](../../docs/OPERATIONS.md). The configuration is environment-aware so that staging telemetry continuously feeds production baselines without polluting production alerting.

## Data Sources
- **Prometheus (`prometheus`)** – Primary metrics store scraped from `skillforge-*` clusters with `environment` label (`dev`, `staging`, `prod`).
- **Loki (`loki`)** – Log aggregation for drill-down panels.
- **Tempo (`tempo`)** – Trace data powering request waterfall visualisations.
- **Snowflake (`snowflake_analytics`)** – KPI extracts hydrated nightly for blended operational/analytics dashboards.

## Baseline Alignment
To keep production SLO baselines representative while still learning from staging regressions:
1. Recording rules in `prometheus-baselines.yaml` roll up shared metrics from staging (`environment="staging"`) into auxiliary series with suffix `_staging_baseline`.
2. Grafana dashboards surface both production and staging baselines, allowing operators to compare regression signatures before a release.
3. Alert rules only fire on production series but include staging trend annotations in notification templates so responders immediately see if an issue appeared during staging validation.

## Deployment
1. Apply recording and alerting rules using `kubectl apply -f prometheus-baselines.yaml -n observability` and `kubectl apply -f prometheus-alerts.yaml -n observability`.
2. Sync Grafana dashboards through the provisioning sidecar (copy `grafana-dashboards.yaml` into `/etc/grafana/provisioning/dashboards/` and trigger a reload or restart the Grafana pod).
3. Verify that Grafana lists the **API Performance**, **Frontend Experience**, **Data Pipelines**, **Database Health**, and **Infrastructure Capacity** dashboards with the latest git commit hash displayed in the dashboard description.
4. Trigger synthetic traffic in staging to confirm staging baseline panels populate while production alerts remain quiet.

## Alert Destinations
- **PagerDuty** – P1 and P2 incidents (API error rate, latency, queue depth, data freshness) route to the on-call rotation.
- **Slack `#skillforge-observability`** – P3 informational alerts (dashboard sync drift, staging regression detected) tagged for async review.
- **Email Digest** – Daily summary of staging baseline comparisons delivered to product analytics for proactive investigation.

Update the runbook any time alert thresholds or destinations change to keep the operational contract accurate.
