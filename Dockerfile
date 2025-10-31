# ===================================
# Stage 1: Builder - 构建 TypeScript
# ===================================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖（包括 canvas 所需的 Cairo 库）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# 复制依赖文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies）
# 注意：项目使用 pnpm，但 Docker 中使用 npm 以简化配置
RUN npm install

# 复制源代码和配置文件
COPY tsconfig.json ./
COPY src ./src

# 构建 TypeScript
RUN npm run build

# 清理开发依赖，只保留生产依赖
RUN npm prune --production

# 重新安装运行时必需的包（在 devDependencies 但运行时需要）
RUN npm install --no-save tsconfig-paths

# ===================================
# Stage 2: Production - 生产环境
# ===================================
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装运行时依赖（用于 canvas 等 native 模块）
RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib \
    pixman \
    freetype \
    netcat-openbsd

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 复制依赖文件
COPY package*.json ./

# 从 builder 阶段复制已安装的 node_modules
COPY --from=builder /app/node_modules ./node_modules

# 从 builder 阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制必要的配置文件和目录结构
COPY tsconfig.json ./
COPY migrations ./migrations
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# 设置脚本执行权限
RUN chmod +x /app/docker-entrypoint.sh

# 创建必要的目录
RUN mkdir -p uploads logs public/question-banks && \
    chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令
CMD ["node", "-r", "tsconfig-paths/register", "dist/app.js"]
