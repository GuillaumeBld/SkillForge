import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'skillforge-api';
const serviceVersion = process.env.npm_package_version ?? '0.0.0';

if (process.env.NODE_ENV !== 'test') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
  })
});

let telemetryStarted = false;

const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion
});

export const otelSdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()]
});

export const startTelemetry = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  if (telemetryStarted) {
    return;
  }

  await otelSdk.start();
  telemetryStarted = true;
};

export const shutdownTelemetry = async (): Promise<void> => {
  if (!telemetryStarted) {
    return;
  }

  await otelSdk.shutdown();
  telemetryStarted = false;
};

export default otelSdk;
