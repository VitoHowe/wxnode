/**
 * 清理数据库备份表和废弃表
 */
import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function cleanupDatabase() {
  const pool = getPool();
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    logger.info('🧹 开始清理数据库...\n');
    
    // 1. 列出所有表
    const [allTables]: any = await connection.query(
      `SELECT TABLE_NAME, TABLE_COMMENT, TABLE_ROWS 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       ORDER BY TABLE_NAME`
    );
    
    logger.info(`数据库中共有 ${allTables.length} 个表\n`);
    
    // 2. 识别备份表和废弃表
    const backupTables: string[] = [];
    const deprecatedTables: string[] = [];
    const coreTables: string[] = [];
    
    allTables.forEach((table: any) => {
      const tableName = table.TABLE_NAME;
      
      if (tableName.includes('_backup_') || tableName.endsWith('_backup')) {
        backupTables.push(tableName);
      } else if (tableName === 'parse_results' || tableName === 'model_configs_backup_1760065606252') {
        deprecatedTables.push(tableName);
      } else {
        coreTables.push(tableName);
      }
    });
    
    // 3. 显示分析结果
    logger.info('📊 表分类结果:');
    logger.info(`\n核心表 (${coreTables.length} 个):`);
    coreTables.forEach(t => logger.info(`  ✅ ${t}`));
    
    if (backupTables.length > 0) {
      logger.info(`\n备份表 (${backupTables.length} 个):`);
      backupTables.forEach(t => {
        const info = allTables.find((tb: any) => tb.TABLE_NAME === t);
        logger.info(`  🗑️  ${t} (${info.TABLE_ROWS} 行)`);
      });
    }
    
    if (deprecatedTables.length > 0) {
      logger.info(`\n废弃表 (${deprecatedTables.length} 个):`);
      deprecatedTables.forEach(t => {
        const info = allTables.find((tb: any) => tb.TABLE_NAME === t);
        logger.info(`  ⚠️  ${t} (${info.TABLE_ROWS} 行) - ${info.TABLE_COMMENT || '无注释'}`);
      });
    }
    
    // 4. 询问是否删除（通过命令行参数）
    const args = process.argv.slice(2);
    const shouldDelete = args.includes('--confirm') || args.includes('confirm');
    
    logger.info(`\n参数: ${args.join(', ')}`); // 调试用
    
    if (!shouldDelete) {
      logger.info('\n💡 提示：');
      logger.info('  要删除这些表，请运行: npx ts-node -r tsconfig-paths/register scripts/cleanup-database.ts --confirm');
      logger.info('  或者: npm run cleanup-db confirm');
      return;
    }
    
    // 5. 执行删除
    logger.info('\n🗑️  开始删除...\n');
    
    const tablesToDelete = [...backupTables, ...deprecatedTables];
    
    for (const tableName of tablesToDelete) {
      try {
        logger.info(`  删除表: ${tableName}`);
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
        logger.info(`  ✅ ${tableName} 已删除`);
      } catch (error: any) {
        logger.error(`  ❌ 删除 ${tableName} 失败: ${error.message}`);
      }
    }
    
    logger.info(`\n✅ 清理完成！删除了 ${tablesToDelete.length} 个表`);
    
    // 6. 显示最终结果
    const [finalTables]: any = await connection.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`
    );
    
    logger.info(`\n📊 清理后剩余表数: ${finalTables[0].count}`);
    
  } catch (error: any) {
    logger.error('清理失败:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

cleanupDatabase()
  .then(() => {
    logger.info('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('脚本执行失败:', error);
    process.exit(1);
  });
