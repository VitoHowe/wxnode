import jwt from 'jsonwebtoken';
import { logger } from '@/utils/logger';

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'wxnode-default-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'wxnode-refresh-secret';
const ACCESS_TOKEN_EXPIRES_IN = '2h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Token载荷接口
export interface TokenPayload {
  userId: number;
  openid: string;
  type: 'access' | 'refresh';
}

// JWT工具类
export class JWTUtil {
  /**
   * 生成访问令牌
   */
  static generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
    try {
      return jwt.sign(
        { ...payload, type: 'access' },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
      );
    } catch (error) {
      logger.error('生成访问令牌失败:', error);
      throw new Error('生成访问令牌失败');
    }
  }

  /**
   * 生成刷新令牌
   */
  static generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
    try {
      return jwt.sign(
        { ...payload, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
      );
    } catch (error) {
      logger.error('生成刷新令牌失败:', error);
      throw new Error('生成刷新令牌失败');
    }
  }

  /**
   * 验证访问令牌
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      if (decoded.type !== 'access') {
        throw new Error('令牌类型错误');
      }
      return decoded;
    } catch (error) {
      logger.warn('访问令牌验证失败:', error);
      return null;
    }
  }

  /**
   * 验证刷新令牌
   */
  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
      if (decoded.type !== 'refresh') {
        throw new Error('令牌类型错误');
      }
      return decoded;
    } catch (error) {
      logger.warn('刷新令牌验证失败:', error);
      return null;
    }
  }

  /**
   * 生成令牌对（访问令牌 + 刷新令牌）
   */
  static generateTokenPair(payload: Omit<TokenPayload, 'type'>) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    };
  }

  /**
   * 解码令牌（不验证签名）
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('解码令牌失败:', error);
      return null;
    }
  }

  /**
   * 获取令牌过期时间
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      logger.error('获取令牌过期时间失败:', error);
      return null;
    }
  }

  /**
   * 检查令牌是否即将过期（15分钟内）
   */
  static isTokenExpiringSoon(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;

    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    
    return expiration <= fifteenMinutesFromNow;
  }
}
