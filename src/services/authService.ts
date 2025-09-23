import { WechatUtil } from '@/utils/wechat';
import { JWTUtil } from '@/utils/jwt';
import { userService } from '@/services/userService';
// 移除Redis依赖，JWT完全无状态
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
        });
        logger.info(`创建新用户: ${openid.substring(0, 8)}***`);
      } else {
        // 更新现有用户的登录时间和用户信息
        await userService.updateUser(user.id, {
          last_login_at: new Date(),
          // 如果有新的用户信息，也更新
          ...(userInfo && {
            nickname: userInfo.nickName,
            avatar_url: userInfo.avatarUrl,
          }),
        });
        logger.info(`用户登录: ${openid.substring(0, 8)}***`);
      }

      // 4. 生成JWT token（无状态，不存储到数据库）
      const tokenPair = JWTUtil.generateTokenPair({
        userId: user.id,
        openid: user.openid,
      });

      // JWT是完全无状态的，不需要任何缓存

      // 6. 返回登录结果（JWT完全无状态）
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
   * 刷新访问令牌（简化版，JWT无状态）
   */
  async refreshToken(userId: number, openid: string): Promise<Omit<LoginResult, 'user'>> {
    try {
      // 1. 验证用户是否存在
      const user = await userService.getUserById(userId);
      if (!user || user.openid !== openid) {
        throw new AuthenticationError('用户信息不匹配');
      }

      // 2. 生成新的令牌对（无状态，不存储到数据库）
      const tokenPair = JWTUtil.generateTokenPair({
        userId: user.id,
        openid: user.openid,
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
      // JWT完全无状态，登出只需要前端丢弃token即可
      // 这里可以记录登出日志，但不需要任何服务端状态清理
      logger.info(`用户登出: ${userId}`);
    } catch (error) {
      logger.error('用户登出失败:', error);
      throw error;
    }
  }

  // JWT无状态设计，不需要会话验证和信息获取方法
  // 所有用户状态都包含在JWT token中
}

export const authService = new AuthService();
