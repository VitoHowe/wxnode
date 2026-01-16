import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const windowMs = parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const max = parseNumber(process.env.RATE_LIMIT_MAX, 300);
const authMax = parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 30);
const buildHandler = (message: string) => {
  return (_req: Request, res: Response) => {
    res.status(429).json({
      code: 429,
      message,
      data: null,
      timestamp: new Date().toISOString(),
    });
  };
};
export const apiRateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildHandler('Too many requests. Please try again later.'),
});

export const authRateLimiter = rateLimit({
  windowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildHandler('Too many auth requests. Please try again later.'),
});
