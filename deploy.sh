#!/bin/bash

# ===================================
# 微信小程序题库管理系统 - 快速部署脚本
# ===================================

set -e

echo "================================================"
echo "  微信小程序题库管理系统 Docker 部署工具"
echo "================================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker 和 docker-compose
check_requirements() {
    echo "检查系统依赖..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: 未安装 Docker${NC}"
        echo "请访问 https://docs.docker.com/get-docker/ 安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}错误: 未安装 docker-compose${NC}"
        echo "请访问 https://docs.docker.com/compose/install/ 安装 docker-compose"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker 已安装: $(docker --version)${NC}"
    echo -e "${GREEN}✓ docker-compose 已安装: $(docker-compose --version)${NC}"
    echo ""
}

# 检查并创建 .env 文件
setup_env() {
    echo "配置环境变量..."
    
    if [ -f .env ]; then
        echo -e "${YELLOW}⚠ .env 文件已存在${NC}"
        read -p "是否覆盖现有配置? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "跳过环境变量配置"
            return
        fi
    fi
    
    if [ ! -f .env.example ]; then
        echo -e "${RED}错误: .env.example 文件不存在${NC}"
        exit 1
    fi
    
    cp .env.example .env
    echo -e "${GREEN}✓ 已创建 .env 文件${NC}"
    
    echo ""
    echo -e "${YELLOW}重要提示: 请编辑 .env 文件，修改以下配置:${NC}"
    echo "  - DB_PASSWORD (数据库密码)"
    echo "  - REDIS_PASSWORD (Redis 密码)"
    echo "  - JWT_SECRET (JWT 密钥)"
    echo "  - JWT_REFRESH_SECRET (刷新令牌密钥)"
    echo "  - WECHAT_APPID (微信 AppID)"
    echo "  - WECHAT_SECRET (微信 Secret)"
    echo ""
    
    read -p "是否现在编辑 .env 文件? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-vi} .env
    else
        echo -e "${YELLOW}⚠ 请在启动服务前手动编辑 .env 文件${NC}"
    fi
    
    echo ""
}

# 创建必要的目录
create_directories() {
    echo "创建必要的目录..."
    
    mkdir -p uploads
    mkdir -p logs
    mkdir -p public/question-banks
    
    echo -e "${GREEN}✓ 目录创建完成${NC}"
    echo ""
}

# 构建镜像
build_images() {
    echo "开始构建 Docker 镜像..."
    echo "这可能需要几分钟时间，请耐心等待..."
    echo ""
    
    if docker-compose build; then
        echo -e "${GREEN}✓ 镜像构建成功${NC}"
    else
        echo -e "${RED}✗ 镜像构建失败${NC}"
        exit 1
    fi
    echo ""
}

# 启动服务
start_services() {
    echo "启动服务..."
    
    if docker-compose up -d; then
        echo -e "${GREEN}✓ 服务启动成功${NC}"
    else
        echo -e "${RED}✗ 服务启动失败${NC}"
        exit 1
    fi
    echo ""
}

# 等待服务就绪
wait_for_services() {
    echo "等待服务就绪..."
    
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 服务已就绪${NC}"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo "等待中... ($attempt/$max_attempts)"
        sleep 2
    done
    
    echo -e "${YELLOW}⚠ 服务启动超时，请检查日志: docker-compose logs app${NC}"
    return 1
}

# 显示服务状态
show_status() {
    echo ""
    echo "================================================"
    echo "  服务状态"
    echo "================================================"
    docker-compose ps
    echo ""
}

# 显示访问信息
show_info() {
    echo "================================================"
    echo "  部署完成！"
    echo "================================================"
    echo ""
    echo -e "${GREEN}服务地址:${NC}"
    echo "  - 健康检查: http://localhost:3000/health"
    echo "  - API 文档:  http://localhost:3000/api-docs"
    echo ""
    echo -e "${GREEN}常用命令:${NC}"
    echo "  - 查看日志:   docker-compose logs -f app"
    echo "  - 停止服务:   docker-compose down"
    echo "  - 重启服务:   docker-compose restart"
    echo "  - 查看状态:   docker-compose ps"
    echo ""
    echo -e "${YELLOW}详细文档:${NC}"
    echo "  请查看 DOCKER_DEPLOYMENT.md 了解更多信息"
    echo ""
    echo "================================================"
}

# 主函数
main() {
    check_requirements
    setup_env
    create_directories
    build_images
    start_services
    
    if wait_for_services; then
        show_status
        show_info
    else
        show_status
        echo -e "${YELLOW}提示: 服务可能仍在启动中，请稍后访问或查看日志${NC}"
    fi
}

# 执行主函数
main
