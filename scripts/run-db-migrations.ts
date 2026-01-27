import { connectDB, getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function runMigrations() {
  try {
    await connectDB();
    logger.info('数据库迁移完成');
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    throw error;
  } finally {
    try {
      await getPool().end();
    } catch (closeError) {
      logger.warn('关闭数据库连接池失败:', closeError);
    }
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
