/**
 * 环境变量验证工具
 */

import { logger } from './logger';

interface EnvConfig {
  // 服务器配置
  PORT: string;
  NODE_ENV?: string;

  // 数据库配置
  DB_HOST: string;
  DB_PORT: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;

  // 可选配置
  DB_INIT?: string;
  ENABLE_REDIS?: string;

  // JWT配置
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN?: string;

  // 微信配置（可选）
  WECHAT_APPID?: string;
  WECHAT_SECRET?: string;
}

/**
 * 验证必需的环境变量
 */
export function validateEnv(): void {
  const requiredEnvVars: (keyof EnvConfig)[] = [
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missingVars: string[] = [];
  const warnings: string[] = [];

  // 检查必需的环境变量
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  // 检查可选但建议配置的环境变量
  if (!process.env.WECHAT_APPID || !process.env.WECHAT_SECRET) {
    warnings.push('微信小程序配置(WECHAT_APPID, WECHAT_SECRET)未设置，微信登录功能将不可用');
  }

  // 如果有缺失的必需变量，抛出错误
  if (missingVars.length > 0) {
    const errorMessage = `缺少必需的环境变量: ${missingVars.join(', ')}`;
    logger.error(errorMessage);
    logger.error('请检查 .env 文件并确保所有必需的环境变量都已设置');
    throw new Error(errorMessage);
  }

  // 输出警告信息
  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn(`⚠️  ${warning}`));
  }

  // 验证环境变量的值
  validateEnvValues();

  logger.info('✅ 环境变量验证通过');
}

/**
 * 验证环境变量的值是否合法
 */
function validateEnvValues(): void {
  // 验证端口号
  const port = parseInt(process.env.PORT || '3001');
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error('PORT 必须是1-65535之间的有效端口号');
  }

  // 验证数据库端口
  const dbPort = parseInt(process.env.DB_PORT || '3306');
  if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error('DB_PORT 必须是1-65535之间的有效端口号');
  }

  // 验证JWT过期时间格式
  if (process.env.JWT_EXPIRES_IN && !isValidTimeFormat(process.env.JWT_EXPIRES_IN)) {
    throw new Error('JWT_EXPIRES_IN 格式不正确，应该类似于: 2h, 30m, 7d');
  }

  if (process.env.JWT_REFRESH_EXPIRES_IN && !isValidTimeFormat(process.env.JWT_REFRESH_EXPIRES_IN)) {
    throw new Error('JWT_REFRESH_EXPIRES_IN 格式不正确，应该类似于: 2h, 30m, 7d');
  }

  // 验证布尔值环境变量
  const booleanVars = ['DB_INIT', 'ENABLE_REDIS'];
  for (const varName of booleanVars) {
    const value = process.env[varName];
    if (value && value !== 'true' && value !== 'false') {
      throw new Error(`${varName} 必须是 'true' 或 'false'`);
    }
  }

  // 验证NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
    logger.warn(`⚠️  NODE_ENV 值不标准: ${process.env.NODE_ENV}，建议使用: ${validEnvs.join(', ')}`);
  }
}

/**
 * 验证时间格式是否合法 (例如: 2h, 30m, 7d)
 */
function isValidTimeFormat(time: string): boolean {
  return /^\d+[smhd]$/.test(time);
}

/**
 * 获取配置信息摘要（不包含敏感信息）
 */
export function getConfigSummary(): Record<string, any> {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '3001',
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      initEnabled: process.env.DB_INIT === 'true',
    },
    redis: {
      enabled: process.env.ENABLE_REDIS === 'true',
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
    },
    wechat: {
      configured: !!(process.env.WECHAT_APPID && process.env.WECHAT_SECRET),
    },
    jwt: {
      accessTokenExpiry: process.env.JWT_EXPIRES_IN || '2h',
      refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
  };
}

