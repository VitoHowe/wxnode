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
    connectTimeout: 60000, // 60秒连接超时
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
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
        INDEX idx_unionid (unionid),
        FOREIGN KEY (role_id) REFERENCES roles(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_refresh_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP NULL,
        replaced_by VARCHAR(64) NULL,
        user_agent VARCHAR(255) NULL,
        ip_address VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        UNIQUE KEY uk_token_hash (token_hash),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 迁移逻辑：添加新字段（如果不存在）
    await migrateUserTable(connection);

    // 创建科目表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NULL,
        status TINYINT DEFAULT 1 COMMENT '1:active 0:disabled',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_subject_name (name),
        UNIQUE KEY uk_subject_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建题库表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS question_banks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        subject_id INT NULL COMMENT '科目ID',
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
        INDEX idx_subject_id (subject_id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        CONSTRAINT fk_question_banks_subject FOREIGN KEY (subject_id)
          REFERENCES subjects(id) ON DELETE SET NULL,
        FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 迁移题库表 - 添加AI相关字段
    await migrateQuestionBanksTable(connection);
    await migrateQuestionBanksSubject(connection);
    
    // 添加解析JSON文件路径字段
    await addParsedJsonPathField(connection);

    // Markdown 文件与章节表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS markdown_files (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        original_filename VARCHAR(500),
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT,
        parse_status ENUM('pending', 'parsing', 'completed', 'failed') DEFAULT 'pending',
        chapter_count INT DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_markdown_status (parse_status),
        INDEX idx_markdown_created_by (created_by),
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS markdown_chapters (
        id INT PRIMARY KEY AUTO_INCREMENT,
        file_id INT NOT NULL,
        chapter_title VARCHAR(200) NOT NULL,
        chapter_order INT NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_markdown_file_chapter (file_id, chapter_order),
        INDEX idx_markdown_file_id (file_id),
        CONSTRAINT fk_markdown_chapters_file FOREIGN KEY (file_id)
          REFERENCES markdown_files(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建科目章节表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS subject_chapters (
        id INT NOT NULL AUTO_INCREMENT COMMENT '主键',
        subject_id INT NOT NULL COMMENT '科目ID',
        chapter_name VARCHAR(200) NOT NULL COMMENT '章节名称(基准)',
        display_name VARCHAR(200) DEFAULT NULL COMMENT '展示名称',
        chapter_order INT NOT NULL DEFAULT 0 COMMENT '章节顺序',
        status TINYINT DEFAULT 1 COMMENT '1:active 0:disabled',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY uk_subject_chapter (subject_id, chapter_name),
        INDEX idx_subject_order (subject_id, chapter_order),
        CONSTRAINT fk_subject_chapters_subject FOREIGN KEY (subject_id)
          REFERENCES subjects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科目章节表'
    `);

    // 创建科目章节别名表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS subject_chapter_aliases (
        id INT NOT NULL AUTO_INCREMENT COMMENT '主键',
        subject_id INT NOT NULL COMMENT '科目ID',
        subject_chapter_id INT NOT NULL COMMENT '科目章节ID',
        alias_name VARCHAR(200) NOT NULL COMMENT '章节别名',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY uk_subject_chapter_alias (subject_id, alias_name),
        INDEX idx_subject_alias_chapter (subject_id, subject_chapter_id),
        CONSTRAINT fk_subject_chapter_alias_subject FOREIGN KEY (subject_id)
          REFERENCES subjects(id) ON DELETE CASCADE,
        CONSTRAINT fk_subject_chapter_alias_chapter FOREIGN KEY (subject_chapter_id)
          REFERENCES subject_chapters(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科目章节别名表'
    `);

    // 创建题库章节表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS question_chapters (
        id INT NOT NULL AUTO_INCREMENT COMMENT '主键',
        bank_id INT NOT NULL COMMENT '关联的题库ID',
        subject_chapter_id INT NULL COMMENT '关联的科目章节ID',
        chapter_name VARCHAR(200) NOT NULL COMMENT '章节名称',
        chapter_order INT NOT NULL COMMENT '章节顺序',
        question_count INT NOT NULL DEFAULT 0 COMMENT '该章节题目数量',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY uk_bank_chapter (bank_id, chapter_name),
        INDEX idx_bank_order (bank_id, chapter_order),
        INDEX idx_subject_chapter (subject_chapter_id),
        CONSTRAINT fk_chapters_bank_id FOREIGN KEY (bank_id)
          REFERENCES question_banks(id) ON DELETE CASCADE,
        CONSTRAINT fk_chapters_subject_chapter FOREIGN KEY (subject_chapter_id)
          REFERENCES subject_chapters(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='题库章节表'
    `);
    await migrateQuestionChaptersTable(connection);

    // 创建题目表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT NOT NULL AUTO_INCREMENT COMMENT '主键',
        bank_id INT NOT NULL COMMENT '关联的题库ID',
        chapter_id INT NOT NULL COMMENT '关联的章节ID',
        question_no VARCHAR(50) DEFAULT NULL COMMENT '题号',
        type ENUM('single', 'multiple', 'judge', 'fill', 'essay') NOT NULL COMMENT '题型',
        content TEXT NOT NULL COMMENT '题目内容',
        options JSON DEFAULT NULL COMMENT '选项（JSON数组）',
        answer TEXT NOT NULL COMMENT '答案',
        explanation TEXT DEFAULT NULL COMMENT '解析',
        difficulty INT DEFAULT 1 COMMENT '难度：1-简单 2-中等 3-困难',
        tags JSON DEFAULT NULL COMMENT '标签（JSON数组）',
        random_key INT DEFAULT NULL COMMENT '随机键',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        INDEX idx_bank (bank_id),
        INDEX idx_chapter (chapter_id),
        INDEX idx_type (type),
        INDEX idx_difficulty (difficulty),
        INDEX idx_created_at (created_at),
        INDEX idx_random_key (random_key),
        CONSTRAINT fk_questions_bank_id_v3 FOREIGN KEY (bank_id)
          REFERENCES question_banks(id) ON DELETE CASCADE,
        CONSTRAINT fk_questions_chapter_id_v3 FOREIGN KEY (chapter_id)
          REFERENCES question_chapters(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='题目表'
    `);
    await migrateQuestionsTable(connection);

    // 创建解析结果表
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

    // 创建真题试卷表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS real_exam_papers (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        subject_id INT NOT NULL COMMENT '科目ID',
        name VARCHAR(200) NOT NULL COMMENT '试卷名称',
        description TEXT,
        total_questions INT DEFAULT 0,
        status TINYINT DEFAULT 1 COMMENT '1:active 0:disabled',
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_subject_id (subject_id),
        INDEX idx_status (status),
        CONSTRAINT fk_real_exam_subject FOREIGN KEY (subject_id)
          REFERENCES subjects(id) ON DELETE CASCADE,
        CONSTRAINT fk_real_exam_creator FOREIGN KEY (created_by)
          REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='真题试卷表'
    `);

    // 创建真题题目表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS real_exam_questions (
        id INT NOT NULL AUTO_INCREMENT COMMENT '主键',
        paper_id INT NOT NULL COMMENT '试卷ID',
        question_no INT NOT NULL COMMENT '题号',
        type ENUM('single', 'multiple', 'judge', 'fill', 'essay') NOT NULL COMMENT '题型',
        content TEXT NOT NULL COMMENT '题目内容',
        options JSON DEFAULT NULL COMMENT '选项(JSON数组)',
        answer TEXT NOT NULL COMMENT '答案',
        explanation TEXT DEFAULT NULL COMMENT '解析',
        difficulty INT DEFAULT 1 COMMENT '难度：1-简单 2-中等 3-困难',
        tags JSON DEFAULT NULL COMMENT '标签(JSON数组)',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY uk_paper_question (paper_id, question_no),
        INDEX idx_paper (paper_id),
        INDEX idx_type (type),
        INDEX idx_difficulty (difficulty),
        CONSTRAINT fk_real_exam_questions_paper FOREIGN KEY (paper_id)
          REFERENCES real_exam_papers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='真题题目表'
    `);

    // 创建真题答题统计表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS real_exam_attempts (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        user_id INT NOT NULL COMMENT '用户ID',
        paper_id INT NOT NULL COMMENT '试卷ID',
        total_questions INT NOT NULL DEFAULT 0,
        correct_count INT NOT NULL DEFAULT 0,
        wrong_count INT NOT NULL DEFAULT 0,
        accuracy DECIMAL(5,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_attempt_user (user_id),
        INDEX idx_attempt_paper (paper_id),
        CONSTRAINT fk_real_exam_attempt_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_real_exam_attempt_paper FOREIGN KEY (paper_id)
          REFERENCES real_exam_papers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='真题答题统计表'
    `);

    // 创建真题错题表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS real_exam_wrong_questions (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        attempt_id INT NOT NULL COMMENT '答题统计ID',
        user_id INT NOT NULL COMMENT '用户ID',
        paper_id INT NOT NULL COMMENT '试卷ID',
        question_id INT NOT NULL COMMENT '题目ID',
        selected_answer TEXT NULL COMMENT '用户答案',
        correct_answer TEXT NULL COMMENT '正确答案',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        UNIQUE KEY uk_attempt_question (attempt_id, question_id),
        INDEX idx_wrong_user (user_id),
        INDEX idx_wrong_paper (paper_id),
        CONSTRAINT fk_wrong_attempt FOREIGN KEY (attempt_id)
          REFERENCES real_exam_attempts(id) ON DELETE CASCADE,
        CONSTRAINT fk_wrong_question FOREIGN KEY (question_id)
          REFERENCES real_exam_questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='真题错题表'
    `);

    // 创建练习统计表（非真题模式）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS practice_attempts (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        user_id INT NOT NULL COMMENT '用户ID',
        subject_id INT NOT NULL COMMENT '科目ID',
        mode ENUM('real', 'mock', 'special', 'random') NOT NULL COMMENT '练习模式',
        source_type ENUM('paper', 'bank', 'chapter', 'subject_chapter', 'subject') NOT NULL COMMENT '来源类型',
        source_id INT NOT NULL COMMENT '来源ID',
        total_questions INT NOT NULL DEFAULT 0,
        correct_count INT NOT NULL DEFAULT 0,
        wrong_count INT NOT NULL DEFAULT 0,
        accuracy DECIMAL(5,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_practice_user (user_id),
        INDEX idx_practice_subject (subject_id),
        INDEX idx_practice_mode (mode),
        INDEX idx_practice_source (source_type, source_id),
        INDEX idx_practice_created (created_at),
        CONSTRAINT fk_practice_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_practice_subject FOREIGN KEY (subject_id)
          REFERENCES subjects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='练习统计表'
    `);

    // 创建练习错题集表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS practice_wrong_questions (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        user_id INT NOT NULL COMMENT '用户ID',
        subject_id INT NOT NULL COMMENT '科目ID',
        mode ENUM('real', 'mock', 'special', 'random') NOT NULL COMMENT '练习模式',
        source_type ENUM('paper', 'bank', 'chapter', 'subject_chapter', 'subject') NOT NULL COMMENT '来源类型',
        source_id INT NOT NULL COMMENT '来源ID',
        question_source ENUM('real_exam', 'question_bank') NOT NULL COMMENT '题目来源',
        question_id INT NOT NULL COMMENT '题目ID',
        selected_answer TEXT NULL COMMENT '用户答案',
        correct_answer TEXT NULL COMMENT '正确答案',
        wrong_times INT NOT NULL DEFAULT 1 COMMENT '错题次数',
        correct_streak INT NOT NULL DEFAULT 0 COMMENT '连续答对次数',
        last_wrong_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最近错题时间',
        last_correct_at DATETIME NULL COMMENT '最近答对时间',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_wrong_unique (user_id, subject_id, question_source, question_id),
        INDEX idx_wrong_user (user_id),
        INDEX idx_wrong_subject (subject_id),
        INDEX idx_wrong_mode (mode),
        INDEX idx_wrong_source (source_type, source_id),
        INDEX idx_wrong_updated (updated_at),
        CONSTRAINT fk_practice_wrong_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_practice_wrong_subject FOREIGN KEY (subject_id)
          REFERENCES subjects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='练习错题集'
    `);

    // 创建用户学习进度表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_study_progress (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        user_id INT NOT NULL COMMENT '用户ID',
        bank_id INT NOT NULL COMMENT '题库ID',
        practice_mode ENUM('chapter', 'full') NOT NULL DEFAULT 'chapter' COMMENT '练习模式：chapter=章节练习, full=整卷练习',
        chapter_id INT NULL COMMENT '章节ID',
        current_chapter_id INT NULL COMMENT '当前所在章节ID（整卷练习时使用）',
        parse_result_id INT NULL COMMENT '解析结果ID',
        current_question_index INT NOT NULL DEFAULT 0 COMMENT '当前题目索引(从0开始)',
        current_question_number INT NULL COMMENT '当前题号(从1开始)',
        completed_count INT NOT NULL DEFAULT 0 COMMENT '已完成题目数量',
        total_questions INT NOT NULL DEFAULT 0 COMMENT '总题目数量',
        last_study_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后学习时间',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_user_bank_mode_chapter (user_id, bank_id, practice_mode, chapter_id) COMMENT '用户题库章节练习唯一组合',
        INDEX idx_user_id (user_id),
        INDEX idx_bank_id (bank_id),
        INDEX idx_practice_mode (practice_mode),
        INDEX idx_chapter_id (chapter_id),
        INDEX idx_current_chapter (current_chapter_id),
        INDEX idx_last_study_time (last_study_time),
        CONSTRAINT fk_progress_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_progress_bank FOREIGN KEY (bank_id) 
          REFERENCES question_banks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户学习进度表'
    `);

    await migrateUserStudyProgressTable(connection);

    // 创建专项训练进度表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_special_progress (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        user_id INT NOT NULL COMMENT '用户ID',
        subject_id INT NOT NULL COMMENT '科目ID',
        subject_chapter_id INT NOT NULL COMMENT '科目章节ID',
        current_question_number INT NULL COMMENT '当前题号(从1开始)',
        completed_count INT NOT NULL DEFAULT 0 COMMENT '已完成题目数量',
        total_questions INT NOT NULL DEFAULT 0 COMMENT '总题目数量',
        last_study_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后学习时间',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_user_subject_chapter (user_id, subject_id, subject_chapter_id),
        INDEX idx_special_subject (subject_id),
        INDEX idx_special_chapter (subject_chapter_id),
        CONSTRAINT fk_special_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_special_subject FOREIGN KEY (subject_id)
          REFERENCES subjects(id) ON DELETE CASCADE,
        CONSTRAINT fk_special_chapter FOREIGN KEY (subject_chapter_id)
          REFERENCES subject_chapters(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专项训练进度表'
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

    // 单词书元数据表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS word_books (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        language VARCHAR(50) DEFAULT 'zh-CN',
        total_words INT DEFAULT 0,
        source_filename VARCHAR(255),
        stored_path VARCHAR(500),
        source_size BIGINT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_word_books_name_lang (name, language),
        INDEX idx_word_books_language (language),
        INDEX idx_word_books_created_by (created_by),
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 单词条目表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS word_book_entries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        book_id INT NOT NULL,
        word VARCHAR(255) NOT NULL,
        translation VARCHAR(1000) NOT NULL,
        phonetic VARCHAR(255),
        definition TEXT,
        example_sentence TEXT,
        part_of_speech VARCHAR(50),
        tags VARCHAR(255),
        extra JSON,
        order_index INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_word_book_word (book_id, word),
        INDEX idx_word_entries_book (book_id),
        INDEX idx_word_entries_order (book_id, order_index),
        FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 用户单词练习进度表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_word_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        word_entry_id INT NOT NULL,
        status ENUM('pending','review','mastered') NOT NULL DEFAULT 'pending',
        is_favorite TINYINT(1) NOT NULL DEFAULT 0,
        wrong_count INT NOT NULL DEFAULT 0,
        last_practice_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_word (user_id, word_entry_id),
        KEY idx_user_book (user_id, book_id),
        KEY idx_book_word (book_id, word_entry_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 用户单词书学习位置表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_word_book_state (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        last_word_entry_id INT NULL,
        last_word_order_index INT NULL,
        last_practice_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_book (user_id, book_id),
        KEY idx_user_book_state (user_id, book_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 单词书收藏表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS word_book_favorites (
        id INT PRIMARY KEY AUTO_INCREMENT,
        book_id INT NOT NULL,
        entry_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_word_book_favorite (book_id, entry_id),
        INDEX idx_word_book_fav_book (book_id),
        FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE,
        FOREIGN KEY (entry_id) REFERENCES word_book_entries(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 单词书错题表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS word_book_wrong_entries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        book_id INT NOT NULL,
        entry_id INT NOT NULL,
        wrong_times INT DEFAULT 1,
        last_wrong_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_word_book_wrong (book_id, entry_id),
        INDEX idx_word_book_wrong_book (book_id),
        FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE,
        FOREIGN KEY (entry_id) REFERENCES word_book_entries(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 单词书进度表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS word_book_progress (
        book_id INT PRIMARY KEY,
        total_words INT DEFAULT 0,
        completed_count INT DEFAULT 0,
        current_index INT DEFAULT 0,
        current_entry_id INT NULL,
        progress_percentage DECIMAL(5,2) DEFAULT 0,
        notes VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE,
        FOREIGN KEY (current_entry_id) REFERENCES word_book_entries(id) ON DELETE SET NULL
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
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
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
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
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
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
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
 * 迁移题库表 - 添加科目字段
 */
const migrateQuestionBanksSubject = async (connection: mysql.PoolConnection): Promise<void> => {
  try {
    if (!(await columnExists(connection, 'question_banks', 'subject_id'))) {
      await connection.execute(`
        ALTER TABLE question_banks
        ADD COLUMN subject_id INT NULL COMMENT '科目ID'
        AFTER description
      `);
    }

    if (!(await indexExists(connection, 'question_banks', 'idx_subject_id'))) {
      await connection.execute(`
        ALTER TABLE question_banks
        ADD INDEX idx_subject_id (subject_id)
      `);
    }

    if (!(await foreignKeyExists(connection, 'question_banks', 'fk_question_banks_subject'))) {
      await connection.execute(`
        ALTER TABLE question_banks
        ADD CONSTRAINT fk_question_banks_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
      `);
    }
  } catch (error) {
    logger.error('题库表科目字段迁移失败:', error);
  }
};

/**
 * 迁移题库章节表 - 添加科目章节映射
 */
const migrateQuestionChaptersTable = async (connection: mysql.PoolConnection): Promise<void> => {
  try {
    if (!(await columnExists(connection, 'question_chapters', 'subject_chapter_id'))) {
      await connection.execute(`
        ALTER TABLE question_chapters
        ADD COLUMN subject_chapter_id INT NULL COMMENT '关联的科目章节ID'
        AFTER bank_id
      `);
    }

    if (!(await indexExists(connection, 'question_chapters', 'idx_subject_chapter'))) {
      await connection.execute(`
        ALTER TABLE question_chapters
        ADD INDEX idx_subject_chapter (subject_chapter_id)
      `);
    }

    if (!(await foreignKeyExists(connection, 'question_chapters', 'fk_chapters_subject_chapter'))) {
      await connection.execute(`
        ALTER TABLE question_chapters
        ADD CONSTRAINT fk_chapters_subject_chapter
        FOREIGN KEY (subject_chapter_id) REFERENCES subject_chapters(id) ON DELETE SET NULL
      `);
    }
  } catch (error) {
    logger.error('题库章节表迁移失败:', error);
  }
};

/**
 * 迁移题目表 - 添加随机键
 */
const migrateQuestionsTable = async (connection: mysql.PoolConnection): Promise<void> => {
  try {
    if (!(await columnExists(connection, 'questions', 'random_key'))) {
      await connection.execute(`
        ALTER TABLE questions
        ADD COLUMN random_key INT NULL COMMENT '随机键'
        AFTER tags
      `);
    }

    if (!(await indexExists(connection, 'questions', 'idx_random_key'))) {
      await connection.execute(`
        ALTER TABLE questions
        ADD INDEX idx_random_key (random_key)
      `);
    }
  } catch (error) {
    logger.error('题目表迁移失败:', error);
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
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
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
 * 添加解析JSON文件路径字段
 */
const addParsedJsonPathField = async (connection: mysql.PoolConnection): Promise<void> => {
  try {
    const fieldCheck = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
        AND TABLE_NAME = 'question_banks' 
        AND COLUMN_NAME = 'parsed_json_path'
    `);

    if ((fieldCheck[0] as any[]).length === 0) {
      await connection.execute(`
        ALTER TABLE question_banks 
        ADD COLUMN parsed_json_path VARCHAR(500) NULL COMMENT '解析后的JSON文件路径' 
        AFTER file_path
      `);
      logger.info('已添加 parsed_json_path 字段');
    } else {
      logger.info('parsed_json_path 字段已存在，跳过');
    }
  } catch (error) {
    logger.error('添加parsed_json_path字段失败:', error);
    // 不抛出错误，让应用继续运行
  }
};

const columnExists = async (
  connection: mysql.PoolConnection,
  tableName: string,
  columnName: string
): Promise<boolean> => {
  const result = await connection.execute(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `,
    [dbConfig.database, tableName, columnName]
  );
  return (result[0] as any[]).length > 0;
};

const indexExists = async (
  connection: mysql.PoolConnection,
  tableName: string,
  indexName: string
): Promise<boolean> => {
  const result = await connection.execute(
    `
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    `,
    [dbConfig.database, tableName, indexName]
  );
  return (result[0] as any[]).length > 0;
};

const foreignKeyExists = async (
  connection: mysql.PoolConnection,
  tableName: string,
  constraintName: string
): Promise<boolean> => {
  const result = await connection.execute(
    `
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = ?
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?
    `,
    [dbConfig.database, tableName, constraintName]
  );
  return (result[0] as any[]).length > 0;
};

const dropIndexIfExists = async (
  connection: mysql.PoolConnection,
  tableName: string,
  indexName: string
): Promise<void> => {
  if (await indexExists(connection, tableName, indexName)) {
    await connection.execute(`ALTER TABLE ${tableName} DROP INDEX ${indexName}`);
  }
};

/**
 * 迁移用户学习进度表 - 兼容章节/整卷练习字段
 */
const migrateUserStudyProgressTable = async (
  connection: mysql.PoolConnection
): Promise<void> => {
  try {
    if (!(await columnExists(connection, 'user_study_progress', 'practice_mode'))) {
      await connection.execute(`
        ALTER TABLE user_study_progress
        ADD COLUMN practice_mode ENUM('chapter', 'full') NOT NULL DEFAULT 'chapter'
        COMMENT '练习模式：chapter=章节练习, full=整卷练习'
        AFTER bank_id
      `);
      await connection.execute(`
        ALTER TABLE user_study_progress
        ADD INDEX idx_practice_mode (practice_mode)
      `);
    }

    if (!(await columnExists(connection, 'user_study_progress', 'chapter_id'))) {
      await connection.execute(`
        ALTER TABLE user_study_progress
        ADD COLUMN chapter_id INT NULL COMMENT '章节ID'
        AFTER practice_mode
      `);
      await connection.execute(`
        ALTER TABLE user_study_progress
        ADD INDEX idx_chapter_id (chapter_id)
      `);
    }

    if (!(await columnExists(connection, 'user_study_progress', 'current_chapter_id'))) {
      await connection.execute(`
        ALTER TABLE user_study_progress
        ADD COLUMN current_chapter_id INT NULL COMMENT '当前所在章节ID（整卷练习时使用）'
        AFTER chapter_id
      `);
      await connection.execute(`
        ALTER TABLE user_study_progress
        ADD INDEX idx_current_chapter (current_chapter_id)
      `);
    }

    if (!(await columnExists(connection, 'user_study_progress', 'parse_result_id'))) {
      await connection.execute(`
        ALTER TABLE user_study_progress
        ADD COLUMN parse_result_id INT NULL COMMENT '解析结果ID'
        AFTER current_chapter_id
      `);
    }

    if (!(await columnExists(connection, 'user_study_progress', 'current_question_number'))) {
      await connection.execute(`
        ALTER TABLE user_study_progress
        ADD COLUMN current_question_number INT NULL COMMENT '当前题号(从1开始)'
        AFTER current_question_index
      `);
    }

    await dropIndexIfExists(connection, 'user_study_progress', 'uk_user_bank');
    await dropIndexIfExists(connection, 'user_study_progress', 'uk_user_bank_chapter');

    if (!(await indexExists(connection, 'user_study_progress', 'uk_user_bank_mode_chapter'))) {
      await connection.execute(`
        ALTER TABLE user_study_progress
        ADD UNIQUE KEY uk_user_bank_mode_chapter (user_id, bank_id, practice_mode, chapter_id)
      `);
    }
  } catch (error) {
    logger.error('用户学习进度表迁移失败:', error);
  }
};

/**
 * 迁移用户表 - 添加username和password字段
 */
const migrateUserTable = async (connection: mysql.PoolConnection): Promise<void> => {
  try {
    // openid 已经是 UNIQUE，这个普通索引属于重复建设；老库可能带着它，先清一下避免把 key 数堆到 64 上限
    await dropIndexIfExists(connection, 'users', 'idx_openid');

    // 检查username字段是否存在
    const usernameColumnCheck = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'username'
    `);

    if ((usernameColumnCheck[0] as any[]).length === 0) {
      // 添加 username 字段（优先加 UNIQUE；如果命中 MySQL 64 keys 上限，则降级为普通字段）
      try {
        await connection.execute(`
          ALTER TABLE users 
          ADD COLUMN username VARCHAR(50) UNIQUE NULL COMMENT '用户名，微信用户为空' 
          AFTER unionid
        `);
        logger.info('已添加 username 字段');
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (err?.code === 'ER_TOO_MANY_KEYS' || msg.includes('Too many keys')) {
          logger.warn('users 表索引数量已达上限，username UNIQUE 创建失败，将降级为非唯一字段（建议后续清理冗余索引）');
          await connection.execute(`
            ALTER TABLE users 
            ADD COLUMN username VARCHAR(50) NULL COMMENT '用户名，微信用户为空' 
            AFTER unionid
          `);
          logger.info('已添加 username 字段（非唯一）');
        } else {
          throw err;
        }
      }
    }

    // 检查password字段是否存在
    const passwordColumnCheck = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
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

    // Ensure openid is nullable without re-adding indexes on every startup
    const openidNullableCheck = await connection.execute(`
      SELECT IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${dbConfig.database}'
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'openid'
    `);

    const openidIsNullable = (openidNullableCheck[0] as any[]).some(
      (row) => row.IS_NULLABLE === 'YES'
    );

    if (!openidIsNullable) {
      await connection.execute(`
        ALTER TABLE users 
        MODIFY COLUMN openid VARCHAR(100) NULL COMMENT 'WeChat openid, NULL for standard users'
      `);

      logger.info('Updated users.openid to allow NULL');
    }
  } catch (error) {
    logger.error('用户表迁移失败:', error);
    // 不抛出错误，让应用继续运行
  }
};

/**
 * 执行SQL查询
 */
export const query = async (sql: string, params?: any[]): Promise<any> => {
  const executeOnce = async (): Promise<any> => {
    const connection = await getPool().getConnection();
    try {
      const [results] = await connection.execute(sql, params || []);
      return results;
    } finally {
      connection.release();
    }
  };

  try {
    return await executeOnce();
  } catch (error: any) {
    const code = error?.code;
    const shouldRetry =
      code === 'PROTOCOL_CONNECTION_LOST' ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT';

    if (shouldRetry) {
      logger.warn('数据库连接异常，重试一次', {
        code,
        message: error?.message
      });
      return await executeOnce();
    }

    throw error;
  }
};;

/**
 * 关闭数据库连接
 */
export const closeDB = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    logger.info('数据库连接已关闭');
  }
};
