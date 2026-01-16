import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { WechatUtil } from '@/utils/wechat';
import { JWTUtil } from '@/utils/jwt';
import { userService } from '@/services/userService';
import { logger } from '@/utils/logger';
import { AuthenticationError, WechatAPIError } from '@/middleware/errorHandler';
import { getPool, query } from '@/config/database';

// 微信登录参数接口
interface WechatLoginParams {
  code: string;
  encryptedData?: string;
  iv?: string;
  signature?: string;
}

// 普通用户登录参数接口
interface NormalLoginParams {
  username: string;
  password: string;
}

// 登录参数（支持两种登录方式）
type LoginParams = WechatLoginParams | NormalLoginParams;

// 登录结果接口
interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: any;
}

class AuthService {
  private buildTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async insertRefreshToken(
    connection: mysql.PoolConnection,
    userId: number,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    const tokenHash = this.buildTokenHash(refreshToken);
    const expiresAt = JWTUtil.getTokenExpiration(refreshToken);
    if (!expiresAt) {
      throw new Error('刷新令牌过期时间解析失败');
    }

    await connection.execute(
      `
        INSERT INTO user_refresh_tokens (
          user_id, token_hash, issued_at, expires_at,
          user_agent, ip_address, created_at
        ) VALUES (?, ?, NOW(), ?, ?, ?, NOW())
      `,
      [userId, tokenHash, expiresAt, userAgent || null, ipAddress || null]
    );

    return tokenHash;
  }

  private async revokeRefreshToken(
    connection: mysql.PoolConnection,
    tokenId: number,
    replacedByHash: string | null
  ): Promise<void> {
    await connection.execute(
      `
        UPDATE user_refresh_tokens
        SET revoked_at = NOW(), replaced_by = ?
        WHERE id = ?
      `,
      [replacedByHash, tokenId]
    );
  }

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
        user = await userService.createWechatUser({
          openid,
          unionid,
          nickname: userInfo?.nickName || '微信用户',
          avatar_url: userInfo?.avatarUrl || '',
        });
        logger.info(`创建新微信用户: ${openid.substring(0, 8)}***`);
      } else {
        // 更新现有用户的登录时间和用户信息
        logger.info(`开始更新微信用户: ${openid.substring(0, 8)}***`);
        
        await userService.updateUser(user.id, {
          last_login_at: new Date(),
          // 如果有新的用户信息，也更新
          ...(userInfo && {
            nickname: userInfo.nickName,
            avatar_url: userInfo.avatarUrl,
          }),
        });
        
        logger.info(`微信用户更新成功: ${openid.substring(0, 8)}***`);
      }

      // 4. 生成JWT token（无状态，不存储到数据库）
      const tokenPair = JWTUtil.generateTokenPair({
        userId: user.id,
        openid: user.openid,
      });

      const loginConnection = await getPool().getConnection();
      try {
        await this.insertRefreshToken(loginConnection, user.id, tokenPair.refreshToken);
      } finally {
        loginConnection.release();
      }

      // 6. 返回登录结果（JWT完全无状态）
      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        user: {
          id: user.id,
          openid: user.openid,
          username: null, // 微信用户没有用户名
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          phone: user.phone,
          role_id: user.role_id,
          status: user.status,
          created_at: user.created_at,
          updated_at: user.updated_at,
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
   * 普通用户登录
   */
  async normalLogin(params: NormalLoginParams): Promise<LoginResult> {
    const { username, password } = params;
    
    logger.info('🔧 authService.normalLogin 开始:', { username });

    // 验证用户密码
    const user = await userService.verifyUserPassword(username, password);
    if (!user) {
      throw new AuthenticationError('用户名或密码错误');
    }

    // 检查用户状态
    if (user.status !== 1) {
      throw new AuthenticationError('用户账号已被禁用');
    }

    logger.info('🔧 用户验证成功:', { userId: user.id, username: user.username });

    // 更新最后登录时间
    await userService.updateUser(user.id, {
      last_login_at: new Date(),
    });

    logger.info('🔧 最后登录时间已更新');

    // 生成JWT token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
    };
    
    logger.info('🔧 准备生成Token:', tokenPayload);

    const tokenPair = JWTUtil.generateTokenPair(tokenPayload);
     
    logger.info('🔧 Token生成完成:', {
      hasAccessToken: !!tokenPair.accessToken,
      hasRefreshToken: !!tokenPair.refreshToken,
      accessTokenLength: tokenPair.accessToken?.length || 0
    });

    const loginConnection = await getPool().getConnection();
    try {
      await this.insertRefreshToken(loginConnection, user.id, tokenPair.refreshToken);
    } finally {
      loginConnection.release();
    }

    const result = {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        ...user,
        openid: null, // 普通用户openid为null
      },
    };
    
    logger.info('🔧 normalLogin 返回结果:', {
      hasAccessToken: !!result.accessToken,
      hasRefreshToken: !!result.refreshToken,
      hasUser: !!result.user,
      userKeys: result.user ? Object.keys(result.user) : []
    });

    logger.info('普通用户登录成功:', username);
    return result;
  }

  /**
   * 统一登录接口（自动判断登录方式）
   */
  async login(params: LoginParams): Promise<LoginResult> {
    // 通过参数判断登录类型
    if ('code' in params) {
      // 微信登录
      return this.wechatLogin(params);
    } else {
      // 普通用户登录
      return this.normalLogin(params);
    }
  }

  /**
   * 刷新访问令牌（简化版，JWT无状态）
   */
  async refreshToken(
    userId: number,
    refreshToken: string | undefined,
    userIdentifier?: string
  ): Promise<Omit<LoginResult, 'user'>> {
    try {
      if (!refreshToken) {
        throw new AuthenticationError('刷新令牌缺失');
      }

      // 1. 验证用户是否存在
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new AuthenticationError('用户不存在');
      }

      // 2. 验证用户标识符匹配
      if (userIdentifier) {
        const isValidUser = user.openid === userIdentifier || user.username === userIdentifier;
        if (!isValidUser) {
          throw new AuthenticationError('用户信息不匹配');
        }
      }

      const tokenHash = this.buildTokenHash(refreshToken);
      const connection = await getPool().getConnection();

      try {
        await connection.beginTransaction();

        const [rows] = await connection.execute<any[]>(
          `
            SELECT id, user_id, revoked_at, expires_at
            FROM user_refresh_tokens
            WHERE token_hash = ?
            LIMIT 1
            FOR UPDATE
          `,
          [tokenHash]
        );

        if (!rows || rows.length === 0) {
          throw new AuthenticationError('刷新令牌已失效');
        }

        const record = rows[0];
        if (record.user_id !== userId) {
          throw new AuthenticationError('用户信息不匹配');
        }

        if (record.revoked_at) {
          throw new AuthenticationError('刷新令牌已被撤销');
        }

        if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) {
          throw new AuthenticationError('刷新令牌已过期');
        }

        const tokenPair = JWTUtil.generateTokenPair({
          userId: user.id,
          openid: user.openid,
          username: user.username,
        });

        const newTokenHash = await this.insertRefreshToken(connection, user.id, tokenPair.refreshToken);
        await this.revokeRefreshToken(connection, record.id, newTokenHash);

        await connection.commit();
        logger.info(`令牌刷新成功: 用户${userId}`);

        return {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
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
      await query(
        `
          UPDATE user_refresh_tokens
          SET revoked_at = NOW()
          WHERE user_id = ? AND revoked_at IS NULL
        `,
        [userId]
      );
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
