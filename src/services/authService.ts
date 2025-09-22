import { WechatUtil } from '@/utils/wechat';
import { JWTUtil } from '@/utils/jwt';
import { userService } from '@/services/userService';
import { RedisCache } from '@/config/redis';
import { logger } from '@/utils/logger';
import { AuthenticationError, WechatAPIError } from '@/middleware/errorHandler';

// 微信登录参数接口
interface WechatLoginParams {
  code: string;
  encryptedData?: string;
  iv?: string;
  signature?: string;
}

// 登录结果接口
interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: any;
}

class AuthService {
  /**
   * 微信小程序登录
   */
  async wechatLogin(params: WechatLoginParams): Promise<LoginResult> {
    const { code, encryptedData, iv, signature } = params;

    try {
      // 1. 调用微信API获取openid和session_key
      const wechatData = await WechatUtil.code2Session(code);
      const { openid, session_key, unionid } = wechatData;

      // 2. 验证用户信息签名（如果提供了加密数据）
      let userInfo = null;
      if (encryptedData && iv && signature) {
        // 验证签名
        const isValidSignature = WechatUtil.verifySignature(session_key, encryptedData, iv, signature);
        if (!isValidSignature) {
          throw new AuthenticationError('用户信息签名验证失败');
        }

        // 解密用户信息
        userInfo = WechatUtil.decryptUserInfo(session_key, encryptedData, iv);
        if (!userInfo) {
          throw new AuthenticationError('用户信息解密失败');
        }
      }

      // 3. 查找或创建用户
      let user = await userService.getUserByOpenid(openid);
      if (!user) {
        // 创建新用户
        user = await userService.createUser({
          openid,
          unionid,
          nickname: userInfo?.nickName || '微信用户',
          avatar_url: userInfo?.avatarUrl || '',
          session_key: WechatUtil.encryptSensitiveData(session_key),
        });
        logger.info(`创建新用户: ${openid.substring(0, 8)}***`);
      } else {
        // 更新现有用户的session_key和登录时间
        await userService.updateUser(user.id, {
          session_key: WechatUtil.encryptSensitiveData(session_key),
          last_login_at: new Date(),
          // 如果有新的用户信息，也更新
          ...(userInfo && {
            nickname: userInfo.nickName,
            avatar_url: userInfo.avatarUrl,
          }),
        });
        logger.info(`用户登录: ${openid.substring(0, 8)}***`);
      }

      // 4. 生成JWT token
      const tokenPair = JWTUtil.generateTokenPair({
        userId: user.id,
        openid: user.openid,
      });

      // 5. 存储刷新令牌到数据库
      await userService.updateUser(user.id, {
        refresh_token: tokenPair.refreshToken,
        token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
      });

      // 6. 缓存用户会话信息
      await RedisCache.set(
        `user_session:${user.id}`,
        {
          userId: user.id,
          openid: user.openid,
          sessionKey: session_key,
        },
        7 * 24 * 60 * 60 // 7天
      );

      // 7. 返回登录结果
      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        user: {
          id: user.id,
          openid: user.openid,
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          role_id: user.role_id,
        },
      };
    } catch (error) {
      logger.error('微信登录失败:', error);
      
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new WechatAPIError('微信登录失败，请重试');
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(userId: number, openid: string): Promise<Omit<LoginResult, 'user'>> {
    try {
      // 1. 验证用户是否存在
      const user = await userService.getUserById(userId);
      if (!user || user.openid !== openid) {
        throw new AuthenticationError('用户信息不匹配');
      }

      // 2. 检查刷新令牌是否过期
      if (user.token_expires_at && new Date() > user.token_expires_at) {
        throw new AuthenticationError('刷新令牌已过期，请重新登录');
      }

      // 3. 生成新的令牌对
      const tokenPair = JWTUtil.generateTokenPair({
        userId: user.id,
        openid: user.openid,
      });

      // 4. 更新数据库中的刷新令牌
      await userService.updateUser(user.id, {
        refresh_token: tokenPair.refreshToken,
        token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      logger.info(`令牌刷新成功: 用户${userId}`);

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
      };
    } catch (error) {
      logger.error('刷新令牌失败:', error);
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout(userId: number): Promise<void> {
    try {
      // 1. 清除数据库中的刷新令牌
      await userService.updateUser(userId, {
        refresh_token: null,
        token_expires_at: null,
      });

      // 2. 清除Redis缓存
      await RedisCache.del(`user_session:${userId}`);

      logger.info(`用户登出: ${userId}`);
    } catch (error) {
      logger.error('用户登出失败:', error);
      throw error;
    }
  }

  /**
   * 验证用户会话
   */
  async validateSession(userId: number): Promise<boolean> {
    try {
      const session = await RedisCache.get(`user_session:${userId}`);
      return !!session;
    } catch (error) {
      logger.error('验证用户会话失败:', error);
      return false;
    }
  }

  /**
   * 获取用户会话信息
   */
  async getSessionInfo(userId: number): Promise<any> {
    try {
      return await RedisCache.get(`user_session:${userId}`);
    } catch (error) {
      logger.error('获取用户会话信息失败:', error);
      return null;
    }
  }
}

export const authService = new AuthService();
