import mysql from 'mysql2/promise';
import { logger } from '../src/utils/logger';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 为 user_study_progress 表添加 current_chapter_id 字段
 */
async function addCurrentChapterField() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'wxnode_db',
  });

  try {
    logger.info('开始添加 current_chapter_id 字段...');

    // 检查字段是否已存在
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'user_study_progress' 
      AND COLUMN_NAME = 'current_chapter_id'
    `, [process.env.DB_NAME || 'wxnode_db']);

    if ((columns as any[]).length > 0) {
      logger.info('current_chapter_id 字段已存在，跳过');
      return;
    }

    // 添加 current_chapter_id 字段
    await connection.execute(`
      ALTER TABLE user_study_progress
      ADD COLUMN current_chapter_id INT NULL 
      COMMENT '当前所在章节ID（整卷练习时使用）' 
      AFTER chapter_id
    `);

    logger.info('current_chapter_id 字段添加成功');

    // 添加索引
    await connection.execute(`
      ALTER TABLE user_study_progress
      ADD INDEX idx_current_chapter (current_chapter_id)
    `);

    logger.info('current_chapter_id 索引添加成功');

    // 验证
    const [result] = await connection.execute(`
      SELECT 
        practice_mode,
        chapter_id,
        current_chapter_id,
        COUNT(*) as count
      FROM user_study_progress
      GROUP BY practice_mode, chapter_id, current_chapter_id
    `);

    logger.info('当前数据分布:', result);
    logger.info('迁移完成！');

  } catch (error) {
    logger.error('迁移失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行迁移
addCurrentChapterField()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('脚本执行失败:', error);
    process.exit(1);
  });
