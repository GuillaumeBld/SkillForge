import cors from 'cors';
import express, { type Request, type Response } from 'express';
import morgan from 'morgan';

import requestContext from './middleware/request-context';
import apiRateLimiter from './middleware/rate-limit';
import errorHandler from './middleware/error-handler';
import router from './routes';
import { shutdownTelemetry, startTelemetry } from './observability/tracing';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestContext);
app.use(apiRateLimiter);
app.use(morgan('combined'));

type HealthResponse = {
  status: string;
  timestamp: string;
};

app.get('/api/v1/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1', router);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      requestId: req.requestId
    }
  });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await startTelemetry();
  } catch (error) {
    console.error('Failed to start telemetry', error);
  }

  if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
      console.log(`API listening on port ${port}`);
    });
  }
};

void startServer();

process.on('SIGTERM', async () => {
  await shutdownTelemetry();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdownTelemetry();
  process.exit(0);
});

export default app;
