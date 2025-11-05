import rateLimit from 'express-rate-limit';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60 * 60 * 1000); // 1 hour default
const standardMax = Number(process.env.RATE_LIMIT_MAX ?? 1000);

export const apiRateLimiter = rateLimit({
  windowMs,
  max: standardMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please retry later.',
        requestId: req.requestId
      }
    });
  }
});

export default apiRateLimiter;
