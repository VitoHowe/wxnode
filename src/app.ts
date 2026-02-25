import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { apiRateLimiter } from '@/middleware/rateLimit';
import { logger } from '@/utils/logger';
import { connectDB } from '@/config/database';
import { connectRedis } from '@/config/redis';

// 路由导入
import authRoutes from '@/routes/auth';
import fileRoutes from '@/routes/files';
import questionRoutes from '@/routes/questions';
import userProgressRoutes from '@/routes/userProgress';
import chapterRoutes from '@/routes/chapters';
import wordBookRoutes from '@/routes/wordBooks';
import subjectRoutes from '@/routes/subjects';
import adminQuestionBankRoutes from '@/routes/adminQuestionBanks';
import realExamRoutes from '@/routes/realExams';
import markdownFileRoutes from '@/routes/markdownFiles';
import practiceRoutes from '@/routes/practice';
import adminEssayRoutes from '@/routes/adminEssays';
import essayRoutes from '@/routes/essays';

// 加载环境变量
// 优先加载 .env 文件（Docker 环境），如果不存在则尝试加载 .process 文件（本地开发环境）
const fs = require('fs');
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else if (fs.existsSync('.process')) {
  dotenv.config({ path: '.process' });
} else {
  dotenv.config(); // 默认加载 .env
}

const app: Application = express();
const PORT = process.env.PORT || 3000;

const parseTrustProxyConfig = (
  value?: string
): boolean | number | string => {
  const raw = value?.trim();
  if (!raw) {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }

  const normalized = raw.toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  const maybeNumber = Number(raw);
  if (Number.isInteger(maybeNumber) && maybeNumber >= 0) {
    return maybeNumber;
  }

  // 支持 Express 的字符串模式，例如 "loopback, linklocal, uniquelocal"
  return raw;
};

const trustProxy = parseTrustProxyConfig(process.env.TRUST_PROXY);
app.set('trust proxy', trustProxy);
logger.info(`[Proxy] trust proxy 已设置为: ${String(trustProxy)}`);

// 中间件配置
app.use(helmet({
  crossOriginResourcePolicy: false  // 允许跨域资源访问
}));
app.use(cors());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务：题库图片资源
app.use('/api/question-banks/:bankId/images', (req, res, next) => {
  const bankId = req.params.bankId;
  const publicPath = path.join(process.cwd(), 'public', 'question-banks', bankId, 'images');
  express.static(publicPath)(req, res, next);
});

// 静态文件服务：Markdown 文档与章节
app.use('/api/markdown-files/:fileId', (req, res, next) => {
  const fileId = req.params.fileId;
  const publicPath = path.join(process.cwd(), 'public', 'markdown-docs', fileId);
  express.static(publicPath)(req, res, next);
});

// 全局 API 限流
app.use('/api', apiRateLimiter);

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
  apis: [
    path.join(__dirname, 'routes/auth.ts'),
    path.join(__dirname, 'routes/files.ts'),
    path.join(__dirname, 'routes/questions.ts'),
    path.join(__dirname, 'routes/chapters.ts'),
    path.join(__dirname, 'routes/wordBooks.ts'),
    path.join(__dirname, 'routes/userProgress.ts'),
    path.join(__dirname, 'routes/subjects.ts'),
    path.join(__dirname, 'routes/adminQuestionBanks.ts'),
    path.join(__dirname, 'routes/realExams.ts'),
    path.join(__dirname, 'routes/markdownFiles.ts'),
    path.join(__dirname, 'routes/adminEssays.ts'),
    path.join(__dirname, 'routes/essays.ts'),
  ], // API路由文件路径
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/user-progress', userProgressRoutes);
app.use('/api/question-banks', chapterRoutes);
app.use('/api/word-books', wordBookRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/admin/question-banks', adminQuestionBankRoutes);
app.use('/api/real-exams', realExamRoutes);
app.use('/api/admin/markdown-files', markdownFileRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/admin', adminEssayRoutes);
app.use('/api', essayRoutes);

// 错误处理中间件
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDB();
    logger.info('MySQL数据库连接成功');

    // 连接Redis（可选）
    try {
      await connectRedis();
      logger.info('Redis连接成功');
    } catch (error) {
      logger.warn('Redis连接失败，将以无缓存模式运行:', error);
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
