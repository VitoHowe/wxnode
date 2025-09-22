# 微信小程序题库管理后端系统

## 项目简介

本项目是一个基于Node.js + TypeScript开发的微信小程序后端系统，主要功能包括：

- 微信小程序用户认证和权限管理
- PDF题库文件上传和智能解析
- 题库数据存储和管理
- RESTful API接口服务

## 技术栈

- **后端框架**: Node.js + Express + TypeScript
- **数据库**: MySQL 8.0 + Redis
- **PDF解析**: Python微服务 + OCR
- **容器化**: Docker + Docker Compose
- **API文档**: Swagger/OpenAPI

## 项目结构

```
wxnode/
├── src/
│   ├── controllers/     # 控制器
│   ├── services/        # 业务逻辑服务
│   ├── models/          # 数据模型
│   ├── middleware/      # 中间件
│   ├── routes/          # 路由配置
│   ├── utils/           # 工具函数
│   ├── config/          # 配置文件
│   └── app.ts           # 应用入口
├── database/
│   ├── migrations/      # 数据库迁移文件
│   └── seeds/           # 初始数据
├── parse-service/       # Python解析服务
├── uploads/             # 文件上传目录
├── logs/                # 日志文件
└── docker-compose.yml   # Docker配置
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- MySQL >= 8.0
- Redis >= 6.0
- Python >= 3.8 (解析服务)

### 安装依赖

```bash
# 安装Node.js依赖
npm install

# 安装Python解析服务依赖
cd parse-service
pip install -r requirements.txt
cd ..
```

### 环境配置

1. 复制环境变量文件：
```bash
cp .env.example .env
```

2. 修改 `.env` 文件中的配置信息

### 数据库初始化

```bash
# 运行数据库迁移
npm run migrate

# 插入初始数据
npm run seed
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### Docker部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

## API文档

服务启动后，可通过以下地址访问API文档：
- Swagger UI: http://localhost:3000/api-docs

## 主要功能

### 1. 微信用户认证
- 微信小程序登录
- JWT token生成和验证
- 用户权限管理

### 2. 题库文件管理
- 文件上传接口
- PDF智能解析
- 解析状态追踪

### 3. 题目数据管理
- 题目增删改查
- 题库分类管理
- 搜索和筛选

## 开发指南

### 代码规范
- 使用TypeScript进行类型检查
- 遵循ESLint代码规范
- 使用Prettier进行代码格式化

### 测试
```bash
# 运行测试
npm test

# 运行测试覆盖率
npm run test:coverage
```

## 部署说明

### 生产环境部署
1. 设置生产环境变量
2. 构建项目: `npm run build`
3. 启动服务: `npm start`

### Docker部署
使用docker-compose进行一键部署，包含所有依赖服务。

## 许可证

MIT License
