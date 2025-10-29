/**
 * 检查数据库表状态
 */
import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function checkTables() {
  const pool = getPool();
  let connection;
  try {
    connection = await pool.getConnection();
    
    logger.info('检查数据库表...\n');
    
    // 获取所有表
    const [tables]: any = await connection.query(
      `SELECT TABLE_NAME, TABLE_COMMENT 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       ORDER BY TABLE_NAME`
    );
    
    logger.info(`数据库中共有 ${tables.length} 个表：`);
    tables.forEach((table: any) => {
      logger.info(`  - ${table.TABLE_NAME}${table.TABLE_COMMENT ? ': ' + table.TABLE_COMMENT : ''}`);
    });
    
    // 检查关键表
    const requiredTables = ['question_banks', 'question_chapters', 'questions', 'parse_results'];
    logger.info('\n关键表状态检查：');
    
    for (const tableName of requiredTables) {
      const exists = tables.find((t: any) => t.TABLE_NAME === tableName);
      if (exists) {
        const [count]: any = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        logger.info(`  ✅ ${tableName} - 存在 (${count[0].count} 条记录)`);
      } else {
        logger.info(`  ❌ ${tableName} - 不存在`);
      }
    }
    
  } catch (error: any) {
    logger.error('检查失败：', error.message);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

checkTables()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('执行失败：', error);
    process.exit(1);
  });
