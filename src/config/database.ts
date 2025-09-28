import mysql from 'mysql2/promise';
import { logger } from '@/utils/logger';

// 确保环境变量已加载
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wxnode_db',
  charset: 'utf8mb4',
  timezone: '+08:00',
};

// 数据库连接池
let pool: mysql.Pool;

/**
 * 创建数据库连接池
 */
export const createPool = () => {
  pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
};

/**
 * 获取数据库连接池
 */
export const getPool = (): mysql.Pool => {
  if (!pool) {
    pool = createPool();
  }
  return pool;
};

/**
 * 连接数据库
 */
export const connectDB = async (): Promise<void> => {
  try {
    // 先连接到MySQL服务器（不指定数据库）
    const tempConfig: any = { ...dbConfig };
    delete tempConfig.database;
    
    const tempPool = mysql.createPool(tempConfig);
    const connection = await tempPool.getConnection();
    
    // 创建数据库（如果不存在）
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    connection.release();
    await tempPool.end();
    
    // 重新连接到指定数据库
    const mainConnection = await getPool().getConnection();
    
    // 创建表结构
    await createTables(mainConnection);
    
    mainConnection.release();
    logger.info('数据库连接成功');
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
};

/**
 * 创建数据库表
 */
const createTables = async (connection: mysql.PoolConnection): Promise<void> => {
  try {
    // 创建角色表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL,
        permissions JSON,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        openid VARCHAR(100) UNIQUE NULL COMMENT '微信openid，普通用户为空',
        unionid VARCHAR(100),
        nickname VARCHAR(100),
        avatar_url VARCHAR(500),
        phone VARCHAR(20),
        role_id INT DEFAULT 1,
        status TINYINT DEFAULT 1 COMMENT '1:正常 0:禁用',
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_openid (openid),
        INDEX idx_unionid (unionid),
        FOREIGN KEY (role_id) REFERENCES roles(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 迁移逻辑：添加新字段（如果不存在）
    await migrateUserTable(connection);

    // 创建题库表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS question_banks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        file_original_name VARCHAR(500),
        file_path VARCHAR(500),
        file_size BIGINT,
        parse_status ENUM('pending', 'parsing', 'completed', 'failed') DEFAULT 'pending',
        parse_method VARCHAR(50),
        total_questions INT DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (parse_status),
        INDEX idx_created_by (created_by),
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建题目表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        bank_id INT NOT NULL,
        type ENUM('single', 'multiple', 'judge', 'fill', 'essay') NOT NULL,
        content TEXT NOT NULL,
        options JSON,
        answer TEXT NOT NULL,
        explanation TEXT,
        difficulty TINYINT DEFAULT 1 COMMENT '1:简单 2:中等 3:困难',
        tags JSON,
        page_number INT,
        confidence_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bank_type (bank_id, type),
        INDEX idx_difficulty (difficulty),
        FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建解析日志表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS parse_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        bank_id INT NOT NULL,
        status ENUM('success', 'partial', 'failed') NOT NULL,
        method VARCHAR(50),
        total_pages INT,
        parsed_pages INT,
        accuracy_score DECIMAL(3,2),
        error_message TEXT,
        processing_time INT COMMENT '处理时间（秒）',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bank_id (bank_id),
        FOREIGN KEY (bank_id) REFERENCES question_banks(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 插入默认角色数据
    await connection.execute(`
      INSERT IGNORE INTO roles (id, name, permissions, description) VALUES
      (1, 'user', '["read"]', '普通用户'),
      (2, 'admin', '["read", "write", "delete"]', '管理员'),
      (3, 'super_admin', '["read", "write", "delete", "manage"]', '超级管理员')
    `);

    logger.info('数据库表创建完成');
  } catch (error) {
    logger.error('创建数据库表失败:', error);
    throw error;
  }
};

/**
 * 迁移用户表 - 添加username和password字段
 */
const migrateUserTable = async (connection: mysql.PoolConnection): Promise<void> => {
  try {
    // 检查username字段是否存在
    const usernameColumnCheck = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'wxnode_db' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'username'
    `);

    if ((usernameColumnCheck[0] as any[]).length === 0) {
      // 添加username字段
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN username VARCHAR(50) UNIQUE NULL COMMENT '用户名，微信用户为空' 
        AFTER unionid
      `);
      
      // 添加username索引
      await connection.execute(`
        ALTER TABLE users 
        ADD INDEX idx_username (username)
      `);
      
      logger.info('已添加username字段和索引');
    }

    // 检查password字段是否存在
    const passwordColumnCheck = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'wxnode_db' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'password'
    `);

    if ((passwordColumnCheck[0] as any[]).length === 0) {
      // 添加password字段
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN password VARCHAR(255) NULL COMMENT '密码hash，微信用户为空' 
        AFTER username
      `);
      
      logger.info('已添加password字段');
    }

    // 修改openid字段为可空（如果还不是）
    await connection.execute(`
      ALTER TABLE users 
      MODIFY COLUMN openid VARCHAR(100) UNIQUE NULL COMMENT '微信openid，普通用户为空'
    `);

    logger.info('用户表迁移完成');
  } catch (error) {
    logger.error('用户表迁移失败:', error);
    // 不抛出错误，让应用继续运行
  }
};

/**
 * 执行SQL查询
 */
export const query = async (sql: string, params?: any[]): Promise<any> => {
  const connection = await getPool().getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } finally {
    connection.release();
  }
};

/**
 * 关闭数据库连接
 */
export const closeDB = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    logger.info('数据库连接已关闭');
  }
};
