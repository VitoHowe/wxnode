# 依赖安装说明

## 新增依赖

本次更新添加了PDF转图片功能，需要安装新的依赖包。

### 安装命令

```bash
npm install
```

或者单独安装新增的依赖：

```bash
npm install pdf-to-img@^4.1.0
```

## 依赖说明

### pdf-to-img

- **版本**: ^4.1.0
- **用途**: 将PDF文件转换为PNG图片
- **特点**:
  - 纯JavaScript实现，无需外部二进制依赖
  - 支持Node.js v20+
  - 高性能异步处理
  - 支持自定义分辨率

### 为什么选择pdf-to-img？

1. **无外部依赖**: 不需要安装GraphicsMagick、ImageMagick等系统工具
2. **跨平台兼容**: 在Windows、Linux、macOS上都能正常工作
3. **易于部署**: 不需要额外的系统配置
4. **现代化**: 支持最新的Node.js版本和ES模块

## 安装后验证

安装完成后，可以运行以下命令验证TypeScript编译是否正常：

```bash
npx tsc --noEmit
```

如果没有错误输出，说明依赖安装成功。

## 可能的问题

### 1. 模块找不到错误

如果遇到 `找不到模块"pdf-to-img"` 错误：

```bash
# 清理node_modules和package-lock.json
rm -rf node_modules package-lock.json
# 重新安装
npm install
```

### 2. TypeScript类型错误

`pdf-to-img` 包含内置的TypeScript类型定义，不需要额外安装 `@types` 包。

### 3. Node.js版本要求

确保使用Node.js v20或更高版本：

```bash
node --version
```

如果版本过低，请升级Node.js。

## 开发环境启动

安装完依赖后，可以启动开发服务器：

```bash
npm run dev
```

## 生产环境部署

构建生产版本：

```bash
npm run build
npm start
```

## 功能测试

安装完成后，建议测试以下功能：

1. **文本文件解析**: 上传.txt或.md文件
2. **图片文件解析**: 上传.jpg或.png文件
3. **PDF文件解析**: 上传PDF文件（单页和多页）
4. **不同AI提供商**: 测试OpenAI、Gemini、Qwen

## 性能建议

PDF转图片是CPU密集型操作，建议：

1. 限制并发解析任务数量
2. 为大文件设置合理的超时时间
3. 监控服务器内存使用情况
4. 考虑使用队列系统处理大量文件

## 回滚方案

如果遇到问题需要回滚到之前的版本：

1. 从package.json中移除 `pdf-to-img` 依赖
2. 恢复 `fileContentReader.ts` 中的简化版本
3. 重新安装依赖：`npm install`

## 技术支持

如有问题，请查看：
- [pdf-to-img GitHub](https://github.com/jbmoelker/pdf-to-img)
- [pdf-to-img npm](https://www.npmjs.com/package/pdf-to-img)
- 项目文档: `docs/文件内容读取升级说明.md`
