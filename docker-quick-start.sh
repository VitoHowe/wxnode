#!/bin/bash

# 微信小程序题库管理系统 - Docker 快速启动脚本

set -e

echo "========================================="
echo "  微信小程序题库管理系统 Docker 部署"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker 环境检查通过${NC}"
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}! 未找到 .env 文件，正在创建...${NC}"
    
    if [ -f env.docker.template ]; then
        cp env.docker.template .env
        echo -e "${GREEN}✓ 已从模板创建 .env 文件${NC}"
        echo -e "${YELLOW}! 请编辑 .env 文件，设置必要的配置（数据库密码、JWT密钥等）${NC}"
        echo ""
        read -p "按回车键继续编辑 .env 文件..." 
        ${EDITOR:-vim} .env
    else
        echo -e "${RED}错误: 找不到 env.docker.template 模板文件${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ 找到 .env 文件${NC}"
fi

echo ""
echo "当前配置："
echo "----------------------------------------"
grep -E "^(DB_NAME|DB_USER|APP_PORT|DB_INIT|ENABLE_REDIS)=" .env | sed 's/^/  /'
echo "----------------------------------------"
echo ""

# 询问是否继续
read -p "是否使用以上配置启动服务？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

echo ""
echo -e "${GREEN}开始启动服务...${NC}"
echo ""

# 停止现有服务
echo "1️⃣  停止现有服务..."
docker-compose down 2>/dev/null || true

# 构建镜像
echo ""
echo "2️⃣  构建应用镜像..."
docker-compose build

# 启动服务
echo ""
echo "3️⃣  启动服务..."
docker-compose up -d

# 等待服务启动
echo ""
echo "4️⃣  等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "5️⃣  检查服务状态..."
docker-compose ps

# 健康检查
echo ""
echo "6️⃣  执行健康检查..."
sleep 5

if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✓ 应用服务运行正常${NC}"
    echo ""
    curl -s http://localhost:3001/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3001/health
else
    echo -e "${RED}✗ 应用服务异常${NC}"
    echo ""
    echo "查看日志:"
    docker-compose logs --tail=50 app
    exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}  🎉 部署成功！${NC}"
echo "========================================="
echo ""
echo "服务地址："
echo "  • API 地址: http://localhost:3001"
echo "  • 健康检查: http://localhost:3001/health"
echo "  • API 文档: http://localhost:3001/api-docs"
echo ""
echo "常用命令："
echo "  • 查看日志: docker-compose logs -f"
echo "  • 停止服务: docker-compose down"
echo "  • 重启服务: docker-compose restart"
echo "  • 进入容器: docker-compose exec app sh"
echo ""
echo "提示："
echo "  如果是首次启动，请确保 .env 中 DB_INIT=true"
echo "  初始化完成后，将其改为 DB_INIT=false 并重启服务"
echo ""

