# PDF转图片功能测试指南

## 功能概述

本系统现已支持将PDF文件的每一页转换为高清PNG图片，然后发送给AI进行解析。这对于图片式PDF（扫描件）特别有效。

## 测试准备

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm run dev
```

## 测试场景

### 场景1: 单页文本PDF

**测试目的**: 验证单页PDF的处理

**步骤**:
1. 准备一个单页PDF文件（包含题目内容）
2. 通过API上传文件
3. 选择OpenAI provider进行解析
4. 观察日志输出

**预期结果**:
- 日志显示: `开始将PDF转换为图片`
- 日志显示: `PDF转换完成，共1页`
- 返回类型为 `base64`（单页优化）
- 成功解析出题目

### 场景2: 多页文本PDF

**测试目的**: 验证多页PDF的处理

**步骤**:
1. 准备一个多页PDF文件（3-5页）
2. 通过API上传文件
3. 选择OpenAI provider进行解析
4. 观察日志输出

**预期结果**:
- 日志显示每页的转换进度
- 返回类型为 `base64_array`
- 所有页面的题目都被解析

### 场景3: 图片式PDF（扫描件）

**测试目的**: 验证对扫描PDF的OCR能力

**步骤**:
1. 准备一个扫描的PDF文件
2. 通过API上传文件
3. 选择支持vision的OpenAI模型（如gpt-4-vision-preview）
4. 观察解析结果

**预期结果**:
- PDF成功转换为图片
- AI能够识别图片中的文字
- 成功提取题目内容

### 场景4: Gemini处理PDF

**测试目的**: 验证Gemini的PDF处理

**步骤**:
1. 准备一个PDF文件
2. 选择Gemini provider
3. 观察处理方式

**预期结果**:
- Gemini直接接收PDF的base64（不转图片）
- 返回类型为 `base64`
- 成功解析题目

### 场景5: 大文件处理

**测试目的**: 验证大文件的处理性能

**步骤**:
1. 准备一个10页以上的PDF
2. 上传并解析
3. 监控服务器资源使用

**预期结果**:
- 转换过程稳定
- 内存使用在合理范围
- 没有超时错误

### 场景6: 错误处理

**测试目的**: 验证错误降级机制

**步骤**:
1. 准备一个损坏的PDF文件
2. 尝试上传解析

**预期结果**:
- 日志显示: `PDF转图片失败，降级为直接返回PDF的base64格式`
- 系统不会崩溃
- 返回适当的错误信息

## API测试示例

### 1. 上传文件

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf" \
  -F "name=测试PDF" \
  -F "description=测试PDF转图片功能"
```

### 2. 解析文件

```bash
curl -X POST http://localhost:3000/api/files/{fileId}/parse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": 1,
    "modelName": "gpt-4-vision-preview"
  }'
```

### 3. 查看解析状态

```bash
curl -X GET http://localhost:3000/api/files/{fileId}/parse-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 日志监控

在测试过程中，关注以下日志：

### 成功日志

```
[INFO] 开始将PDF转换为图片: /path/to/file.pdf
[DEBUG] 已转换PDF第1页
[DEBUG] 已转换PDF第2页
[INFO] PDF转换完成，共2页
[INFO] AI解析成功
```

### 错误日志

```
[ERROR] PDF转图片失败: [错误信息]
[WARN] PDF转图片失败，降级为直接返回PDF的base64格式
```

## 性能基准

### 预期处理时间

| PDF页数 | 转换时间 | AI解析时间 | 总时间 |
|---------|----------|------------|--------|
| 1页     | 1-2秒    | 5-10秒     | 6-12秒 |
| 5页     | 3-5秒    | 15-30秒    | 18-35秒|
| 10页    | 6-10秒   | 30-60秒    | 36-70秒|

*注: 实际时间取决于PDF复杂度、服务器性能和AI响应速度*

### 内存使用

- 单页PDF: ~50MB
- 5页PDF: ~150MB
- 10页PDF: ~300MB

## 常见问题排查

### 1. 转换失败

**症状**: 日志显示PDF转图片失败

**可能原因**:
- PDF文件损坏
- PDF使用了不支持的加密
- 内存不足

**解决方案**:
- 检查PDF文件完整性
- 尝试重新生成PDF
- 增加服务器内存

### 2. AI无法识别内容

**症状**: 转换成功但AI返回空结果

**可能原因**:
- 图片分辨率过低
- PDF内容模糊
- AI模型不支持vision功能

**解决方案**:
- 调整scale参数（在fileContentReader.ts中）
- 使用更清晰的PDF
- 确认使用支持vision的模型

### 3. 处理速度慢

**症状**: 大文件处理时间过长

**可能原因**:
- PDF页数过多
- 服务器性能不足
- 网络延迟

**解决方案**:
- 限制单次上传的页数
- 升级服务器配置
- 使用队列系统异步处理

## 优化建议

### 1. 调整分辨率

在 `fileContentReader.ts` 中修改scale参数：

```typescript
const document = await pdf(filePath, {
  scale: 2.0, // 降低到1.5可以提高速度，提高到3.0可以提高质量
});
```

### 2. 限制页数

添加页数限制逻辑：

```typescript
let pageCount = 0;
const MAX_PAGES = 20; // 最多处理20页

for await (const image of document) {
  if (pageCount >= MAX_PAGES) {
    logger.warn(`PDF页数超过限制(${MAX_PAGES})，仅处理前${MAX_PAGES}页`);
    break;
  }
  // ... 处理逻辑
}
```

### 3. 添加缓存

对于重复解析的PDF，可以缓存转换结果：

```typescript
// 使用Redis缓存base64数据
const cacheKey = `pdf_images_${fileHash}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}
```

## 测试清单

- [ ] 单页PDF转换
- [ ] 多页PDF转换
- [ ] 图片式PDF识别
- [ ] Gemini provider测试
- [ ] OpenAI provider测试
- [ ] Qwen provider测试
- [ ] 大文件处理
- [ ] 错误降级机制
- [ ] 并发处理
- [ ] 内存使用监控
- [ ] 日志输出正确
- [ ] API响应正常

## 总结

完成所有测试后，确认：

1. ✅ PDF转图片功能正常工作
2. ✅ 不同provider都能正确处理
3. ✅ 错误处理机制有效
4. ✅ 性能在可接受范围内
5. ✅ 日志输出完整清晰

如有任何问题，请查看详细文档或联系技术支持。
