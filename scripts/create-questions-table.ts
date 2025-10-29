/**
 * 迁移脚本：只创建 questions 表
 */
import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function createQuestionsTable() {
  const pool = getPool();
  let connection;
  try {
    connection = await pool.getConnection();
    
    logger.info('开始创建 questions 表...');
    
    // 检查表是否已存在
    const [tables]: any = await connection.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'questions'`
    );
    
    if (tables.length > 0) {
      logger.info('✅ questions 表已存在，无需创建');
      return;
    }
    
    // 创建 questions 表
    const createTableSQL = `
      CREATE TABLE \`questions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '主键',
        \`bank_id\` INT NOT NULL COMMENT '关联的题库ID',
        \`chapter_id\` INT NOT NULL COMMENT '关联的章节ID',
        \`question_no\` VARCHAR(50) DEFAULT NULL COMMENT '题号',
        \`type\` ENUM('single', 'multiple', 'judge', 'fill', 'essay') NOT NULL COMMENT '题型',
        \`content\` TEXT NOT NULL COMMENT '题目内容',
        \`options\` JSON DEFAULT NULL COMMENT '选项（JSON数组）',
        \`answer\` TEXT NOT NULL COMMENT '答案',
        \`explanation\` TEXT DEFAULT NULL COMMENT '解析',
        \`difficulty\` INT DEFAULT 1 COMMENT '难度：1-简单 2-中等 3-困难',
        \`tags\` JSON DEFAULT NULL COMMENT '标签（JSON数组）',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        INDEX \`idx_bank\` (\`bank_id\`),
        INDEX \`idx_chapter\` (\`chapter_id\`),
        INDEX \`idx_type\` (\`type\`),
        INDEX \`idx_difficulty\` (\`difficulty\`),
        INDEX \`idx_created_at\` (\`created_at\`),
        CONSTRAINT \`fk_questions_bank_id_v3\` FOREIGN KEY (\`bank_id\`) 
          REFERENCES \`question_banks\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_questions_chapter_id_v3\` FOREIGN KEY (\`chapter_id\`) 
          REFERENCES \`question_chapters\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='题目表'
    `;
    
    logger.info('正在执行 CREATE TABLE questions...');
    
    try {
      await connection.query(createTableSQL);
      logger.info('✅ questions 表创建成功！');
    } catch (error: any) {
      logger.error('❌ 创建失败:', error.message);
      logger.error('错误代码:', error.code);
      logger.error('SQL状态:', error.sqlState);
      logger.error('完整错误:', error);
      throw error;
    }
    
    // 验证表结构
    const [columns]: any = await connection.query(`DESCRIBE questions`);
    logger.info('\nquestions 表结构:');
    columns.forEach((col: any) => {
      logger.info(`  - ${col.Field} (${col.Type})${col.Comment ? ' - ' + col.Comment : ''}`);
    });
    
    logger.info('\n🎉 完成！');
    
  } catch (error: any) {
    logger.error('执行失败:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

createQuestionsTable()
  .then(() => {
    logger.info('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('脚本执行失败:', error);
    process.exit(1);
  });
