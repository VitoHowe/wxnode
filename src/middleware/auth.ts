import { Request, Response, NextFunction } from 'express';
import { JWTUtil, TokenPayload } from '@/utils/jwt';
import { logger } from '@/utils/logger';

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// 认证结果接口
interface AuthResult {
  success: boolean;
  user?: TokenPayload;
  error?: string;
}

/**
 * JWT认证中间件
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authResult = extractAndVerifyToken(req);
  
  if (!authResult.success) {
    res.status(401).json({
      code: 401,
      message: authResult.error || '认证失败',
      data: null,
    });
    return;
  }

  // 将用户信息附加到请求对象
  req.user = authResult.user;
  next();
};

/**
 * 可选认证中间件（不强制要求登录）
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authResult = extractAndVerifyToken(req);
  
  if (authResult.success) {
    req.user = authResult.user;
  }
  
  // 无论认证是否成功都继续执行
  next();
};

/**
 * 权限检查中间件
 */
export const requirePermissions = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        code: 401,
        message: '需要登录',
        data: null,
      });
      return;
    }

    try {
      // 这里可以从数据库查询用户权限
      // 暂时简化处理，后续可以扩展
      const userPermissions = await getUserPermissions(req.user.userId);
      
      const hasPermission = permissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        res.status(403).json({
          code: 403,
          message: '权限不足',
          data: null,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('权限检查失败:', error);
      res.status(500).json({
        code: 500,
        message: '权限检查失败',
        data: null,
      });
    }
  };
};

/**
 * 管理员权限中间件
 */
export const requireAdmin = requirePermissions(['admin']);

/**
 * 超级管理员权限中间件
 */
export const requireSuperAdmin = requirePermissions(['super_admin']);

/**
 * 刷新令牌中间件
 */
export const authenticateRefreshToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    res.status(401).json({
      code: 401,
      message: '缺少刷新令牌',
      data: null,
    });
    return;
  }

  const decoded = JWTUtil.verifyRefreshToken(token);
  
  if (!decoded) {
    res.status(401).json({
      code: 401,
      message: '刷新令牌无效或已过期',
      data: null,
    });
    return;
  }

  req.user = decoded;
  next();
};

/**
 * 从请求中提取并验证token
 */
function extractAndVerifyToken(req: Request): AuthResult {
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    return {
      success: false,
      error: '缺少访问令牌',
    };
  }

  const decoded = JWTUtil.verifyAccessToken(token);
  
  if (!decoded) {
    return {
      success: false,
      error: '访问令牌无效或已过期',
    };
  }

  return {
    success: true,
    user: decoded,
  };
}

/**
 * 从请求中提取token
 */
function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // 支持 "Bearer token" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 支持直接传递token
  return authHeader;
}

/**
 * 获取用户权限
 */
async function getUserPermissions(userId: number): Promise<string[]> {
  // 暂时返回默认权限，可根据需要扩展权限系统
  return ['read'];
}

/**
 * Token刷新检查中间件
 */
export const checkTokenExpiration = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractTokenFromRequest(req);
  
  if (token && JWTUtil.isTokenExpiringSoon(token)) {
    // 在响应头中添加提示，前端可以根据此头部主动刷新token
    res.setHeader('X-Token-Refresh-Required', 'true');
  }
  
  next();
};
