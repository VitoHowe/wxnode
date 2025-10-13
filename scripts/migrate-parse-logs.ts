/**
 * 迁移脚本：为 parse_logs 表添加 request_data 和 response_data 字段
 */
import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function migrate() {
  const pool = getPool();
  let connection;
  try {
    connection = await pool.getConnection();
    
    logger.info('开始迁移 parse_logs 表...');
    
    // 检查字段是否已存在
    const [columns]: any = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'parse_logs' 
         AND COLUMN_NAME IN ('request_data', 'response_data')`
    );
    
    if (columns.length === 2) {
      logger.info('✅ 字段已存在，无需迁移');
      return;
    }
    
    // 添加 request_data 字段
    if (!columns.find((col: any) => col.COLUMN_NAME === 'request_data')) {
      logger.info('添加 request_data 字段...');
      await connection.query(
        `ALTER TABLE parse_logs 
         ADD COLUMN request_data JSON NULL COMMENT '请求数据（fileContentResult、parts等）' 
         AFTER processing_time`
      );
      logger.info('✅ request_data 字段添加成功');
    }
    
    // 添加 response_data 字段
    if (!columns.find((col: any) => col.COLUMN_NAME === 'response_data')) {
      logger.info('添加 response_data 字段...');
      await connection.query(
        `ALTER TABLE parse_logs 
         ADD COLUMN response_data JSON NULL COMMENT 'API响应数据' 
         AFTER request_data`
      );
      logger.info('✅ response_data 字段添加成功');
    }
    
    logger.info('🎉 迁移完成！');
    
    // 验证
    const [newColumns]: any = await connection.query(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'parse_logs' 
         AND COLUMN_NAME IN ('request_data', 'response_data')`
    );
    
    logger.info('验证结果：', newColumns);
    
  } catch (error) {
    logger.error('迁移失败：', error);
    throw error;
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
