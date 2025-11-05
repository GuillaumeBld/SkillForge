import cors from 'cors';
import express, { type Request, type Response } from 'express';
import morgan from 'morgan';
import type { paths } from '@skillforge/shared';

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

type HealthResponse = paths['/api/v1/health']['get']['responses']['200']['content']['application/json'];

app.get('/api/v1/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

export default app;
