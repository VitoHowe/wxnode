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
    
    // 仅在首次启动或环境变量明确指定时才执行表创建和迁移
    // 设置 DB_INIT=true 来启用数据库初始化
    if (process.env.DB_INIT === 'true') {
      logger.info('开始数据库初始化...');
      await createTables(mainConnection);
    } else {
      logger.info('跳过数据库初始化（如需初始化，请设置环境变量 DB_INIT=true）');
    }
    
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
        file_type ENUM('question_bank', 'knowledge_base') DEFAULT 'question_bank' COMMENT '文件类型：题库/知识库',
        file_original_name VARCHAR(500),
        file_path VARCHAR(500),
        file_size BIGINT,
        parse_status ENUM('pending', 'parsing', 'completed', 'failed') DEFAULT 'pending',
        parse_method VARCHAR(50),
        provider_id INT NULL COMMENT 'AI供应商ID',
        model_name VARCHAR(100) NULL COMMENT 'AI模型名称',
        total_questions INT DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (parse_status),
        INDEX idx_created_by (created_by),
        INDEX idx_file_type (file_type),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 迁移题库表 - 添加AI相关字段
    await migrateQuestionBanksTable(connection);

    // 创建解析结果表（新架构：替代原questions表）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS parse_results (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        bank_id INT NOT NULL COMMENT '关联的题库ID',
        questions JSON NOT NULL COMMENT '解析得到的题目数组(JSON格式)',
        total_questions INT NOT NULL DEFAULT 0 COMMENT '题目总数',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_bank_id (bank_id),
        INDEX idx_created_at (created_at),
        CONSTRAINT fk_parse_results_bank_id FOREIGN KEY (bank_id) 
          REFERENCES question_banks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='解析结果表'
    `);
    
    // 迁移旧的questions表数据（如果存在）
    await migrateQuestionsToParseResults(connection);

    // 创建用户学习进度表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_study_progress (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        user_id INT NOT NULL COMMENT '用户ID',
        bank_id INT NOT NULL COMMENT '题库ID',
        parse_result_id INT NULL COMMENT '关联的解析结果ID',
        current_question_index INT NOT NULL DEFAULT 0 COMMENT '当前题目索引(从0开始)',
        completed_count INT NOT NULL DEFAULT 0 COMMENT '已完成题目数量',
        total_questions INT NOT NULL DEFAULT 0 COMMENT '总题目数量',
        last_study_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后学习时间',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_user_bank (user_id, bank_id) COMMENT '用户和题库的唯一组合',
        INDEX idx_user_id (user_id),
        INDEX idx_bank_id (bank_id),
        INDEX idx_last_study_time (last_study_time),
        CONSTRAINT fk_progress_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_progress_bank FOREIGN KEY (bank_id) 
          REFERENCES question_banks(id) ON DELETE CASCADE,
        CONSTRAINT fk_progress_parse_result FOREIGN KEY (parse_result_id) 
          REFERENCES parse_results(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户学习进度表'
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
        request_data JSON COMMENT '请求数据（fileContentResult、parts等）',
        response_data JSON COMMENT 'API响应数据',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bank_id (bank_id),
        FOREIGN KEY (bank_id) REFERENCES question_banks(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建AI供应商配置表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_providers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type ENUM('openai', 'gemini', 'qwen', 'custom') NOT NULL DEFAULT 'custom' COMMENT '供应商类型',
        name VARCHAR(100) NOT NULL COMMENT '供应商实例名称',
        endpoint VARCHAR(255) NOT NULL COMMENT 'API端点地址',
        api_key VARCHAR(255) NOT NULL COMMENT 'API密钥',
        provider_config JSON NULL COMMENT '供应商特定配置',
        description TEXT COMMENT '描述',
        status TINYINT DEFAULT 1 COMMENT '1:启用 0:停用',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_provider_instance (type, name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 迁移旧的model_configs表数据到ai_providers
    await migrateProviderTable(connection);

    // 创建系统设置表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type VARCHAR(50) NOT NULL,
        payload JSON NOT NULL,
        updated_by INT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_type (type),
        CONSTRAINT fk_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
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
 * 迁移题库表 - 添加AI相关字段和文件类型
 */
const migrateQuestionBanksTable = async (connection: mysql.PoolConnection): Promise<void> => {
  try {
    // 检查file_type字段是否存在
    const fileTypeCheck = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'wxnode_db' 
      AND TABLE_NAME = 'question_banks' 
      AND COLUMN_NAME = 'file_type'
    `);

    if ((fileTypeCheck[0] as any[]).length === 0) {
      // 添加file_type字段
      await connection.execute(`
        ALTER TABLE question_banks 
        ADD COLUMN file_type ENUM('question_bank', 'knowledge_base') DEFAULT 'question_bank' COMMENT '文件类型：题库/知识库'
        AFTER description
      `);
      
      // 添加索引
      await connection.execute(`
        ALTER TABLE question_banks 
        ADD INDEX idx_file_type (file_type)
      `);
      
      logger.info('已添加file_type字段和索引');
    }

    // 检查provider_id字段是否存在
    const providerIdCheck = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'wxnode_db' 
      AND TABLE_NAME = 'question_banks' 
      AND COLUMN_NAME = 'provider_id'
    `);

    if ((providerIdCheck[0] as any[]).length === 0) {
      // 添加provider_id字段
      await connection.execute(`
        ALTER TABLE question_banks 
        ADD COLUMN provider_id INT NULL COMMENT 'AI供应商ID' 
        AFTER parse_method
      `);
      
      // 添加外键约束
      await connection.execute(`
        ALTER TABLE question_banks 
        ADD CONSTRAINT fk_provider 
        FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL
      `);
      
      logger.info('已添加provider_id字段和外键');
    }

    // 检查model_name字段是否存在
    const modelNameCheck = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'wxnode_db' 
      AND TABLE_NAME = 'question_banks' 
      AND COLUMN_NAME = 'model_name'
    `);

    if ((modelNameCheck[0] as any[]).length === 0) {
      // 添加model_name字段
      await connection.execute(`
        ALTER TABLE question_banks 
        ADD COLUMN model_name VARCHAR(100) NULL COMMENT 'AI模型名称' 
        AFTER provider_id
      `);
      
      logger.info('已添加model_name字段');
    }

    logger.info('题库表迁移完成');
  } catch (error) {
    logger.error('题库表迁移失败:', error);
    // 不抛出错误，让应用继续运行
  }
};

/**
 * 迁移供应商表 - 从model_configs迁移到ai_providers
 */
const migrateProviderTable = async (connection: mysql.PoolConnection): Promise<void> => {
  try {
    // 检查旧表是否存在
    const oldTableCheck = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'wxnode_db' 
      AND TABLE_NAME = 'model_configs'
    `);

    if ((oldTableCheck[0] as any[]).length > 0) {
      logger.info('检测到旧的model_configs表，开始迁移数据...');
      
      // 迁移数据到ai_providers（设置type为custom）
      await connection.execute(`
        INSERT INTO ai_providers (type, name, endpoint, api_key, description, status, created_at, updated_at)
        SELECT 'custom' as type, name, endpoint, api_key, description, status, created_at, updated_at
        FROM model_configs
        WHERE NOT EXISTS (
          SELECT 1 FROM ai_providers 
          WHERE ai_providers.type = 'custom' 
          AND ai_providers.name = model_configs.name
        )
      `);
      
      // 重命名旧表作为备份
      await connection.execute(`RENAME TABLE model_configs TO model_configs_backup_${Date.now()}`);
      
      logger.info('model_configs数据迁移完成，旧表已重命名为备份');
    }
  } catch (error) {
    logger.error('供应商表迁移失败:', error);
    // 不抛出错误，让应用继续运行
  }
};

/**
 * 迁移questions表到parse_results表
 */
const migrateQuestionsToParseResults = async (connection: mysql.PoolConnection): Promise<void> => {
  try {
    // 检查旧的questions表是否存在
    const oldTableCheck = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
      AND TABLE_NAME = 'questions'
    `);

    if ((oldTableCheck[0] as any[]).length > 0) {
      logger.info('检测到旧的questions表，开始迁移数据到parse_results表...');
      
      // 检查questions表是否有数据
      const dataCheck = await connection.execute(`SELECT COUNT(*) as count FROM questions`);
      const recordCount = (dataCheck[0] as any[])[0].count;
      
      if (recordCount > 0) {
        logger.info(`发现 ${recordCount} 条题目记录，开始迁移...`);
        
        // 按bank_id分组聚合数据
        const groupedData = await connection.execute(`
          SELECT 
            bank_id,
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'type', type,
                'content', content,
                'options', options,
                'answer', answer,
                'explanation', explanation,
                'difficulty', difficulty,
                'tags', tags,
                'page_number', page_number,
                'confidence_score', confidence_score
              )
            ) as questions,
            COUNT(*) as total_questions,
            MIN(created_at) as created_at
          FROM questions
          GROUP BY bank_id
        `);
        
        const records = groupedData[0] as any[];
        
        // 插入到parse_results表
        for (const record of records) {
          await connection.execute(`
            INSERT INTO parse_results (bank_id, questions, total_questions, created_at, updated_at)
            VALUES (?, ?, ?, ?, NOW())
          `, [record.bank_id, record.questions, record.total_questions, record.created_at]);
        }
        
        logger.info(`成功迁移 ${records.length} 个题库的数据到parse_results表`);
      } else {
        logger.info('questions表为空，跳过数据迁移');
      }
      
      // 重命名旧表作为备份
      const backupName = `questions_backup_${Date.now()}`;
      await connection.execute(`RENAME TABLE questions TO ${backupName}`);
      
      logger.info(`旧questions表已重命名为: ${backupName}`);
    } else {
      logger.info('未发现旧的questions表，跳过迁移');
    }
  } catch (error) {
    logger.error('questions表迁移失败:', error);
    // 不抛出错误，让应用继续运行
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
