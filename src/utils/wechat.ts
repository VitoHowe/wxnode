import axios from 'axios';
import crypto from 'crypto';
import { logger } from '@/utils/logger';

// 微信API配置
const WECHAT_API_BASE = 'https://api.weixin.qq.com';
const APPID = process.env.WECHAT_APPID || '';
const SECRET = process.env.WECHAT_SECRET || '';

// 配置验证
if (!APPID || !SECRET) {
  logger.error('微信小程序配置缺失：请在 .env 文件中配置 WECHAT_APPID 和 WECHAT_SECRET');
  logger.error('参考 .env.example 文件获取配置模板');
}

// 微信API响应接口
export interface WechatCode2SessionResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WechatUserInfo {
  openId: string;
  nickName: string;
  gender: number;
  city: string;
  province: string;
  country: string;
  avatarUrl: string;
  language: string;
}

// 微信工具类
export class WechatUtil {
  /**
   * 使用code换取session_key和openid
   */
  static async code2Session(code: string): Promise<WechatCode2SessionResponse> {
    // 在调用微信API前检查配置
    if (!this.checkConfig()) {
      throw new Error('微信小程序配置错误，请检查 .env 文件中的 WECHAT_APPID 和 WECHAT_SECRET 配置');
    }
    
    try {
      const response = await axios.get(`${WECHAT_API_BASE}/sns/jscode2session`, {
        params: {
          appid: APPID,
          secret: SECRET,
          js_code: code,
          grant_type: 'authorization_code',
        },
        timeout: 10000,
      });

      const data = response.data;
      
      // 检查微信API返回的错误
      if (data.errcode) {
        logger.error('微信code2session接口返回错误:', data);
        throw new Error(`微信API错误: ${data.errmsg} (${data.errcode})`);
      }

      if (!data.openid || !data.session_key) {
        logger.error('微信code2session接口返回数据异常:', data);
        throw new Error('微信API返回数据异常');
      }

      logger.info(`微信登录成功, openid: ${data.openid.substring(0, 8)}***`);
      return data;
    } catch (error) {
      logger.error('调用微信code2session接口失败:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`微信API调用失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 验证用户信息签名
   */
  static verifySignature(
    sessionKey: string,
    encryptedData: string,
    iv: string,
    signature: string
  ): boolean {
    try {
      const hmac = crypto.createHmac('sha1', sessionKey);
      hmac.update(encryptedData + iv);
      const computedSignature = hmac.digest('hex');
      
      return computedSignature === signature;
    } catch (error) {
      logger.error('验证用户信息签名失败:', error);
      return false;
    }
  }

  /**
   * 解密用户信息
   */
  static decryptUserInfo(
    sessionKey: string,
    encryptedData: string,
    iv: string
  ): WechatUserInfo | null {
    try {
      const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
      const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');

      const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
      decipher.setAutoPadding(true);
      
      let decrypted = decipher.update(encryptedDataBuffer, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      const userInfo = JSON.parse(decrypted);
      
      // 验证appId
      if (userInfo.watermark && userInfo.watermark.appid !== APPID) {
        logger.error('用户信息appId验证失败');
        return null;
      }

      return userInfo;
    } catch (error) {
      logger.error('解密用户信息失败:', error);
      return null;
    }
  }

  /**
   * 加密敏感数据
   */
  static encryptSensitiveData(data: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(SECRET, 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      // 使用现代化的createCipheriv方法
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 返回格式：iv:加密数据
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('加密敏感数据失败:', error);
      throw error;
    }
  }

  /**
   * 解密敏感数据
   */
  static decryptSensitiveData(encryptedData: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(SECRET, 'salt', 32);
      
      // 分离IV和加密数据
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('加密数据格式错误');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      // 使用现代化的createDecipheriv方法
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('解密敏感数据失败:', error);
      throw error;
    }
  }

  /**
   * 生成随机字符串
   */
  static generateNonce(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 检查微信小程序配置
   */
  static checkConfig(): boolean {
    if (!APPID || !SECRET) {
      logger.error('❌ 微信小程序配置缺失');
      logger.error('📁 请检查项目根目录是否存在 .env 文件');
      logger.error('📋 如果不存在，请复制 .env.example 为 .env 并填入正确配置');
      logger.error('🔑 WECHAT_APPID 和 WECHAT_SECRET 需要从微信公众平台获取');
      logger.error('🌐 微信公众平台地址: https://mp.weixin.qq.com/');
      logger.error(`📊 当前配置状态: APPID=${APPID ? '已配置' : '未配置'}, SECRET=${SECRET ? '已配置' : '未配置'}`);
      return false;
    }
    
    if (APPID === 'your_wechat_miniprogram_appid' || SECRET === 'your_wechat_miniprogram_secret') {
      logger.error('❌ 微信小程序配置使用了示例值，请填入真实配置');
      return false;
    }
    
    logger.info('✅ 微信小程序配置检查通过');
    return true;
  }
}
