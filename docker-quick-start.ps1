# 微信小程序题库管理系统 - Docker 快速启动脚本 (Windows PowerShell)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  微信小程序题库管理系统 Docker 部署" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否安装
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker 已安装: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: Docker 未安装" -ForegroundColor Red
    Write-Host "请先安装 Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
    exit 1
}

# 检查 Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-Host "✓ Docker Compose 已安装: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: Docker Compose 未安装" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 检查 .env 文件
if (-not (Test-Path .env)) {
    Write-Host "! 未找到 .env 文件，正在创建..." -ForegroundColor Yellow
    
    if (Test-Path env.docker.template) {
        Copy-Item env.docker.template .env
        Write-Host "✓ 已从模板创建 .env 文件" -ForegroundColor Green
        Write-Host "! 请编辑 .env 文件，设置必要的配置（数据库密码、JWT密钥等）" -ForegroundColor Yellow
        Write-Host ""
        
        $edit = Read-Host "是否现在编辑 .env 文件？(y/n)"
        if ($edit -eq 'y' -or $edit -eq 'Y') {
            notepad .env
        }
    } else {
        Write-Host "错误: 找不到 env.docker.template 模板文件" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ 找到 .env 文件" -ForegroundColor Green
}

Write-Host ""
Write-Host "当前配置：" -ForegroundColor Cyan
Write-Host "----------------------------------------"
Get-Content .env | Select-String -Pattern "^(DB_NAME|DB_USER|APP_PORT|DB_INIT|ENABLE_REDIS)=" | ForEach-Object { Write-Host "  $_" }
Write-Host "----------------------------------------"
Write-Host ""

# 询问是否继续
$continue = Read-Host "是否使用以上配置启动服务？(y/n)"
if ($continue -ne 'y' -and $continue -ne 'Y') {
    Write-Host "已取消"
    exit 0
}

Write-Host ""
Write-Host "开始启动服务..." -ForegroundColor Green
Write-Host ""

# 停止现有服务
Write-Host "1️⃣  停止现有服务..." -ForegroundColor Cyan
docker-compose down 2>$null

# 构建镜像
Write-Host ""
Write-Host "2️⃣  构建应用镜像..." -ForegroundColor Cyan
docker-compose build

# 启动服务
Write-Host ""
Write-Host "3️⃣  启动服务..." -ForegroundColor Cyan
docker-compose up -d

# 等待服务启动
Write-Host ""
Write-Host "4️⃣  等待服务启动..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# 检查服务状态
Write-Host ""
Write-Host "5️⃣  检查服务状态..." -ForegroundColor Cyan
docker-compose ps

# 健康检查
Write-Host ""
Write-Host "6️⃣  执行健康检查..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ 应用服务运行正常" -ForegroundColor Green
        Write-Host ""
        Write-Host $response.Content
    }
} catch {
    Write-Host "✗ 应用服务异常" -ForegroundColor Red
    Write-Host ""
    Write-Host "查看日志:"
    docker-compose logs --tail=50 app
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  🎉 部署成功！" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务地址：" -ForegroundColor Cyan
Write-Host "  • API 地址: http://localhost:3001" -ForegroundColor White
Write-Host "  • 健康检查: http://localhost:3001/health" -ForegroundColor White
Write-Host "  • API 文档: http://localhost:3001/api-docs" -ForegroundColor White
Write-Host ""
Write-Host "常用命令：" -ForegroundColor Cyan
Write-Host "  • 查看日志: docker-compose logs -f" -ForegroundColor White
Write-Host "  • 停止服务: docker-compose down" -ForegroundColor White
Write-Host "  • 重启服务: docker-compose restart" -ForegroundColor White
Write-Host "  • 进入容器: docker-compose exec app sh" -ForegroundColor White
Write-Host ""
Write-Host "提示：" -ForegroundColor Yellow
Write-Host "  如果是首次启动，请确保 .env 中 DB_INIT=true"
Write-Host "  初始化完成后，将其改为 DB_INIT=false 并重启服务"
Write-Host ""

