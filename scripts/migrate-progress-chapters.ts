import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

async function migrateProgressChapters() {
  const connection = await getPool().getConnection();
  
  try {
    logger.info('开始迁移 user_study_progress 表，添加章节支持...');

    // 1. 添加新字段
    logger.info('Step 1: 添加 chapter_id 和 current_question_number 字段');
    try {
      await connection.execute(`
        ALTER TABLE user_study_progress
          ADD COLUMN chapter_id INT NULL COMMENT '章节ID' AFTER bank_id
      `);
      logger.info('✓ 添加 chapter_id 字段成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        logger.info('chapter_id 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE user_study_progress
          ADD COLUMN current_question_number INT NULL COMMENT '当前题号(从1开始)' AFTER current_question_index
      `);
      logger.info('✓ 添加 current_question_number 字段成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        logger.info('current_question_number 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 2. 添加章节索引
    logger.info('Step 2: 添加章节索引');
    try {
      await connection.execute(`
        ALTER TABLE user_study_progress
          ADD INDEX idx_chapter_id (chapter_id)
      `);
      logger.info('✓ 添加章节索引成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        logger.info('章节索引已存在，跳过');
      } else {
        throw error;
      }
    }

    // 3. 删除旧的唯一约束
    logger.info('Step 3: 删除旧的唯一约束 uk_user_bank');
    try {
      await connection.execute(`
        ALTER TABLE user_study_progress
          DROP INDEX uk_user_bank
      `);
      logger.info('✓ 删除旧唯一约束成功');
    } catch (error: any) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        logger.info('唯一约束 uk_user_bank 不存在，跳过');
      } else {
        throw error;
      }
    }

    // 4. 添加新的唯一约束
    logger.info('Step 4: 添加新的唯一约束 uk_user_bank_chapter');
    try {
      await connection.execute(`
        ALTER TABLE user_study_progress
          ADD UNIQUE KEY uk_user_bank_chapter (user_id, bank_id, chapter_id)
      `);
      logger.info('✓ 添加新唯一约束成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        logger.info('唯一约束 uk_user_bank_chapter 已存在，跳过');
      } else {
        throw error;
      }
    }

    // 5. 添加外键约束
    logger.info('Step 5: 添加外键约束 fk_progress_chapter');
    try {
      await connection.execute(`
        ALTER TABLE user_study_progress
          ADD CONSTRAINT fk_progress_chapter 
            FOREIGN KEY (chapter_id) 
            REFERENCES question_chapters(id) 
            ON DELETE CASCADE
      `);
      logger.info('✓ 添加外键约束成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEY' || error.code === 'ER_FK_DUP_NAME') {
        logger.info('外键约束已存在，跳过');
      } else {
        throw error;
      }
    }

    logger.info('✅ user_study_progress 表迁移完成！');
    logger.info('说明：');
    logger.info('  - 旧记录保留（chapter_id = NULL）表示题库级别进度');
    logger.info('  - 新记录必须指定 chapter_id，表示章节级别进度');
    logger.info('  - 推荐使用 current_question_number（题号）代替 current_question_index（索引）');

  } catch (error) {
    logger.error('迁移失败:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// 执行迁移
migrateProgressChapters()
  .then(() => {
    logger.info('迁移脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('迁移脚本执行失败:', error);
    process.exit(1);
  });
