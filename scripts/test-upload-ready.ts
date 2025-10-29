/**
 * 测试系统是否准备好接收JSON上传
 */
import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function testUploadReady() {
  const pool = getPool();
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    logger.info('🔍 检查系统状态...\n');
    
    // 1. 检查必需的表
    const requiredTables = ['question_banks', 'question_chapters', 'questions', 'parse_results'];
    logger.info('1️⃣ 检查数据库表:');
    
    for (const tableName of requiredTables) {
      const [tables]: any = await connection.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      );
      
      if (tables.length > 0) {
        logger.info(`  ✅ ${tableName} - 存在`);
      } else {
        logger.error(`  ❌ ${tableName} - 不存在`);
        throw new Error(`缺少表: ${tableName}`);
      }
    }
    
    // 2. 检查 max_allowed_packet 设置
    logger.info('\n2️⃣ 检查数据库配置:');
    const [packetSize]: any = await connection.query(
      `SHOW VARIABLES LIKE 'max_allowed_packet'`
    );
    
    const maxPacket = parseInt(packetSize[0].Value);
    const maxPacketMB = (maxPacket / (1024 * 1024)).toFixed(2);
    
    logger.info(`  max_allowed_packet: ${maxPacketMB} MB`);
    
    if (maxPacket >= 16 * 1024 * 1024) {
      logger.info('  ✅ 配置足够处理大文件');
    } else {
      logger.warn(`  ⚠️  配置可能不足 (建议 >= 16MB)`);
    }
    
    // 3. 检查外键约束
    logger.info('\n3️⃣ 检查表结构:');
    
    const [constraints]: any = await connection.query(
      `SELECT 
         TABLE_NAME,
         CONSTRAINT_NAME,
         REFERENCED_TABLE_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN ('question_chapters', 'questions')
         AND REFERENCED_TABLE_NAME IS NOT NULL`
    );
    
    logger.info('  外键约束:');
    constraints.forEach((c: any) => {
      logger.info(`    - ${c.TABLE_NAME}.${c.CONSTRAINT_NAME} -> ${c.REFERENCED_TABLE_NAME}`);
    });
    
    // 4. 测试 chapterService 和 questionService
    logger.info('\n4️⃣ 检查服务依赖:');
    
    try {
      const { chapterService } = await import('../src/services/chapterService');
      const { questionService } = await import('../src/services/questionService');
      logger.info('  ✅ chapterService - 已加载');
      logger.info('  ✅ questionService - 已加载');
    } catch (importError: any) {
      logger.error('  ❌ 服务加载失败:', importError.message);
      throw importError;
    }
    
    // 5. 检查现有数据
    logger.info('\n5️⃣ 当前数据统计:');
    
    const [bankCount]: any = await connection.query(
      'SELECT COUNT(*) as count FROM question_banks'
    );
    logger.info(`  题库数: ${bankCount[0].count}`);
    
    const [chapterCount]: any = await connection.query(
      'SELECT COUNT(*) as count FROM question_chapters'
    );
    logger.info(`  章节数: ${chapterCount[0].count}`);
    
    const [questionCount]: any = await connection.query(
      'SELECT COUNT(*) as count FROM questions'
    );
    logger.info(`  题目数: ${questionCount[0].count}`);
    
    logger.info('\n✅ 系统准备就绪！可以上传JSON文件了！');
    logger.info('\n📝 上传端点: POST /api/files/upload-json');
    logger.info('📄 支持的文件: .json 格式的题库文件');
    logger.info('📊 预期流程:');
    logger.info('   1. 验证JSON格式');
    logger.info('   2. 创建题库记录');
    logger.info('   3. 按 tags[0] 拆分章节');
    logger.info('   4. 保存题目到 questions 表');
    logger.info('   5. 更新章节题目数量');
    logger.info('   6. 保存备份到 parse_results (如果 < 16MB)');
    
  } catch (error: any) {
    logger.error('\n❌ 系统未就绪:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

testUploadReady()
  .then(() => {
    logger.info('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n检查失败:', error);
    process.exit(1);
  });
