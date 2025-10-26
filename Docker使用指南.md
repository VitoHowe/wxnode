# Docker 部署指南

## 📦 项目结构

```
wxnode/
├── Dockerfile                 # 生产环境镜像
├── .dockerignore             # Docker 忽略文件
├── docker-compose.yml        # 生产环境编排
├── docker-compose.dev.yml    # 开发环境编排
├── .env.docker               # Docker 环境变量模板
├── Makefile                  # 快捷命令
└── Docker使用指南.md         # 本文档
```

---

## 🚀 快速开始

### 1. 准备环境变量

```bash
# 复制环境变量模板
cp env.docker.template .env

# 编辑环境变量，设置密码等
vim .env
```

**或使用快速启动脚本**：

Linux/Mac:
```bash
chmod +x docker-quick-start.sh
./docker-quick-start.sh
```

Windows PowerShell:
```powershell
.\docker-quick-start.ps1
```

**重要配置**：
```env
# 数据库密码（必须修改）
MYSQL_ROOT_PASSWORD=your_strong_password
DB_PASSWORD=your_db_password

# JWT 密钥（必须修改）
JWT_SECRET=your_long_random_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key

# 首次启动需要初始化数据库
DB_INIT=true

# 微信小程序配置
WECHAT_APPID=your_appid
WECHAT_SECRET=your_secret
```

### 2. 启动服务

#### 方式一：使用 Makefile（推荐）

```bash
# 首次启动（会初始化数据库）
make init-db

# 查看日志
make logs

# 初始化成功后，修改 .env 中的 DB_INIT=false
# 然后重启
make restart
```

#### 方式二：使用 docker-compose

```bash
# 首次启动
DB_INIT=true docker-compose up -d

# 查看日志
docker-compose logs -f

# 修改 .env 后重启
docker-compose restart app
```

### 3. 验证服务

```bash
# 检查服务状态
curl http://localhost:3001/health

# 或使用浏览器访问
# http://localhost:3001/health
# http://localhost:3001/api-docs
```

**成功响应示例**：
```json
{
  "status": "OK",
  "version": "2.1.0",
  "uptime": 125.5,
  "environment": "production",
  "services": {
    "database": "connected",
    "redis": "disabled"
  },
  "memory": {
    "used": "45 MB",
    "total": "100 MB"
  }
}
```

---

## 📋 常用命令

### 使用 Makefile

```bash
# 查看所有可用命令
make help

# 构建镜像
make build

# 启动服务
make up

# 停止服务
make down

# 查看日志
make logs
make logs-app    # 只看应用日志
make logs-db     # 只看数据库日志

# 重启服务
make restart
make restart-app # 只重启应用

# 进入容器
make shell       # 进入应用容器
make db-shell    # 进入数据库容器

# 查看状态
make status      # 服务状态
make stats       # 资源使用

# 数据库操作
make backup      # 备份数据库
make restore FILE=backups/backup_xxx.sql  # 还原数据库

# 清理
make clean       # 清理容器和镜像
make clean-logs  # 清理日志
```

### 使用 docker-compose

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f
docker-compose logs -f app

# 重启服务
docker-compose restart
docker-compose restart app

# 进入容器
docker-compose exec app sh
docker-compose exec mysql mysql -u root -p

# 查看状态
docker-compose ps
```

---

## 🔧 不同环境部署

### 开发环境

**仅启动数据库，应用在本地运行**：

```bash
# 启动数据库
make dev
# 或
docker-compose -f docker-compose.dev.yml up -d

# 本地运行应用
npm run dev
```

**配置 .env**：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=wxnode
DB_PASSWORD=wxnode123
DB_NAME=wxnode_db
DB_INIT=false
```

### 生产环境

**完整部署（应用 + 数据库）**：

```bash
# 1. 配置环境变量
cp .env.docker .env
vim .env  # 修改密码等配置

# 2. 首次启动（初始化数据库）
DB_INIT=true docker-compose up -d

# 3. 查看日志，确认初始化成功
docker-compose logs -f app

# 4. 修改 .env
DB_INIT=false

# 5. 重启应用
docker-compose restart app
```

### 启用 Redis

```bash
# 修改 .env
ENABLE_REDIS=true

# 使用 profile 启动 Redis
docker-compose --profile with-redis up -d

# 重启应用使配置生效
docker-compose restart app
```

---

## 🗄️ 数据管理

### 数据持久化

数据存储在 Docker volumes 中：

```bash
# 查看 volumes
docker volume ls | grep wxnode

# 数据位置
# - mysql_data: MySQL 数据
# - redis_data: Redis 数据
# - ./uploads: 上传文件（映射到宿主机）
# - ./logs: 日志文件（映射到宿主机）
```

### 备份数据库

```bash
# 使用 Makefile
make backup

# 手动备份
docker exec wxnode-mysql mysqldump \
  -u root -p<password> wxnode_db \
  > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 还原数据库

```bash
# 使用 Makefile
make restore FILE=backups/backup_20251026_120000.sql

# 手动还原
docker exec -i wxnode-mysql mysql \
  -u root -p<password> wxnode_db \
  < backups/backup_20251026_120000.sql
```

### 清理旧数据

```bash
# 停止并删除容器、网络、volumes
docker-compose down -v

# 清理未使用的 Docker 资源
docker system prune -a -f
```

---

## 🔍 故障排查

### 1. 服务无法启动

**检查日志**：
```bash
docker-compose logs -f app
docker-compose logs -f mysql
```

**常见问题**：
- ❌ 环境变量未设置：检查 `.env` 文件
- ❌ 端口冲突：修改 `.env` 中的端口映射
- ❌ 数据库未就绪：等待 MySQL 健康检查通过

### 2. 数据库连接失败

**检查 MySQL 状态**：
```bash
docker-compose exec mysql mysqladmin ping -h localhost -u root -p
```

**检查网络**：
```bash
docker-compose exec app ping mysql
```

**解决方案**：
- 确保 `DB_HOST=mysql`（容器内使用服务名）
- 检查密码是否正确
- 等待 MySQL 完全启动（约10-30秒）

### 3. 环境变量不生效

**重新构建镜像**：
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 4. 权限问题

**修复上传目录权限**：
```bash
chmod -R 777 uploads
chmod -R 777 logs
```

### 5. 容器内调试

**进入应用容器**：
```bash
docker-compose exec app sh

# 检查环境变量
env | grep DB

# 检查文件
ls -la /app
cat /app/.env

# 测试数据库连接
ping mysql
nc -zv mysql 3306
```

---

## 📊 监控和维护

### 查看资源使用

```bash
# 实时资源监控
docker stats wxnode-app wxnode-mysql

# 查看容器详情
docker inspect wxnode-app
```

### 日志管理

```bash
# 查看实时日志
docker-compose logs -f --tail=100

# 导出日志
docker-compose logs > logs/docker_logs_$(date +%Y%m%d).log

# 清理日志
make clean-logs
```

### 健康检查

```bash
# 应用健康检查
curl http://localhost:3001/health

# 数据库健康检查
docker-compose exec mysql mysqladmin ping -h localhost -u root -p

# 查看容器健康状态
docker-compose ps
```

---

## 🚀 生产环境最佳实践

### 1. 安全配置

- ✅ 使用强密码（MySQL、Redis、JWT）
- ✅ 不要将 `.env` 文件提交到 Git
- ✅ 定期更新 Docker 镜像
- ✅ 限制容器资源使用

### 2. 性能优化

**限制容器资源**（在 docker-compose.yml 中）：
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 3. 数据备份

**定时备份**：
```bash
# 添加到 crontab
0 2 * * * cd /path/to/wxnode && make backup
```

### 4. 日志轮转

**配置日志大小限制**：
```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 5. 使用反向代理

**Nginx 配置示例**：
```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔄 更新应用

### 拉取新代码

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
docker-compose build

# 3. 重启服务
docker-compose up -d

# 4. 查看日志确认
docker-compose logs -f app
```

### 零停机更新

```bash
# 1. 启动新容器
docker-compose up -d --no-deps --build app

# 2. 等待新容器就绪
sleep 10

# 3. 旧容器会自动被替换
```

---

## 📞 技术支持

遇到问题请：

1. 查看日志: `make logs` 或 `docker-compose logs -f`
2. 检查配置: 确认 `.env` 文件配置正确
3. 查看文档: [API接口文档.md](./API接口文档.md)
4. 提交 Issue: 附上日志和配置信息

---

## 📚 相关文档

- [API接口文档](./API接口文档.md)
- [启动优化说明](./启动优化说明.md)
- [代码优化说明](./代码优化说明.md)
- [配置指南](./配置指南.md)
- [README](./README.md)

---

**最后更新**: 2025-10-26  
**Docker 版本要求**: Docker 20.10+, Docker Compose 2.0+  
**维护者**: Development Team

