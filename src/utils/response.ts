import { Response } from 'express';
import { logger } from '@/utils/logger';

// 统一响应格式接口
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
}

// 响应工具类
export class ResponseUtil {
  /**
   * 成功响应
   */
  static success<T>(res: Response, data: T, message: string = '操作成功', statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      code: statusCode,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // 详细日志记录
    logger.info(`✅ API成功响应 [${statusCode}]: ${message}`, {
      endpoint: res.req?.path,
      method: res.req?.method,
      statusCode,
      hasData: data !== null && data !== undefined,
      dataType: typeof data,
      dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
      responseSize: JSON.stringify(response).length
    });

    // 对重要数据进行特殊记录
    if (data && typeof data === 'object') {
      // 如果是登录响应，记录token信息
      if ('accessToken' in data) {
        logger.info(`🔑 Token响应详情:`, {
          hasAccessToken: !!(data as any).accessToken,
          hasRefreshToken: !!(data as any).refreshToken,
          hasUser: !!(data as any).user,
          accessTokenLength: (data as any).accessToken?.length || 0,
          userFields: (data as any).user ? Object.keys((data as any).user) : []
        });
      }
      
      // 如果是用户数据，记录用户信息
      if ('id' in data && ('username' in data || 'openid' in data)) {
        logger.info(`👤 用户数据响应:`, {
          userId: (data as any).id,
          hasUsername: !!(data as any).username,
          hasOpenid: !!(data as any).openid,
          userFields: Object.keys(data)
        });
      }
    }

    return res.status(statusCode).json(response);
  }

  /**
   * 错误响应
   */
  static error(res: Response, message: string, statusCode: number = 500, errorType?: string): Response {
    const response: ApiResponse<null> = {
      code: statusCode,
      message,
      data: null,
      timestamp: new Date().toISOString()
    };

    logger.error(`❌ API错误响应 [${statusCode}]: ${message}`, {
      endpoint: res.req?.path,
      method: res.req?.method,
      statusCode,
      errorType,
      userAgent: res.req?.headers['user-agent']
    });

    return res.status(statusCode).json(response);
  }

  /**
   * 验证错误响应
   */
  static validationError(res: Response, message: string): Response {
    return this.error(res, message, 400, 'validation_error');
  }

  /**
   * 认证错误响应
   */
  static authError(res: Response, message: string = '认证失败'): Response {
    return this.error(res, message, 401, 'authentication_error');
  }

  /**
   * 权限错误响应
   */
  static permissionError(res: Response, message: string = '权限不足'): Response {
    return this.error(res, message, 403, 'permission_error');
  }

  /**
   * 资源未找到错误响应
   */
  static notFoundError(res: Response, message: string = '资源不存在'): Response {
    return this.error(res, message, 404, 'not_found_error');
  }

  /**
   * 冲突错误响应（如重复数据）
   */
  static conflictError(res: Response, message: string): Response {
    return this.error(res, message, 409, 'conflict_error');
  }

  /**
   * 服务器内部错误响应
   */
  static serverError(res: Response, message: string = '服务器内部错误'): Response {
    return this.error(res, message, 500, 'server_error');
  }
} 