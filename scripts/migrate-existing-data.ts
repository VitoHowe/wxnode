/**
 * 数据迁移脚本：将 parse_results 表中的数据迁移到 question_chapters 和 questions 表
 */
import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function migrateData() {
  const pool = getPool();
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    logger.info('开始迁移已有的解析数据...\n');
    
    // 获取所有 parse_results 记录
    const [parseResults]: any = await connection.query(
      `SELECT pr.*, qb.name as bank_name 
       FROM parse_results pr
       LEFT JOIN question_banks qb ON pr.bank_id = qb.id
       ORDER BY pr.id ASC`
    );
    
    logger.info(`找到 ${parseResults.length} 条解析记录`);
    
    for (const result of parseResults) {
      const bankId = result.bank_id;
      const bankName = result.bank_name || `题库${bankId}`;
      
      logger.info(`\n处理题库: ${bankName} (ID: ${bankId})`);
      
      // 检查该题库是否已迁移
      const [existingChapters]: any = await connection.query(
        'SELECT COUNT(*) as count FROM question_chapters WHERE bank_id = ?',
        [bankId]
      );
      
      if (existingChapters[0].count > 0) {
        logger.info(`  ⏭️  已迁移，跳过 (现有 ${existingChapters[0].count} 个章节)`);
        continue;
      }
      
      // 解析 questions JSON
      let questions: any[];
      try {
        questions = JSON.parse(result.questions);
      } catch (error) {
        logger.error(`  ❌ JSON解析失败，跳过`);
        continue;
      }
      
      logger.info(`  📝 共 ${questions.length} 道题目`);
      
      // 按 tags[0] 分组
      const chapterMap = new Map<string, any[]>();
      
      questions.forEach((question: any) => {
        let chapterName = '未分类';
        
        if (question.tags && Array.isArray(question.tags) && question.tags.length > 0) {
          chapterName = question.tags[0];
        }
        
        if (!chapterMap.has(chapterName)) {
          chapterMap.set(chapterName, []);
        }
        
        chapterMap.get(chapterName)!.push(question);
      });
      
      logger.info(`  📂 检测到 ${chapterMap.size} 个章节`);
      
      // 按章节排序
      const sortedChapters = Array.from(chapterMap.entries()).sort((a, b) => {
        const aMatch = a[0].match(/\d+/);
        const bMatch = b[0].match(/\d+/);
        if (aMatch && bMatch) {
          return parseInt(aMatch[0]) - parseInt(bMatch[0]);
        }
        return a[0].localeCompare(b[0]);
      });
      
      // 创建章节和题目
      let chapterOrder = 1;
      let totalQuestionsCreated = 0;
      
      for (const [chapterName, chapterQuestions] of sortedChapters) {
        // 创建章节
        const [chapterResult]: any = await connection.query(
          `INSERT INTO question_chapters (bank_id, chapter_name, chapter_order, question_count)
           VALUES (?, ?, ?, ?)`,
          [bankId, chapterName, chapterOrder, chapterQuestions.length]
        );
        
        const chapterId = chapterResult.insertId;
        
        logger.info(`    ✅ 章节 ${chapterOrder}: ${chapterName} (${chapterQuestions.length} 题)`);
        
        // 批量插入题目
        for (const question of chapterQuestions) {
          await connection.query(
            `INSERT INTO questions (
              bank_id, chapter_id, question_no, type, content,
              options, answer, explanation, difficulty, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              bankId,
              chapterId,
              question.question_no || question.question || null,
              question.type,
              question.content,
              question.options ? JSON.stringify(question.options) : null,
              question.answer,
              question.explanation || null,
              question.difficulty || 1,
              question.tags ? JSON.stringify(question.tags) : null
            ]
          );
        }
        
        totalQuestionsCreated += chapterQuestions.length;
        chapterOrder++;
      }
      
      logger.info(`  🎉 完成！共创建 ${chapterMap.size} 个章节，${totalQuestionsCreated} 道题目`);
    }
    
    logger.info('\n📊 迁移统计：');
    
    // 统计迁移结果
    const [chapterStats]: any = await connection.query(
      `SELECT COUNT(*) as total_chapters, SUM(question_count) as total_questions
       FROM question_chapters`
    );
    
    logger.info(`  - 总章节数: ${chapterStats[0].total_chapters}`);
    logger.info(`  - 总题目数: ${chapterStats[0].total_questions}`);
    
    // 各题库统计
    const [bankStats]: any = await connection.query(
      `SELECT 
         qb.id,
         qb.name,
         COUNT(DISTINCT qc.id) as chapters,
         COUNT(q.id) as questions
       FROM question_banks qb
       LEFT JOIN question_chapters qc ON qb.id = qc.bank_id
       LEFT JOIN questions q ON qb.id = q.bank_id
       WHERE qc.id IS NOT NULL
       GROUP BY qb.id, qb.name
       ORDER BY qb.id`
    );
    
    logger.info('\n各题库详情:');
    bankStats.forEach((stat: any) => {
      logger.info(`  - ${stat.name}: ${stat.chapters} 章节, ${stat.questions} 题目`);
    });
    
    logger.info('\n✅ 数据迁移完成！');
    
  } catch (error: any) {
    logger.error('迁移失败:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

migrateData()
  .then(() => {
    logger.info('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('脚本执行失败:', error);
    process.exit(1);
  });
