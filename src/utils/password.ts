import bcrypt from 'bcryptjs';
import { logger } from '@/utils/logger';

/**
 * 密码处理工具类
 */
export class PasswordUtil {
  /**
   * 加密密码
   * @param password 明文密码
   * @returns 加密后的密码hash
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12; // 增加盐轮数提高安全性
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword;
    } catch (error) {
      logger.error('密码加密失败:', error);
      throw new Error('密码加密失败');
    }
  }

  /**
   * 验证密码
   * @param password 明文密码
   * @param hashedPassword 加密后的密码hash
   * @returns 密码是否匹配
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      return isMatch;
    } catch (error) {
      logger.error('密码验证失败:', error);
      throw new Error('密码验证失败');
    }
  }

  /**
   * 验证密码强度
   * @param password 密码
   * @returns 是否符合强度要求
   */
  static validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (!password) {
      return { valid: false, message: '密码不能为空' };
    }

    if (password.length < 6) {
      return { valid: false, message: '密码长度至少6位' };
    }

    if (password.length > 20) {
      return { valid: false, message: '密码长度不能超过20位' };
    }

    // 检查是否包含大小写字母和数字
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLowerCase || !hasUpperCase || !hasNumber) {
      return { valid: false, message: '密码必须包含大小写字母和数字' };
    }

    return { valid: true };
  }
} 