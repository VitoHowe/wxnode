# 数据库备份目录

此目录用于存储数据库备份文件。

## 使用方法

### 生成备份

使用 Makefile:
```bash
make backup
```

使用 docker-compose:
```bash
docker exec wxnode-mysql mysqldump -u root -p wxnode_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 还原备份

使用 Makefile:
```bash
make restore FILE=backups/backup_20251026_120000.sql
```

使用 docker-compose:
```bash
docker exec -i wxnode-mysql mysql -u root -p wxnode_db < backups/backup_20251026_120000.sql
```

## 备份策略建议

- 每天自动备份一次
- 保留最近7天的备份
- 重要更新前手动备份
- 定期将备份文件转移到其他存储位置

