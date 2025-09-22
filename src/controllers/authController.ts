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

    logger.info('微信小程序登录请求', { code: code?.substring(0, 10) + '...' });

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
