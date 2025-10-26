# Docker 配置文件清单

## ✅ 已创建的文件

### 核心配置文件

1. **`Dockerfile`** 
   - 多阶段构建配置
   - 生产环境优化
   - 健康检查配置
   - 最小化镜像大小

2. **`.dockerignore`**
   - 排除不必要的文件
   - 减小构建上下文
   - 加快构建速度

3. **`docker-compose.yml`**
   - 完整的服务编排
   - MySQL + 应用 + Redis（可选）
   - 数据持久化配置
   - 健康检查和依赖管理

4. **`docker-compose.dev.yml`**
   - 开发环境配置
   - 仅启动数据库
   - 应用在本地运行

5. **`env.docker.template`**
   - Docker 环境变量模板
   - 包含所有必需配置
   - 详细的配置说明

### 辅助工具

6. **`Makefile`**
   - 30+ 快捷命令
   - 简化 Docker 操作
   - 数据库备份/还原
   - 日志查看和清理

7. **`docker-quick-start.sh`** (Linux/Mac)
   - 一键启动脚本
   - 自动检查环境
   - 交互式配置
   - 健康检查验证

8. **`docker-quick-start.ps1`** (Windows)
   - Windows PowerShell 版本
   - 相同功能和体验

### 文档

9. **`Docker使用指南.md`**
   - 完整的部署指南
   - 常用命令参考
   - 故障排查
   - 最佳实践

10. **`backups/README.md`**
    - 备份目录说明
    - 备份和还原方法

### 其他更新

11. **`.gitignore`**
    - 更新了 Docker 相关忽略规则
    - 添加备份文件忽略

12. **`README.md`**
    - 添加 Docker 部署说明
    - 更新项目结构

---

## 🎯 使用流程

### 生产环境部署

```bash
# 1. 准备配置
cp env.docker.template .env
vim .env  # 修改密码等

# 2. 快速启动（推荐）
./docker-quick-start.sh  # Linux/Mac
.\docker-quick-start.ps1  # Windows

# 3. 或使用 Makefile
make init-db  # 首次启动
make logs     # 查看日志

# 4. 修改 .env 中 DB_INIT=false
# 5. 重启服务
make restart
```

### 开发环境

```bash
# 1. 只启动数据库
make dev
# 或
docker-compose -f docker-compose.dev.yml up -d

# 2. 本地运行应用
npm run dev
```

---

## 📋 快捷命令速查

### 服务管理
```bash
make up          # 启动所有服务
make down        # 停止所有服务
make restart     # 重启服务
make status      # 查看状态
```

### 日志查看
```bash
make logs        # 所有日志
make logs-app    # 应用日志
make logs-db     # 数据库日志
```

### 容器操作
```bash
make shell       # 进入应用容器
make db-shell    # 进入数据库
```

### 数据管理
```bash
make backup      # 备份数据库
make clean       # 清理容器
```

---

## 🔧 配置说明

### 端口映射

| 服务 | 容器端口 | 宿主机端口 | 环境变量 |
|------|---------|-----------|---------|
| 应用 | 3001 | 3001 | APP_PORT |
| MySQL | 3306 | 3306 | MYSQL_PORT |
| Redis | 6379 | 6379 | REDIS_PORT |

### 数据卷

| 卷名 | 用途 | 持久化 |
|------|------|-------|
| mysql_data | MySQL 数据 | Docker Volume |
| redis_data | Redis 数据 | Docker Volume |
| ./uploads | 上传文件 | 宿主机映射 |
| ./logs | 日志文件 | 宿主机映射 |

---

## ⚠️ 重要提示

### 首次启动

1. ✅ 必须设置 `DB_INIT=true`
2. ✅ 修改默认密码（MySQL、JWT）
3. ✅ 等待 MySQL 完全启动（约30秒）
4. ✅ 查看日志确认初始化成功
5. ✅ 将 `DB_INIT` 改为 `false`
6. ✅ 重启服务

### 生产环境

1. 🔒 使用强密码
2. 🔒 不要使用默认密钥
3. 🔒 定期备份数据库
4. 🔒 配置防火墙规则
5. 🔒 使用 HTTPS（配置反向代理）
6. 🔒 限制容器资源使用

### 数据安全

1. 📦 定期备份（建议每天）
2. 📦 测试备份还原
3. 📦 备份文件异地存储
4. 📦 监控磁盘空间

---

## 🐛 常见问题

### 1. 端口已被占用

```bash
# 修改 .env 中的端口
APP_PORT=3002
MYSQL_PORT=3307

# 重启服务
docker-compose up -d
```

### 2. 数据库连接失败

```bash
# 检查 MySQL 是否就绪
docker-compose logs mysql

# 等待更长时间
sleep 30

# 重启应用
docker-compose restart app
```

### 3. 权限问题

```bash
# 修复文件权限
chmod -R 777 uploads logs

# 或在 docker-compose.yml 中添加 user 配置
```

### 4. 环境变量不生效

```bash
# 重新构建（不使用缓存）
docker-compose build --no-cache
docker-compose up -d
```

---

## 📚 相关文档

- [Docker使用指南.md](./Docker使用指南.md) - 详细的 Docker 部署指南
- [API接口文档.md](./API接口文档.md) - 完整的 API 接口文档
- [启动优化说明.md](./启动优化说明.md) - 启动性能优化
- [代码优化说明.md](./代码优化说明.md) - 代码质量优化

---

**创建时间**: 2025-10-26  
**Docker 版本**: 20.10+  
**Docker Compose 版本**: 2.0+

