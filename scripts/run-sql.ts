/**
 * 执行SQL文件脚本
 * 用法: npm run sql <文件名>
 * 示例: npm run sql add_parsed_json_path
 */
import { getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';
import fs from 'fs';
import path from 'path';

async function runSqlFile(sqlFileName?: string) {
  const pool = getPool();
  let connection;
  
  try {
    // 如果没有指定文件，列出所有可用的SQL文件
    if (!sqlFileName) {
      listAvailableSqlFiles();
      return;
    }
    
    // 添加.sql扩展名（如果没有）
    if (!sqlFileName.endsWith('.sql')) {
      sqlFileName += '.sql';
    }
    
    const sqlFilePath = path.join(process.cwd(), 'sql', sqlFileName);
    
    // 检查文件是否存在
    if (!fs.existsSync(sqlFilePath)) {
      logger.error(`❌ SQL文件不存在: ${sqlFilePath}`);
      logger.info('\n可用的SQL文件:');
      listAvailableSqlFiles();
      return;
    }
    
    connection = await pool.getConnection();
    
    logger.info(`📄 执行SQL文件: ${sqlFileName}\n`);
    
    // 读取SQL文件
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
    
    // 移除注释并分割SQL语句
    const statements = sqlContent
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    logger.info(`找到 ${statements.length} 条SQL语句\n`);
    
    // 执行每条语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // 跳过USE语句（已经连接到数据库）
      if (statement.toUpperCase().startsWith('USE ')) {
        logger.info(`跳过: USE语句`);
        continue;
      }
      
      // 跳过SET语句（变量声明）
      if (statement.toUpperCase().startsWith('SET @')) {
        logger.info(`执行: SET变量`);
        await connection.query(statement);
        continue;
      }
      
      // 跳过PREPARE/EXECUTE/DEALLOCATE语句（动态SQL）
      if (statement.toUpperCase().match(/^(PREPARE|EXECUTE|DEALLOCATE)/)) {
        logger.info(`执行: 动态SQL`);
        await connection.query(statement);
        continue;
      }
      
      try {
        // 显示正在执行的语句类型
        const statementType = statement.split(' ')[0].toUpperCase();
        logger.info(`执行: ${statementType}...`);
        
        const [result] = await connection.query(statement);
        
        // 如果是SELECT语句，显示结果
        if (statementType === 'SELECT') {
          if (Array.isArray(result) && result.length > 0) {
            logger.info('结果:');
            console.table(result);
          }
        }
        
        logger.info(`✅ ${statementType} 执行成功\n`);
      } catch (error: any) {
        logger.error(`❌ 执行失败: ${error.message}`);
        logger.error(`SQL: ${statement.substring(0, 100)}...\n`);
        throw error;
      }
    }
    
    logger.info('✅ SQL文件执行完成！');
    
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

function listAvailableSqlFiles() {
  const sqlDir = path.join(process.cwd(), 'sql');
  
  if (!fs.existsSync(sqlDir)) {
    logger.warn('sql/ 文件夹不存在');
    return;
  }
  
  const sqlFiles = fs.readdirSync(sqlDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (sqlFiles.length === 0) {
    logger.info('  没有找到SQL文件');
    return;
  }
  
  sqlFiles.forEach((file, index) => {
    const filePath = path.join(sqlDir, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    logger.info(`  ${index + 1}. ${file} (${sizeKB} KB)`);
  });
  
  logger.info('\n用法: npm run sql <文件名>');
  logger.info('示例: npm run sql add_parsed_json_path');
}

// 从命令行参数获取文件名
const sqlFileName = process.argv[2];

runSqlFile(sqlFileName)
  .then(() => {
    logger.info('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('脚本执行失败:', error);
    process.exit(1);
  });
