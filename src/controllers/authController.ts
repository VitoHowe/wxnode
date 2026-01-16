import { Request, Response } from 'express';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';
import { asyncHandler, AuthenticationError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { ResponseUtil } from '@/utils/response';

class AuthController {
  /**
   * 统一登录接口（支持微信和普通用户）
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { code, username, password, encryptedData, iv, signature } = req.body;

    // 根据参数判断登录类型
    const isWechatLogin = !!code;
    const isNormalLogin = !!(username && password);

    if (!isWechatLogin && !isNormalLogin) {
      return ResponseUtil.validationError(res, '请提供微信登录参数(code)或普通登录参数(username, password)');
    }

    if (isWechatLogin && isNormalLogin) {
      return ResponseUtil.validationError(res, '不能同时使用两种登录方式');
    }

    logger.info(`🚪 登录请求: ${isWechatLogin ? '微信登录' : '普通登录'}`, {
      loginType: isWechatLogin ? 'wechat' : 'normal',
      hasCode: !!code,
      username: username || 'N/A',
      userAgent: req.headers['user-agent']?.includes('wechatdevtools') ? '开发者工具' : '真机'
    });

    try {
      let result;
      
      if (isWechatLogin) {
        // 微信登录
        result = await authService.wechatLogin({
          code,
          encryptedData,
          iv,
          signature,
        });
      } else {
        // 普通用户登录
        result = await authService.normalLogin({
          username,
          password,
        });
      }

      logger.info(`✅ 登录成功: ${isWechatLogin ? '微信用户' : '普通用户'}`, {
        userId: result.user?.id,
        userType: isWechatLogin ? 'wechat' : 'normal'
      });

      return ResponseUtil.success(res, result, '登录成功');
      
    } catch (error: any) {
      logger.error('登录失败:', error);
      
      // 微信登录特殊错误处理
      if (isWechatLogin) {
        if (error.message?.includes('code been used')) {
          return ResponseUtil.error(res, '登录凭证已失效，请重新授权登录', 400, 'code_used');
        }
        
        if (error.message?.includes('invalid code')) {
          return ResponseUtil.error(res, '无效的登录凭证，请重新获取', 400, 'invalid_code');
        }
        
        if (error.message?.includes('invalid appid')) {
          return ResponseUtil.error(res, '服务配置错误，请联系管理员', 500, 'config_error');
        }
      }

      // 普通登录和其他错误处理
      if (error instanceof AuthenticationError) {
        return ResponseUtil.authError(res, error.message);
      }
      
      // 其他错误
      return ResponseUtil.serverError(res, '登录服务暂时不可用，请稍后重试');
    }
  });

  /**
   * 用户注册
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { username, password, nickname, phone } = req.body;

    logger.info('👤 用户注册请求:', { username, hasPassword: !!password });

    try {
      // 创建新用户
      await userService.createNormalUser({
        username,
        password,
        nickname,
        phone,
      });

      // 自动登录
      const result = await authService.normalLogin({
        username,
        password,
      });

      logger.info('🎉 注册成功并自动登录:', { userId: result.user?.id, username });

      return ResponseUtil.success(res, result, '注册成功', 201);
      
    } catch (error: any) {
      logger.error('用户注册失败:', error);
      
      if (error.message?.includes('用户名已存在')) {
        return ResponseUtil.conflictError(res, '用户名已存在，请选择其他用户名');
      }

      if (error.message?.includes('密码')) {
        return ResponseUtil.validationError(res, error.message);
      }

      return ResponseUtil.serverError(res, '注册失败，请稍后重试');
    }
  });

  /**
   * 刷新访问令牌
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '无效的刷新令牌');
    }

    const result = await authService.refreshToken(
      req.user.userId,
      req.refreshToken,
      req.user.openid || req.user.username || undefined
    );

    return ResponseUtil.success(res, result, '令牌刷新成功');
  });

  /**
   * 获取用户信息
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const user = await userService.getUserById(req.user.userId);

    if (!user) {
      return ResponseUtil.notFoundError(res, '用户不存在');
    }

    return ResponseUtil.success(res, user, '获取成功');
  });

  /**
   * 更新用户信息
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const { nickname, avatar_url, phone } = req.body;

    const updatedUser = await userService.updateUser(req.user.userId, {
      nickname,
      avatar_url,
      phone,
    });

    return ResponseUtil.success(res, updatedUser, '更新成功');
  });

  /**
   * 用户登出
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    await authService.logout(req.user.userId);

    return ResponseUtil.success(res, null, '登出成功');
  });
}

export const authController = new AuthController();
