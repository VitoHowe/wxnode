import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { logger } from '@/utils/logger';
import { connectDB } from '@/config/database';
import { connectRedis } from '@/config/redis';
import { validateEnv, getConfigSummary } from '@/utils/envValidator';

// 路由导入
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import fileRoutes from '@/routes/files';
import questionRoutes from '@/routes/questions';
import systemRoutes from '@/routes/system';
import parseResultRoutes from '@/routes/parseResults';
import userProgressRoutes from '@/routes/userProgress';

// 加载环境变量
dotenv.config({ path: '.env' });

// 验证环境变量
try {
  validateEnv();
  const config = getConfigSummary();
  logger.info('📋 系统配置:', config);
} catch (error) {
  logger.error('环境变量验证失败，请检查.env文件');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger API文档配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '微信小程序题库管理系统 API',
      version: '1.0.0',
      description: '微信小程序题库管理后端API文档',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: '开发环境',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // API路由文件路径
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康检查端点
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected',
      redis: process.env.ENABLE_REDIS === 'true' ? 'enabled' : 'disabled',
    },
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
    },
  };
  
  res.status(200).json(healthCheck);
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/parse-results', parseResultRoutes);
app.use('/api/user-progress', userProgressRoutes);

// 错误处理中间件
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDB();
    logger.info('MySQL数据库连接成功');

    // 连接Redis（可选，仅当环境变量启用时）
    if (process.env.ENABLE_REDIS === 'true') {
      try {
        await connectRedis();
        logger.info('Redis连接成功');
      } catch (error) {
        logger.warn('Redis连接失败，将以无缓存模式运行:', error);
      }
    }

    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.info(`服务器运行在端口 ${PORT}`);
      logger.info(`API文档地址: http://localhost:${PORT}/api-docs`);
      logger.info(`健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

// 启动应用
startServer();

export default app;
