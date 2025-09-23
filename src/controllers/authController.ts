import { Request, Response } from 'express';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';
import { asyncHandler, AuthenticationError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

class AuthController {
  /**
   * 微信小程序登录
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { code, encryptedData, iv, signature } = req.body;

    logger.info('微信小程序登录请求', { 
      code: code?.substring(0, 10) + '...',
      hasUserInfo: !!(encryptedData && iv && signature),
      userAgent: req.headers['user-agent']?.includes('wechatdevtools') ? '开发者工具' : '真机'
    });

    try {
      const result = await authService.wechatLogin({
        code,
        encryptedData,
        iv,
        signature,
      });

      res.status(200).json({
        code: 200,
        message: '登录成功',
        data: result,
      });
    } catch (error: any) {
      logger.error('微信登录失败:', error);
      
      // 特别处理微信API的常见错误
      if (error.message?.includes('code been used')) {
        res.status(400).json({
          code: 40163,
          message: '登录凭证已失效，请重新授权登录',
          data: null,
          error_type: 'code_used',
          hint: '这通常发生在重复请求登录接口时，请前端重新调用wx.login()获取新的code'
        });
        return;
      }
      
      if (error.message?.includes('invalid code')) {
        res.status(400).json({
          code: 40029,
          message: '无效的登录凭证，请重新获取',
          data: null,
          error_type: 'invalid_code'
        });
        return;
      }
      
      if (error.message?.includes('invalid appid')) {
        res.status(500).json({
          code: 40013,
          message: '服务配置错误，请联系管理员',
          data: null,
          error_type: 'config_error'
        });
        return;
      }
      
      // 其他错误
      res.status(500).json({
        code: 500,
        message: '登录服务暂时不可用，请稍后重试',
        data: null,
        error_type: 'server_error'
      });
    }
  });

  /**
   * 刷新访问令牌
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('无效的刷新令牌');
    }

    const result = await authService.refreshToken(req.user.userId, req.user.openid);

    res.status(200).json({
      code: 200,
      message: '令牌刷新成功',
      data: result,
    });
  });

  /**
   * 获取用户信息
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('用户未登录');
    }

    const user = await userService.getUserById(req.user.userId);

    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: user,
    });
  });

  /**
   * 更新用户信息
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('用户未登录');
    }

    const { nickname, avatar_url, phone } = req.body;

    const updatedUser = await userService.updateUser(req.user.userId, {
      nickname,
      avatar_url,
      phone,
    });

    res.status(200).json({
      code: 200,
      message: '更新成功',
      data: updatedUser,
    });
  });

  /**
   * 用户登出
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('用户未登录');
    }

    await authService.logout(req.user.userId);

    res.status(200).json({
      code: 200,
      message: '登出成功',
      data: null,
    });
  });
}

export const authController = new AuthController();
