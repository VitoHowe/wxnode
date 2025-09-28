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

### 1. 克隆项目
```bash
git clone https://github.com/yourname/wxnode.git
cd wxnode
```

### 2. 安装依赖
```bash
pnpm install
# 或者 npm install
```

### 3. 配置环境
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和微信参数
```

### 4. 启动服务
```bash
pnpm run dev
```

### 5. 验证安装
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

# JWT配置
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# 微信小程序配置
WECHAT_APPID=your_appid
WECHAT_SECRET=your_secret
```

详细配置指南: [配置指南.md](./配置指南.md)

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
