# Docker 快速开始指南

**3 分钟快速部署微信小程序题库管理系统**

## 🚀 快速部署（推荐）

### Windows 用户

```powershell
# 1. 运行一键部署脚本
.\deploy.ps1
```

### Linux/Mac 用户

```bash
# 1. 赋予执行权限
chmod +x deploy.sh

# 2. 运行一键部署脚本
./deploy.sh
```

脚本会自动完成：
- ✅ 检查 Docker 环境
- ✅ 创建 .env 配置文件
- ✅ 构建 Docker 镜像
- ✅ 启动所有服务
- ✅ 等待服务就绪

## 📝 手动部署

如果不想使用自动化脚本，可以按以下步骤手动部署：

### 步骤 1: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，至少修改以下配置
# - DB_PASSWORD（数据库密码）
# - REDIS_PASSWORD（Redis 密码）
# - JWT_SECRET（JWT 密钥）
# - JWT_REFRESH_SECRET（刷新令牌密钥）
# - WECHAT_APPID（微信 AppID）
# - WECHAT_SECRET（微信 Secret）
```

### 步骤 2: 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看应用日志
docker-compose logs -f app
```

### 步骤 3: 验证部署

访问以下地址确认服务正常：

- **健康检查**: http://localhost:3000/health
- **API 文档**: http://localhost:3000/api-docs

## ⚙️ 服务管理

```bash
# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f app

# 进入容器调试
docker-compose exec app sh
```

## 🔒 安全提示

**生产环境部署前，请务必：**

1. ✅ 修改所有默认密码
2. ✅ 生成随机的 JWT 密钥
3. ✅ 配置真实的微信小程序凭证
4. ✅ 限制数据库和 Redis 的网络访问
5. ✅ 启用 HTTPS（使用 Nginx 反向代理）

**生成随机密钥的方法：**

```bash
# Node.js 方式
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL 方式（Linux/Mac）
openssl rand -hex 64
```

## 📊 服务架构

```
┌─────────────┐
│   Nginx     │ (可选，生产环境推荐)
│   :80/443   │
└──────┬──────┘
       │
┌──────▼──────┐
│   App       │
│   :3000     │
└──┬─────┬────┘
   │     │
   │     └────────┐
   │              │
┌──▼────┐    ┌───▼───┐
│ MySQL │    │ Redis │
│ :3306 │    │ :6379 │
└───────┘    └───────┘
```

## 🔧 常见问题

### Q: 端口被占用怎么办？

修改 `.env` 文件中的端口配置：

```env
PORT=8080          # 应用端口
DB_PORT=3307       # MySQL 端口
REDIS_PORT=6380    # Redis 端口
```

### Q: 数据会丢失吗？

不会。数据存储在 Docker volumes 中，即使容器重启也会保留：
- `mysql_data` - 数据库数据
- `redis_data` - Redis 数据
- `./uploads` - 上传的文件
- `./logs` - 日志文件

### Q: 如何备份数据？

```bash
# 备份数据库
docker-compose exec mysql mysqldump -u root -p${DB_PASSWORD} wxnode_db > backup.sql

# 备份文件
tar czf backup.tar.gz uploads logs public
```

### Q: 服务启动失败怎么办？

```bash
# 1. 查看完整日志
docker-compose logs app

# 2. 检查环境变量
docker-compose exec app env | grep DB_

# 3. 测试数据库连接
docker-compose exec mysql mysql -u root -p
```

## 📚 详细文档

更多信息请查看：
- **完整部署指南**: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- **API 文档**: [API接口文档.md](./API接口文档.md)
- **项目文档**: [README.md](./README.md)

## 🆘 获取帮助

遇到问题？
1. 查看 [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) 故障排查章节
2. 检查应用日志：`docker-compose logs -f app`
3. 提交 Issue 到项目仓库

---

**祝您部署顺利！** 🎉
