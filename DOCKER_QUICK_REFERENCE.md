# 🐳 Docker 快速参考

## ⚡ 一键启动

### Windows
```powershell
.\docker-quick-start.ps1
```

### Linux/Mac
```bash
chmod +x docker-quick-start.sh
./docker-quick-start.sh
```

---

## 📋 Makefile 命令速查表

| 命令 | 功能 |
|------|------|
| `make help` | 查看所有命令 |
| `make up` | 启动服务 |
| `make down` | 停止服务 |
| `make restart` | 重启服务 |
| `make logs` | 查看日志 |
| `make shell` | 进入应用容器 |
| `make db-shell` | 进入数据库 |
| `make backup` | 备份数据库 |
| `make status` | 查看状态 |
| `make clean` | 清理容器 |

---

## 🔧 常用操作

### 首次部署
```bash
cp env.docker.template .env
vim .env  # DB_INIT=true
make init-db
# 修改 .env: DB_INIT=false
make restart
```

### 查看日志
```bash
make logs           # 所有日志
make logs-app       # 应用日志
make logs-db        # 数据库日志
docker-compose logs -f --tail=100
```

### 进入容器
```bash
make shell          # 应用容器
make db-shell       # MySQL
docker-compose exec app sh
```

### 重启服务
```bash
make restart        # 重启所有
make restart-app    # 只重启应用
docker-compose restart app
```

### 更新代码
```bash
git pull
docker-compose build
docker-compose up -d
```

---

## 🗄️ 数据库操作

### 备份
```bash
make backup
# 文件位置: backups/backup_YYYYMMdd_HHMMSS.sql
```

### 还原
```bash
make restore FILE=backups/backup_20251026_120000.sql
```

### 直接操作
```bash
# 进入 MySQL
docker-compose exec mysql mysql -u root -p

# 导出
docker exec wxnode-mysql mysqldump -u root -pPASSWORD wxnode_db > backup.sql

# 导入
docker exec -i wxnode-mysql mysql -u root -pPASSWORD wxnode_db < backup.sql
```

---

## 🔍 故障排查

### 服务状态
```bash
docker-compose ps
docker ps | grep wxnode
```

### 资源使用
```bash
docker stats wxnode-app wxnode-mysql
```

### 网络诊断
```bash
docker-compose exec app ping mysql
docker-compose exec app nc -zv mysql 3306
```

### 查看环境变量
```bash
docker-compose exec app env | grep DB
```

### 重新构建
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 🌐 服务地址

| 服务 | URL |
|------|-----|
| 健康检查 | http://localhost:3001/health |
| API文档 | http://localhost:3001/api-docs |
| API接口 | http://localhost:3001/api |

---

## 🔐 安全检查清单

- [ ] 修改了默认的 MySQL root 密码
- [ ] 修改了默认的数据库用户密码
- [ ] 修改了 JWT_SECRET 和 JWT_REFRESH_SECRET
- [ ] 配置了微信小程序 AppID 和 Secret
- [ ] 设置了合适的日志级别
- [ ] 限制了容器资源使用
- [ ] 配置了数据备份策略
- [ ] 设置了防火墙规则
- [ ] 使用 HTTPS（反向代理）

---

## 📊 性能优化

### 限制资源使用
在 `docker-compose.yml` 中添加：
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

### 日志轮转
```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 🆘 紧急操作

### 停止所有服务
```bash
docker-compose down
```

### 完全清理（⚠️ 会删除数据）
```bash
docker-compose down -v
docker system prune -a -f
```

### 仅重启应用（不影响数据库）
```bash
docker-compose restart app
```

### 回滚到之前的版本
```bash
git checkout <commit-hash>
docker-compose build
docker-compose up -d
```

---

## 📞 获取帮助

1. 查看完整文档: [Docker使用指南.md](./Docker使用指南.md)
2. 查看 API 文档: [API接口文档.md](./API接口文档.md)
3. 运行 `make help` 查看所有可用命令
4. 查看日志: `make logs`

---

**最后更新**: 2025-10-26

