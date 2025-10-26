# Makefile for wxnode project
.PHONY: help build up down logs restart clean dev prod init-db backup

# 默认目标
help:
	@echo "可用命令："
	@echo "  make build      - 构建 Docker 镜像"
	@echo "  make up         - 启动所有服务"
	@echo "  make down       - 停止所有服务"
	@echo "  make logs       - 查看日志"
	@echo "  make restart    - 重启服务"
	@echo "  make clean      - 清理容器和镜像"
	@echo "  make dev        - 启动开发环境（仅数据库）"
	@echo "  make prod       - 启动生产环境"
	@echo "  make init-db    - 初始化数据库"
	@echo "  make backup     - 备份数据库"
	@echo "  make shell      - 进入应用容器"
	@echo "  make db-shell   - 进入数据库容器"

# 构建镜像
build:
	docker-compose build

# 启动所有服务
up:
	docker-compose up -d

# 启动服务并查看日志
up-logs:
	docker-compose up

# 停止所有服务
down:
	docker-compose down

# 查看日志
logs:
	docker-compose logs -f

# 查看应用日志
logs-app:
	docker-compose logs -f app

# 查看数据库日志
logs-db:
	docker-compose logs -f mysql

# 重启服务
restart:
	docker-compose restart

# 重启应用
restart-app:
	docker-compose restart app

# 清理容器和镜像
clean:
	docker-compose down -v
	docker system prune -f

# 开发环境（仅启动数据库）
dev:
	docker-compose -f docker-compose.dev.yml up -d

# 生产环境
prod:
	docker-compose up -d

# 初始化数据库（首次启动）
init-db:
	DB_INIT=true docker-compose up -d

# 备份数据库
backup:
	@echo "备份数据库..."
	@mkdir -p backups
	@docker exec wxnode-mysql mysqldump -u root -p$$MYSQL_ROOT_PASSWORD wxnode_db > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "备份完成: backups/backup_$$(date +%Y%m%d_%H%M%S).sql"

# 还原数据库
restore:
	@echo "请指定备份文件: make restore-db FILE=backups/backup_xxx.sql"

restore-db:
	@echo "还原数据库..."
	@docker exec -i wxnode-mysql mysql -u root -p$$MYSQL_ROOT_PASSWORD wxnode_db < $(FILE)
	@echo "还原完成"

# 进入应用容器
shell:
	docker exec -it wxnode-app sh

# 进入数据库容器
db-shell:
	docker exec -it wxnode-mysql mysql -u root -p

# 查看服务状态
status:
	docker-compose ps

# 查看资源使用
stats:
	docker stats wxnode-app wxnode-mysql

# 清理日志
clean-logs:
	rm -rf logs/*.log
	docker-compose exec app sh -c "rm -rf /app/logs/*.log"

# 安装依赖（本地）
install:
	pnpm install

# 本地运行
run:
	pnpm run dev

# 构建（本地）
build-local:
	pnpm run build

