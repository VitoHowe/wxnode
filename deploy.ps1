# ===================================
# 微信小程序题库管理系统 - Windows 快速部署脚本
# ===================================

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  微信小程序题库管理系统 Docker 部署工具" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 和 docker-compose
function Check-Requirements {
    Write-Host "检查系统依赖..." -ForegroundColor Yellow
    
    # 检查 Docker
    try {
        $dockerVersion = docker --version
        Write-Host "✓ Docker 已安装: $dockerVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ 错误: 未安装 Docker" -ForegroundColor Red
        Write-Host "请访问 https://docs.docker.com/desktop/windows/install/ 安装 Docker Desktop" -ForegroundColor Red
        exit 1
    }
    
    # 检查 docker-compose
    try {
        $composeVersion = docker-compose --version
        Write-Host "✓ docker-compose 已安装: $composeVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ 错误: 未安装 docker-compose" -ForegroundColor Red
        Write-Host "Docker Desktop 应该已包含 docker-compose，请检查安装" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
}

# 检查并创建 .env 文件
function Setup-Environment {
    Write-Host "配置环境变量..." -ForegroundColor Yellow
    
    if (Test-Path .env) {
        Write-Host "⚠ .env 文件已存在" -ForegroundColor Yellow
        $response = Read-Host "是否覆盖现有配置? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Host "跳过环境变量配置" -ForegroundColor Gray
            return
        }
    }
    
    if (-not (Test-Path .env.example)) {
        Write-Host "✗ 错误: .env.example 文件不存在" -ForegroundColor Red
        exit 1
    }
    
    Copy-Item .env.example .env
    Write-Host "✓ 已创建 .env 文件" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "重要提示: 请编辑 .env 文件，修改以下配置:" -ForegroundColor Yellow
    Write-Host "  - DB_PASSWORD (数据库密码)" -ForegroundColor Cyan
    Write-Host "  - REDIS_PASSWORD (Redis 密码)" -ForegroundColor Cyan
    Write-Host "  - JWT_SECRET (JWT 密钥)" -ForegroundColor Cyan
    Write-Host "  - JWT_REFRESH_SECRET (刷新令牌密钥)" -ForegroundColor Cyan
    Write-Host "  - WECHAT_APPID (微信 AppID)" -ForegroundColor Cyan
    Write-Host "  - WECHAT_SECRET (微信 Secret)" -ForegroundColor Cyan
    Write-Host ""
    
    $response = Read-Host "是否现在编辑 .env 文件? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        notepad .env
        Write-Host "等待编辑完成..." -ForegroundColor Gray
        Read-Host "编辑完成后按 Enter 继续"
    }
    else {
        Write-Host "⚠ 请在启动服务前手动编辑 .env 文件" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# 创建必要的目录
function Create-Directories {
    Write-Host "创建必要的目录..." -ForegroundColor Yellow
    
    $directories = @("uploads", "logs", "public\question-banks")
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    Write-Host "✓ 目录创建完成" -ForegroundColor Green
    Write-Host ""
}

# 构建镜像
function Build-Images {
    Write-Host "开始构建 Docker 镜像..." -ForegroundColor Yellow
    Write-Host "这可能需要几分钟时间，请耐心等待..." -ForegroundColor Gray
    Write-Host ""
    
    try {
        docker-compose build
        Write-Host "✓ 镜像构建成功" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ 镜像构建失败" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# 启动服务
function Start-Services {
    Write-Host "启动服务..." -ForegroundColor Yellow
    
    try {
        docker-compose up -d
        Write-Host "✓ 服务启动成功" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ 服务启动失败" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# 等待服务就绪
function Wait-ForServices {
    Write-Host "等待服务就绪..." -ForegroundColor Yellow
    
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                Write-Host "✓ 服务已就绪" -ForegroundColor Green
                return $true
            }
        }
        catch {
            # 忽略错误，继续等待
        }
        
        $attempt++
        Write-Host "等待中... ($attempt/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
    
    Write-Host "⚠ 服务启动超时，请检查日志: docker-compose logs app" -ForegroundColor Yellow
    return $false
}

# 显示服务状态
function Show-Status {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  服务状态" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    docker-compose ps
    Write-Host ""
}

# 显示访问信息
function Show-Info {
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  部署完成！" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "服务地址:" -ForegroundColor Green
    Write-Host "  - 健康检查: http://localhost:3000/health" -ForegroundColor Cyan
    Write-Host "  - API 文档:  http://localhost:3000/api-docs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "常用命令:" -ForegroundColor Green
    Write-Host "  - 查看日志:   docker-compose logs -f app" -ForegroundColor Cyan
    Write-Host "  - 停止服务:   docker-compose down" -ForegroundColor Cyan
    Write-Host "  - 重启服务:   docker-compose restart" -ForegroundColor Cyan
    Write-Host "  - 查看状态:   docker-compose ps" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "详细文档:" -ForegroundColor Yellow
    Write-Host "  请查看 DOCKER_DEPLOYMENT.md 了解更多信息" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
}

# 主函数
function Main {
    Check-Requirements
    Setup-Environment
    Create-Directories
    Build-Images
    Start-Services
    
    if (Wait-ForServices) {
        Show-Status
        Show-Info
    }
    else {
        Show-Status
        Write-Host "提示: 服务可能仍在启动中，请稍后访问或查看日志" -ForegroundColor Yellow
    }
}

# 执行主函数
Main
