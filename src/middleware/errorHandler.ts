import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

// 自定义错误类
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 常见错误类型
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class WechatAPIError extends AppError {
  constructor(message: string) {
    super(message, 502, 'WECHAT_API_ERROR');
  }
}

// 错误处理中间件
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = '服务器内部错误';
  let code = 'INTERNAL_SERVER_ERROR';

  // 处理自定义错误
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';
  }
  // 处理数据库错误
  else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = '数据验证失败';
    code = 'DATABASE_VALIDATION_ERROR';
  }
  // 处理JWT错误
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '令牌无效';
    code = 'INVALID_TOKEN';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '令牌已过期';
    code = 'TOKEN_EXPIRED';
  }
  // 处理语法错误
  else if (error instanceof SyntaxError) {
    statusCode = 400;
    message = '请求格式错误';
    code = 'SYNTAX_ERROR';
  }

  // 记录错误日志
  if (statusCode >= 500) {
    logger.error('服务器错误:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      user: req.user,
    });
  } else {
    logger.warn('客户端错误:', {
      error: error.message,
      url: req.url,
      method: req.method,
      statusCode,
    });
  }

  // 返回错误响应
  res.status(statusCode).json({
    code: statusCode,
    message,
    error_code: code,
    data: null,
    timestamp: new Date().toISOString(),
    path: req.path,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
};

// 404处理中间件
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn(`404 - 路由不存在: ${req.method} ${req.path}`);
  
  res.status(404).json({
    code: 404,
    message: '请求的资源不存在',
    error_code: 'NOT_FOUND',
    data: null,
    timestamp: new Date().toISOString(),
    path: req.path,
  });
};

// 异步错误捕获装饰器
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 全局未捕获异常处理
process.on('uncaughtException', (error: Error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('未处理的Promise拒绝:', { reason, promise });
  process.exit(1);
});
