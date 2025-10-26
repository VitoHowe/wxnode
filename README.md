# 🎯 微信小程序题库管理系统

> 一个现代化的题库管理后端API系统，支持微信小程序登录和传统用户注册，提供完整的题库管理功能。

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ 主要特性

### 🔐 双重认证系统
- **微信小程序登录**: 一键授权，无缝接入
- **普通用户注册**: 传统用户名密码认证
- **混合用户管理**: 同一系统支持两种用户类型

### 🚀 技术亮点
- **统一响应格式**: 所有API采用标准化响应结构
- **JWT无状态认证**: 支持access token和refresh token
- **TypeScript全栈**: 类型安全，开发效率高
- **详细日志系统**: 便于开发调试和生产监控
- **自动数据库迁移**: 启动时自动初始化和更新数据库

### 📚 核心功能
- 🎓 **题库管理**: 支持多种题型（单选、多选、判断、填空、简答）
- 📁 **文件上传**: 支持题库文件上传和解析
- 👥 **用户管理**: 角色权限控制，用户状态管理
- 🔄 **数据同步**: 实时数据更新和状态同步

## 🏗️ 技术架构

```
微信小程序题库管理系统
├── 🎯 表现层
│   ├── RESTful API接口
│   ├── 统一响应格式
│   └── JWT认证中间件
├── 🔧 业务层
│   ├── 用户认证服务 (微信+普通)
│   ├── 题库管理服务
│   ├── 文件处理服务
│   └── 权限控制服务
├── 💾 数据层
│   ├── MySQL数据库
│   ├── 自动迁移系统
│   └── 连接池管理
└── 🛠️ 工具层
    ├── 微信API集成
    ├── JWT工具类
    ├── 响应工具类
    └── 日志系统
```

## 🚀 快速开始

### 方式一：Docker 部署（推荐） 🐳

**适合**: 生产环境、快速体验

```bash
# 1. 准备环境变量
cp env.docker.template .env
vim .env  # 修改数据库密码、JWT密钥等

# 2. 使用快速启动脚本
# Windows:
.\docker-quick-start.ps1

# Linux/Mac:
chmod +x docker-quick-start.sh
./docker-quick-start.sh

# 3. 或手动启动
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

**优势**:
- ✅ 零依赖安装（只需 Docker）
- ✅ 一键启动所有服务
- ✅ 生产环境就绪
- ✅ 数据持久化
- ✅ 易于扩展和维护

详细文档: [Docker使用指南.md](./Docker使用指南.md)

---

### 方式二：本地开发

**适合**: 开发调试

#### 1. 克隆项目
```bash
git clone https://github.com/yourname/wxnode.git
cd wxnode
```

#### 2. 安装依赖
```bash
pnpm install
# 或者 npm install
```

#### 3. 配置环境
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置数据库和微信参数
# 重要：首次启动需要设置 DB_INIT=true
```

**重要环境变量**:
- `DB_INIT=true` - 首次启动时设置为 true，之后改为 false
- `ENABLE_REDIS=false` - 目前不需要 Redis，保持为 false

#### 4. 启动数据库（可选，使用 Docker）
```bash
# 仅启动 MySQL（应用在本地运行）
docker-compose -f docker-compose.dev.yml up -d
```

#### 5. 启动服务
```bash
# 首次启动（会初始化数据库）
pnpm run dev

# 初始化成功后，将 .env 中的 DB_INIT 改为 false
# 然后重启服务即可
```

#### 6. 验证安装
```bash
curl http://localhost:3001/health
```

## 📖 API 文档

### 统一响应格式
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    // 具体响应数据
  },
  "timestamp": "2025-09-28T14:12:19.123Z"
}
```

### 核心接口

#### 🔐 认证接口
- `POST /api/auth/login` - 统一登录（支持微信+普通）
- `POST /api/auth/register` - 普通用户注册
- `GET /api/auth/profile` - 获取用户信息
- `POST /api/auth/refresh` - 刷新Token

#### 👥 用户管理
- `GET /api/users` - 用户列表
- `GET /api/users/:id` - 用户详情
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

#### 📚 题库管理
- `GET /api/questions` - 题目列表
- `POST /api/questions` - 创建题目
- `GET /api/questions/:id` - 题目详情
- `PUT /api/questions/:id` - 更新题目

详细API文档请查看: [API接口文档.md](./API接口文档.md)

## 🔧 配置说明

### 环境变量
```env
# 服务配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wxnode_db

# 数据库初始化 ⚠️ 重要
# 首次启动设为 true，之后设为 false 以提升启动速度
DB_INIT=false

# Redis配置（可选，目前不需要）
ENABLE_REDIS=false

# JWT配置
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# 微信小程序配置
WECHAT_APPID=your_appid
WECHAT_SECRET=your_secret
```

### 性能优化说明

**启动速度优化**:
- `DB_INIT=false` - 跳过数据库初始化，启动速度提升 50-70% 🚀
- `ENABLE_REDIS=false` - 跳过 Redis 连接（项目暂不使用）

**何时设置 `DB_INIT=true`**:
- ✅ 首次克隆项目
- ✅ 数据库结构有更新
- ✅ 需要重建数据库表

详细配置指南: [配置指南.md](./配置指南.md)  
启动优化说明: [启动优化说明.md](./启动优化说明.md)

## 🧪 功能测试

### 普通用户注册登录
```bash
# 注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Test123","nickname":"测试用户"}'

# 登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Test123"}'
```

### 微信小程序登录
```javascript
// 小程序端
wx.login({
  success: (res) => {
    wx.request({
      url: 'https://yourapi.com/api/auth/login',
      method: 'POST',
      data: { code: res.code }
    });
  }
});
```

## 📊 项目结构

```
wxnode/
├── 📁 src/                      # 源代码
│   ├── 🎯 controllers/         # 控制器层
│   ├── 🔧 services/            # 业务逻辑层
│   ├── 🗄️ config/              # 配置文件
│   ├── 🛡️ middleware/          # 中间件
│   ├── 🛣️ routes/              # 路由定义
│   └── 🛠️ utils/               # 工具类
├── 📁 logs/                    # 日志文件
├── 📁 uploads/                 # 上传文件
├── 📁 backups/                 # 数据库备份
├── 📁 migrations/              # 数据库迁移脚本
├── 🐳 Dockerfile               # Docker 镜像定义
├── 🐳 docker-compose.yml       # Docker 编排配置
├── 🐳 docker-compose.dev.yml   # 开发环境配置
├── 🐳 .dockerignore            # Docker 忽略文件
├── 📄 env.docker.template      # Docker 环境变量模板
├── 📄 .env.example             # 本地环境变量模板
├── 📄 Makefile                 # 快捷命令
├── 📄 API接口文档.md           # API文档
├── 📄 Docker使用指南.md        # Docker 部署指南
├── 📄 启动优化说明.md          # 启动优化文档
├── 📄 代码优化说明.md          # 代码优化文档
└── 📄 package.json             # 项目配置
```

## 🔄 版本历史

### v2.1.0 (2025-10-26) - 性能优化 ⚡
- ✅ **启动速度优化**: 提升 50-70% 启动速度
- ✅ **可选 Redis**: 添加 ENABLE_REDIS 环境变量控制
- ✅ **可选初始化**: 添加 DB_INIT 环境变量控制数据库初始化
- ✅ **文档整合**: 整合所有 API 文档为统一文档
- ✅ **代码清理**: 删除过时和重复的文档

### v2.0.0 (2025-10-26) - 功能增强 🎉
- ✅ **用户学习进度**: 新增用户学习进度管理功能
- ✅ **解析结果管理**: 完善解析结果的完整 CRUD 接口
- ✅ **AI 多供应商**: 支持 OpenAI/Gemini/Qwen 等多种 AI 供应商
- ✅ **文件解析**: 支持使用 AI 解析题库文件

### v1.2.0 (2025-09-28) - 重大升级 
- ✅ **统一响应格式**: 所有接口标准化响应
- ✅ **完善日志系统**: 详细的API调用日志
- ✅ **代码优化**: 移除废弃代码，提高质量
- ✅ **问题修复**: 解决登录和Profile接口问题

### v1.1.0 (2025-09-27)
- ✅ **普通用户系统**: 支持用户名密码注册登录
- ✅ **统一登录接口**: 一个接口支持两种登录方式
- ✅ **数据库优化**: 支持混合用户类型

### v1.0.0 (2025-09-26)
- ✅ **微信登录**: 基础微信小程序登录
- ✅ **题库管理**: 基本题库CRUD功能
- ✅ **用户管理**: 基础用户管理功能

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🆘 技术支持

- 📧 邮箱: support@yourproject.com
- 📱 微信: your_wechat_id
- 🐛 问题反馈: [GitHub Issues](https://github.com/yourname/wxnode/issues)

## 🎯 路线图

- [ ] **v1.3.0** - 添加考试系统
- [ ] **v1.4.0** - 支持题目AI生成
- [ ] **v1.5.0** - 添加数据分析面板
- [ ] **v2.0.0** - 微服务架构重构

---

<p align="center">
  <strong>💝 如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！</strong>
</p>
