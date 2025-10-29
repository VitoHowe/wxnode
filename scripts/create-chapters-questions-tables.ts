/**
 * 迁移脚本：创建 question_chapters 和 questions 表
 */
import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';
import fs from 'fs';
import path from 'path';

async function migrate() {
  const pool = getPool();
  let connection;
  try {
    connection = await pool.getConnection();
    
    logger.info('开始创建章节和题目表...');
    
    // 检查表是否已存在
    const [tables]: any = await connection.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME IN ('question_chapters', 'questions')`
    );
    
    const existingTables = tables.map((t: any) => t.TABLE_NAME);
    
    if (existingTables.length === 2) {
      logger.info('✅ 表已存在，无需创建');
      logger.info('现有表：', existingTables);
      return;
    }
    
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, '../migrations/create_chapters_and_questions_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
    
    // 移除注释行
    const lines = sqlContent.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('--');
    });
    
    const cleanContent = lines.join('\n');
    
    // 分割SQL语句
    const allStatements = cleanContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    // 过滤出CREATE TABLE语句
    const createStatements = allStatements.filter(s => 
      s.toUpperCase().includes('CREATE TABLE')
    );
    
    logger.info(`找到 ${createStatements.length} 个CREATE TABLE语句`);
    
    // 执行CREATE TABLE语句
    for (const statement of createStatements) {
      const tableName = statement.match(/CREATE TABLE.*?`(\w+)`/)?.[1];
      if (tableName) {
        try {
          logger.info(`正在创建表: ${tableName}...`);
          await connection.query(statement);
          logger.info(`✅ 表 ${tableName} 创建成功`);
        } catch (createError: any) {
          logger.error(`❌ 创建表 ${tableName} 失败:`, createError.message);
          logger.error('SQL语句:', statement.substring(0, 200) + '...');
          throw createError;
        }
      }
    }
    
    logger.info('🎉 迁移完成！');
    
    // 验证表结构
    const [newTables]: any = await connection.query(
      `SELECT TABLE_NAME, TABLE_COMMENT 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME IN ('question_chapters', 'questions')`
    );
    
    logger.info('创建的表：');
    newTables.forEach((table: any) => {
      logger.info(`  - ${table.TABLE_NAME}: ${table.TABLE_COMMENT}`);
    });
    
    // 检查 question_chapters 表结构
    const [chapterColumns]: any = await connection.query(
      `DESCRIBE question_chapters`
    );
    logger.info('\nquestion_chapters 表结构：');
    logger.info(chapterColumns);
    
    // 检查 questions 表结构
    const [questionColumns]: any = await connection.query(
      `DESCRIBE questions`
    );
    logger.info('\nquestions 表结构：');
    logger.info(questionColumns);
    
  } catch (error: any) {
    logger.error('迁移失败：', error);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      logger.info('表已存在，跳过创建');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

// 执行迁移
migrate()
  .then(() => {
    logger.info('迁移脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('迁移脚本执行失败：', error);
    process.exit(1);
  });
