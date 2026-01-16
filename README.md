# 🎯 微信小程序题库管理系统

> 一个现代化的题库管理后端 API 系统，支持微信小程序登录与账号密码登录，覆盖题库、章节、学习进度与单词书查询。

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ 主要特性

### 🔐 双重认证系统
- **微信小程序登录**: 一键授权，无缝接入
- **账号密码登录**: 适合后台或运营账号
- **统一登录入口**: 同一路由兼容两种方式

### 🚀 技术亮点
- **统一响应格式**: 所有API采用标准化响应结构
- **JWT无状态认证**: 支持access token和refresh token
- **TypeScript全栈**: 类型安全，开发效率高
- **详细日志系统**: 便于开发调试和生产监控
- **自动数据库迁移**: 启动时自动初始化和更新数据库

### 📚 核心功能
- 🎓 **题库管理**: 支持多种题型（单选、多选、判断、填空、简答）
- 📘 **章节与题目查询**: 章节列表与题目拉取
- 🧭 **学习进度**: 章节/整卷进度写入与重置
- 📁 **文件上传**: 支持题库文件上传和解析
- 📗 **单词书查询**: 单词书列表与词条拉取

## 📘 单词书练习 API

| 端点 | 方法 | 功能 |
| ---- | ---- | ---- |
| `/api/word-books` | GET | 分页获取全部单词书及总数量 |
| `/api/word-books/{id}/words` | GET | 根据单词书 ID 获取词条（默认一次性返回整本单词） |

> 词条查询接口无需分页参数，服务端会直接返回整本单词列表，方便前端本地练习。


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
│   ├── 学习进度服务
│   └── 单词书服务
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

### 🐳 Docker 部署（推荐）

**最简单的部署方式，3分钟即可完成！**

#### Windows 用户
```powershell
.\deploy.ps1
```

#### Linux/Mac 用户
```bash
chmod +x deploy.sh
./deploy.sh
```

部署脚本会自动完成所有配置，包括：
- ✅ 检查 Docker 环境
- ✅ 创建配置文件
- ✅ 构建镜像
- ✅ 启动服务（MySQL + Redis + 应用）

**详细文档**: [Docker 快速开始](./DOCKER_QUICKSTART.md) | [完整部署指南](./DOCKER_DEPLOYMENT.md)

---

### 💻 本地开发部署

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
cp .env.example .env
# 编辑 .env 文件，配置数据库和微信参数
```

#### 4. 启动服务
```bash
pnpm run dev
```

#### 5. 验证安装
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
- `POST /api/auth/refresh` - 刷新 Token
- `GET /api/auth/profile` - 获取用户信息
- `POST /api/auth/logout` - 登出

#### 📚 题库管理
- `GET /api/questions/banks` - 题库列表
- `GET /api/questions/banks/:id` - 题库详情

#### 📖 章节与题目
- `GET /api/question-banks/:bankId/chapters` - 章节列表
- `GET /api/question-banks/:bankId/chapters/:chapterId/questions` - 章节题目

#### 📗 单词书
- `GET /api/word-books` - 单词书列表
- `GET /api/word-books/:id/words` - 单词书词条

#### 🧭 学习进度
- `GET /api/user-progress/:bankId/chapters` - 章节进度
- `GET /api/user-progress/:bankId/full` - 整卷进度
- `POST /api/user-progress/:bankId/chapters/:chapterId` - 保存章节进度
- `DELETE /api/user-progress/:bankId/chapters/:chapterId` - 重置章节进度
- `DELETE /api/user-progress/:bankId` - 重置题库进度

#### 📁 文件上传
- `POST /api/files/upload` - 上传题库文件

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

# JWT配置
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# 微信小程序配置
WECHAT_APPID=your_appid
WECHAT_SECRET=your_secret
```

详细配置指南: [配置指南.md](./配置指南.md)

## 🧪 功能测试

### 账号密码登录
```bash
# 需预置账号
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
├── 📁 src/
│   ├── 🎯 controllers/     # 控制器层
│   ├── 🔧 services/        # 业务逻辑层
│   ├── 🗄️ config/          # 配置文件
│   ├── 🛡️ middleware/      # 中间件
│   ├── 🛣️ routes/          # 路由定义
│   └── 🛠️ utils/           # 工具类
├── 📁 logs/               # 日志文件
├── 📁 uploads/            # 上传文件
├── 📄 API接口文档.md      # API文档
├── 📄 配置指南.md         # 配置指南
└── 📄 package.json        # 项目配置
```

## 🔄 版本历史

### v1.2.0 (2025-09-28) - 重大升级 🎉
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
