import { Request, Response } from 'express';
import { logger } from '@/utils/logger';

/**
 * 404错误处理中间件
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn(`404 - 路由不存在: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
  });
  
  res.status(404).json({
    code: 404,
    message: '请求的资源不存在',
    error_code: 'NOT_FOUND',
    data: null,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  });
};
