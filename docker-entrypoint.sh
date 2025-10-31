#!/bin/sh

# 等待 MySQL 数据库就绪
echo "等待 MySQL 数据库就绪..."
max_attempts=30
attempt=0

while ! nc -z ${DB_HOST:-mysql} ${DB_PORT:-3306}; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "错误：MySQL 连接超时！"
    exit 1
  fi
  echo "MySQL 未就绪，等待中... ($attempt/$max_attempts)"
  sleep 2
done
echo "MySQL 已就绪！"

# 等待 Redis 就绪（可选）
if [ -n "$REDIS_HOST" ]; then
  echo "等待 Redis 就绪..."
  attempt=0
  while ! nc -z ${REDIS_HOST:-redis} ${REDIS_PORT:-6379}; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
      echo "警告：Redis 连接超时，继续启动应用..."
      break
    fi
    echo "Redis 未就绪，等待中... ($attempt/$max_attempts)"
    sleep 2
  done
  if [ $attempt -lt $max_attempts ]; then
    echo "Redis 已就绪！"
  fi
fi

# 注意：数据库表结构会在应用启动时自动创建（通过 connectDB 函数）
# 如需执行自定义 SQL 迁移脚本，请在此处添加

echo "准备工作完成，启动应用..."
exec "$@"
