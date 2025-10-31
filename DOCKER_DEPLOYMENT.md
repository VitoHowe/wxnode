# Docker 部署指南

本文档介绍如何使用 Docker 和 docker-compose 部署微信小程序题库管理系统。

## 📋 目录

- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [环境变量配置](#环境变量配置)
- [常用命令](#常用命令)
- [数据持久化](#数据持久化)
- [故障排查](#故障排查)
- [生产环境建议](#生产环境建议)

## 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

## 快速开始

### 1. 配置环境变量

复制环境变量模板并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少修改以下关键配置：

```env
# 数据库密码（必须修改）
DB_PASSWORD=your_secure_password_here
REDIS_PASSWORD=your_redis_password_here

# JWT 密钥（必须修改为随机字符串）
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# 微信小程序配置（从微信公众平台获取）
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret
```

**安全提示**：生成随机 JWT 密钥的方法：

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. 构建并启动服务

```bash
# 构建镜像并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

### 3. 验证部署

访问以下地址确认服务正常：

- **健康检查**: http://localhost:3000/health
- **API 文档**: http://localhost:3000/api-docs

预期响应（健康检查）：

```json
{
  "status": "OK",
  "timestamp": "2025-10-31T01:46:00.000Z",
  "version": "1.0.0"
}
```

## 环境变量配置

### 完整环境变量说明

| 变量名 | 说明 | 默认值 | 是否必填 |
|--------|------|--------|----------|
| `PORT` | 应用端口 | 3000 | 否 |
| `NODE_ENV` | 运行环境 | production | 否 |
| `DB_HOST` | 数据库地址 | mysql | 否 |
| `DB_PORT` | 数据库端口 | 3306 | 否 |
| `DB_USER` | 数据库用户 | wxnode_user | 是 |
| `DB_PASSWORD` | 数据库密码 | - | **是** |
| `DB_NAME` | 数据库名称 | wxnode_db | 是 |
| `REDIS_HOST` | Redis 地址 | redis | 否 |
| `REDIS_PORT` | Redis 端口 | 6379 | 否 |
| `REDIS_PASSWORD` | Redis 密码 | - | **是** |
| `JWT_SECRET` | JWT 密钥 | - | **是** |
| `JWT_REFRESH_SECRET` | 刷新令牌密钥 | - | **是** |
| `JWT_EXPIRES_IN` | 令牌有效期 | 7d | 否 |
| `WECHAT_APPID` | 微信 AppID | - | **是** |
| `WECHAT_SECRET` | 微信 Secret | - | **是** |
| `UPLOAD_PATH` | 上传文件路径 | ./uploads | 否 |
| `MAX_FILE_SIZE` | 最大文件大小 | 50MB | 否 |
| `LOG_LEVEL` | 日志级别 | info | 否 |

## 常用命令

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart app

# 查看服务状态
docker-compose ps

# 查看服务资源占用
docker-compose stats
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看应用服务日志
docker-compose logs -f app

# 查看最近 100 行日志
docker-compose logs --tail=100 app

# 查看 MySQL 日志
docker-compose logs -f mysql

# 查看 Redis 日志
docker-compose logs -f redis
```

### 数据库管理

```bash
# 进入 MySQL 容器
docker-compose exec mysql mysql -u root -p

# 执行数据库迁移
docker-compose exec app npm run migrate

# 备份数据库
docker-compose exec mysql mysqldump -u root -p${DB_PASSWORD} wxnode_db > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p${DB_PASSWORD} wxnode_db < backup.sql
```

### 应用调试

```bash
# 进入应用容器
docker-compose exec app sh

# 查看应用进程
docker-compose exec app ps aux

# 查看磁盘占用
docker-compose exec app df -h

# 查看上传文件
docker-compose exec app ls -lh /app/uploads
```

### 镜像管理

```bash
# 重新构建镜像
docker-compose build --no-cache

# 仅构建应用镜像
docker-compose build app

# 拉取最新基础镜像
docker-compose pull

# 清理未使用的镜像
docker image prune -a
```

## 数据持久化

### 持久化数据卷

系统使用以下 Docker volumes 持久化数据：

| 卷名 | 用途 | 容器内路径 | 主机路径 |
|------|------|------------|----------|
| `mysql_data` | MySQL 数据 | `/var/lib/mysql` | Docker 管理 |
| `redis_data` | Redis 数据 | `/data` | Docker 管理 |
| `./uploads` | 文件上传 | `/app/uploads` | `./uploads` |
| `./logs` | 应用日志 | `/app/logs` | `./logs` |
| `./public` | 静态资源 | `/app/public` | `./public` |

### 数据备份

```bash
# 备份所有数据卷
docker run --rm \
  -v wxnode_mysql_data:/data/mysql \
  -v wxnode_redis_data:/data/redis \
  -v $(pwd):/backup \
  alpine tar czf /backup/volumes-backup.tar.gz -C /data .

# 备份应用数据（uploads + logs）
tar czf app-data-backup.tar.gz uploads logs public
```

### 数据恢复

```bash
# 恢复数据卷
docker run --rm \
  -v wxnode_mysql_data:/data/mysql \
  -v wxnode_redis_data:/data/redis \
  -v $(pwd):/backup \
  alpine tar xzf /backup/volumes-backup.tar.gz -C /data

# 恢复应用数据
tar xzf app-data-backup.tar.gz
```

## 故障排查

### 应用无法启动

**问题**：应用容器反复重启

**解决方案**：

```bash
# 1. 查看完整日志
docker-compose logs app

# 2. 检查数据库连接
docker-compose exec app nc -zv mysql 3306

# 3. 检查 Redis 连接
docker-compose exec app nc -zv redis 6379

# 4. 验证环境变量
docker-compose exec app env | grep DB_
```

### 数据库连接失败

**问题**：`Error: connect ECONNREFUSED`

**解决方案**：

```bash
# 1. 确认 MySQL 健康状态
docker-compose ps mysql

# 2. 检查 MySQL 日志
docker-compose logs mysql

# 3. 手动测试连接
docker-compose exec mysql mysqladmin ping -h localhost

# 4. 确认防火墙设置
sudo ufw status
```

### Redis 连接问题

**问题**：Redis 连接被拒绝

**解决方案**：

```bash
# 1. 测试 Redis 连接
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ping

# 2. 查看 Redis 日志
docker-compose logs redis

# 3. 检查密码配置
docker-compose exec app env | grep REDIS_
```

### 文件上传失败

**问题**：无法上传文件或文件丢失

**解决方案**：

```bash
# 1. 检查上传目录权限
ls -ld uploads/

# 2. 确认数据卷挂载
docker-compose exec app ls -la /app/uploads

# 3. 检查磁盘空间
df -h
```

### 内存不足

**问题**：容器因内存不足被 OOM Killer 杀死

**解决方案**：

在 `docker-compose.yml` 中为服务设置内存限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

## 生产环境建议

### 安全加固

1. **修改默认端口**

```yaml
services:
  app:
    ports:
      - "8080:3000"  # 使用非标准端口
```

2. **使用 secrets 管理敏感信息**

```yaml
services:
  app:
    secrets:
      - db_password
      - jwt_secret

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

3. **限制容器资源**

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### 性能优化

1. **启用 MySQL 查询缓存**

```yaml
services:
  mysql:
    command:
      - --query_cache_type=1
      - --query_cache_size=64M
```

2. **增加 Redis 内存**

```yaml
services:
  redis:
    command: >
      redis-server
      --maxmemory 2gb
```

3. **使用反向代理（Nginx）**

创建 `nginx.conf` 并添加 Nginx 服务。

### 监控和日志

1. **集成日志收集**

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"
```

2. **健康检查通知**

配置邮件或 Webhook 通知容器健康状态变化。

### 自动备份

添加定时备份任务（crontab）：

```bash
# 每天凌晨 3 点备份数据库
0 3 * * * cd /path/to/wxnode && docker-compose exec -T mysql mysqldump -u root -p${DB_PASSWORD} wxnode_db | gzip > /backups/wxnode_$(date +\%Y\%m\%d).sql.gz
```

## 更新应用

### 滚动更新

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建镜像
docker-compose build app

# 3. 滚动更新（零停机）
docker-compose up -d --no-deps --build app

# 4. 验证新版本
curl http://localhost:3000/health
```

### 回滚

```bash
# 1. 停止当前版本
docker-compose down

# 2. 切换到稳定版本
git checkout <stable-tag>

# 3. 重新构建和启动
docker-compose up -d --build
```

## 完全卸载

```bash
# 1. 停止并删除所有容器
docker-compose down

# 2. 删除数据卷（警告：会丢失所有数据！）
docker volume rm wxnode_mysql_data wxnode_redis_data

# 3. 删除镜像
docker images | grep wxnode | awk '{print $3}' | xargs docker rmi

# 4. 清理本地文件
rm -rf uploads logs public/question-banks
```

## 技术支持

如遇问题，请提供以下信息：

```bash
# 系统信息
docker version
docker-compose version
uname -a

# 服务状态
docker-compose ps

# 完整日志
docker-compose logs > debug.log
```

---

**最后更新**: 2025-10-31  
**维护者**: 开发团队
