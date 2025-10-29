/**
 * 检查 parse_results 表数据
 */
import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function checkParseResults() {
  const pool = getPool();
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const [results]: any = await connection.query(
      `SELECT 
         pr.id,
         pr.bank_id,
         qb.name as bank_name,
         pr.total_questions,
         LENGTH(pr.questions) as json_length,
         SUBSTRING(pr.questions, 1, 200) as json_preview
       FROM parse_results pr
       LEFT JOIN question_banks qb ON pr.bank_id = qb.id`
    );
    
    logger.info(`parse_results 表共有 ${results.length} 条记录:\n`);
    
    results.forEach((r: any) => {
      logger.info(`ID: ${r.id}, 题库: ${r.bank_name} (${r.bank_id})`);
      logger.info(`  题目数: ${r.total_questions}`);
      logger.info(`  JSON长度: ${r.json_length} 字节`);
      logger.info(`  JSON预览: ${r.json_preview}`);
      logger.info('');
    });
    
  } catch (error: any) {
    logger.error('检查失败:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

checkParseResults()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('执行失败:', error);
    process.exit(1);
  });
