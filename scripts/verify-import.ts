/**
 * 验证JSON导入结果
 * 用法: npm run verify-import [bank_id]
 */
import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function verifyImport(bankId?: number) {
  const pool = getPool();
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    logger.info('📊 验证导入结果...\n');
    
    // 如果没有指定bankId，获取最新的
    if (!bankId) {
      const [latestBank]: any = await connection.query(
        'SELECT id, name FROM question_banks ORDER BY id DESC LIMIT 1'
      );
      
      if (latestBank.length === 0) {
        logger.warn('没有找到任何题库');
        return;
      }
      
      bankId = latestBank[0].id;
      logger.info(`使用最新题库: ${latestBank[0].name} (ID: ${bankId})\n`);
    }
    
    // 1. 题库基本信息
    const [bank]: any = await connection.query(
      'SELECT * FROM question_banks WHERE id = ?',
      [bankId]
    );
    
    if (bank.length === 0) {
      logger.error(`题库 ID ${bankId} 不存在`);
      return;
    }
    
    const bankInfo = bank[0];
    logger.info('📚 题库信息:');
    logger.info(`  名称: ${bankInfo.name}`);
    logger.info(`  描述: ${bankInfo.description}`);
    logger.info(`  状态: ${bankInfo.parse_status}`);
    logger.info(`  总题数: ${bankInfo.total_questions}`);
    logger.info(`  创建时间: ${bankInfo.created_at}`);
    
    // 2. 章节统计
    const [chapters]: any = await connection.query(
      `SELECT id, chapter_name, chapter_order, question_count 
       FROM question_chapters 
       WHERE bank_id = ? 
       ORDER BY chapter_order ASC`,
      [bankId]
    );
    
    logger.info(`\n📂 章节列表 (共 ${chapters.length} 个):`);
    
    let totalQuestions = 0;
    chapters.forEach((ch: any) => {
      logger.info(`  ${ch.chapter_order}. ${ch.chapter_name} - ${ch.question_count} 题`);
      totalQuestions += ch.question_count;
    });
    
    logger.info(`\n  ✅ 章节题目总计: ${totalQuestions}`);
    
    // 3. 题型分布
    const [typeStats]: any = await connection.query(
      `SELECT 
         type,
         COUNT(*) as count,
         ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM questions WHERE bank_id = ?), 2) as percentage
       FROM questions 
       WHERE bank_id = ?
       GROUP BY type
       ORDER BY count DESC`,
      [bankId, bankId]
    );
    
    logger.info('\n📝 题型分布:');
    typeStats.forEach((stat: any) => {
      const typeName = {
        single: '单选题',
        multiple: '多选题',
        judge: '判断题',
        fill: '填空题',
        essay: '简答题'
      }[stat.type] || stat.type;
      
      logger.info(`  ${typeName}: ${stat.count} 题 (${stat.percentage}%)`);
    });
    
    // 4. 难度分布
    const [diffStats]: any = await connection.query(
      `SELECT 
         difficulty,
         COUNT(*) as count,
         ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM questions WHERE bank_id = ?), 2) as percentage
       FROM questions 
       WHERE bank_id = ?
       GROUP BY difficulty
       ORDER BY difficulty ASC`,
      [bankId, bankId]
    );
    
    logger.info('\n⭐ 难度分布:');
    diffStats.forEach((stat: any) => {
      const diffName = {
        1: '简单',
        2: '中等',
        3: '困难'
      }[stat.difficulty] || `难度${stat.difficulty}`;
      
      logger.info(`  ${diffName}: ${stat.count} 题 (${stat.percentage}%)`);
    });
    
    // 5. 示例题目
    const [sampleQuestions]: any = await connection.query(
      `SELECT 
         q.id,
         q.question_no,
         q.type,
         LEFT(q.content, 50) as content_preview,
         qc.chapter_name
       FROM questions q
       LEFT JOIN question_chapters qc ON q.chapter_id = qc.id
       WHERE q.bank_id = ?
       ORDER BY q.id ASC
       LIMIT 3`,
      [bankId]
    );
    
    logger.info('\n📄 示例题目 (前3题):');
    sampleQuestions.forEach((q: any, index: number) => {
      logger.info(`  ${index + 1}. [${q.type}] ${q.content_preview}...`);
      logger.info(`     章节: ${q.chapter_name}`);
    });
    
    // 6. 数据完整性检查
    logger.info('\n🔍 数据完整性检查:');
    
    const [orphanQuestions]: any = await connection.query(
      `SELECT COUNT(*) as count 
       FROM questions q
       LEFT JOIN question_chapters qc ON q.chapter_id = qc.id
       WHERE q.bank_id = ? AND qc.id IS NULL`,
      [bankId]
    );
    
    if (orphanQuestions[0].count > 0) {
      logger.warn(`  ⚠️  发现 ${orphanQuestions[0].count} 道题目没有关联章节`);
    } else {
      logger.info('  ✅ 所有题目都已正确关联章节');
    }
    
    // 检查parse_results备份
    const [backupCheck]: any = await connection.query(
      'SELECT id, total_questions FROM parse_results WHERE bank_id = ?',
      [bankId]
    );
    
    if (backupCheck.length > 0) {
      logger.info(`  ✅ 原始JSON已备份 (parse_results表)`);
    } else {
      logger.info('  ℹ️  未找到JSON备份（可能因为文件过大）');
    }
    
    logger.info('\n✅ 验证完成！');
    
  } catch (error: any) {
    logger.error('验证失败:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

// 从命令行参数获取bankId
const bankId = process.argv[2] ? parseInt(process.argv[2]) : undefined;

verifyImport(bankId)
  .then(() => {
    logger.info('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('脚本执行失败:', error);
    process.exit(1);
  });
