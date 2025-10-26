import { createClient } from 'redis';
import { logger } from '@/utils/logger';

// Redis客户端实例
// 使用 ReturnType 自动推断类型，避免复杂的泛型类型定义
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Redis配置
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
};

/**
 * 创建Redis连接
 */
export const createRedisClient = () => {
  const client = createClient({
    socket: {
      host: redisConfig.host,
      port: redisConfig.port,
      reconnectStrategy: false, // 禁用自动重连
    },
    password: redisConfig.password,
    database: redisConfig.db,
  });

  // 错误处理
  client.on('error', (error) => {
    logger.warn('Redis连接错误，将以无缓存模式运行');
  });

  client.on('connect', () => {
    logger.info('Redis连接成功');
  });

  client.on('ready', () => {
    logger.info('Redis客户端就绪');
  });

  return client;
};

/**
 * 连接Redis
 */
export const connectRedis = async (): Promise<void> => {
  try {
    const client = createRedisClient();
    
    // 设置连接超时
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis连接超时')), 5000);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    // 连接成功后赋值
    redisClient = client;
  } catch (error) {
    logger.error('Redis连接失败:', error);
    throw error;
  }
};

/**
 * 获取Redis客户端
 */
export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis客户端未初始化');
  }
  return redisClient;
};

/**
 * 关闭Redis连接
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis连接已关闭');
  }
};

/**
 * Redis缓存工具类
 */
export class RedisCache {
  private static client: ReturnType<typeof createClient>;

  static init(client: ReturnType<typeof createClient>) {
    this.client = client;
  }

  /**
   * 设置缓存
   */
  static async set(key: string, value: any, expireTime?: number): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (expireTime) {
        await this.client.setEx(key, expireTime, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error) {
      logger.error('设置缓存失败:', error);
      throw error;
    }
  }

  /**
   * 获取缓存
   */
  static async get(key: string): Promise<any> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('获取缓存失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  static async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('删除缓存失败:', error);
      return false;
    }
  }

  /**
   * 检查缓存是否存在
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error('检查缓存失败:', error);
      return false;
    }
  }

  /**
   * 设置缓存过期时间
   */
  static async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result;
    } catch (error) {
      logger.error('设置缓存过期时间失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存剩余过期时间
   */
  static async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('获取缓存过期时间失败:', error);
      return -1;
    }
  }
}
