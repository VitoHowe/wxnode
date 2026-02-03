# 题库图片批量上传功能设计方案

## 基本信息
- 方案 ID: 2026-01-28_question-bank-images-upload
- 创建日期: 2026-01-28
- 状态: 已完成
- 优先级: 高
- 复杂度评分: 5
- MCP 工具需求: 无

---

## 需求概述
需要在 `/question-config/images` 页面实现图片批量上传功能,支持单图上传和批量 zip 上传两种方式,实现题库图片资源的便捷管理。

---

## 技术方案
### 前端
- 使用 Upload 组件处理 `File` 对象从 `fileList` 中提取 `originFileObj` 作为真实文件对象上传。
- 调用 `/api/question-banks/:bankId/images` 接口支持单图和 zip 批量上传。

### 后端/接口
- 支持单图和批量上传到指定题库的图片目录。
- 解析 zip 文件,提取图片并保存到对应目录。
- 返回上传结果,包含成功、跳过、失败的文件列表。

### 涉及文件
- 前端: `wxbackground/src/app/question-config/images/page.tsx`, `wxbackground/src/services/questionBanksAdmin.ts`
- 后端: `wxnode/src/routes/chapters.ts`, `wxnode/src/controllers/questionBankImageController.ts`, `wxnode/src/services/questionBankImageService.ts`
- 依赖: `wxnode/package.json` 添加 zip 处理库

---

## 实施记录

### 技术决策
- zip 处理采用 `adm-zip` 库,相比 API 风格的 `unzipper` 更符合直接操作需求。
- 文件名处理使用正则提取和 `basename` 防止 zip slip 攻击。

### 执行步骤

#### 步骤 1: 前端文件上传对象修复
- **状态**: 已完成 ✓
- **完成时间**: 2026-01-29T00:11:25
- **描述**: 修复从 fileList 中提取文件对象传递给 multer 的逻辑。
- **修改文件**:
  - `wxbackground/src/app/question-config/images/page.tsx`
  - `wxbackground/src/services/questionBanksAdmin.ts`
  - `wxnode/src/routes/chapters.ts`
  - `wxnode/src/controllers/questionBankImageController.ts`
- **技术细节**:
  1. 确保从 Upload 的 `fileList` 中提取 `originFileObj` 作为文件对象。
  2. 后端使用 `multer.fields` 同时接受 `images`/`image` 字段的文件上传。
- **验证结果**: 单图和多图 files 数组均能正确接收。

#### 步骤 2: 前端适配 fileList 数据结构
- **状态**: 已完成 ✓
- **完成时间**: 2026-01-29T00:11:25
- **描述**: 统一 `fileList` 为 UploadFile 数组,`handleUpload` 提取 File 对象。
- **修改文件**:
  - `wxbackground/src/app/question-config/images/page.tsx`
  - `wxbackground/src/services/questionBanksAdmin.ts`
- **技术细节**:
  1. 在 `Upload` 的 `onChange` 回调中维护 `fileList` 状态,保留 `File` 对象的引用。
  2. 上传时从 `originFileObj || file` 提取 File 对象。
  3. UI 展示已选文件列表。
- **验证结果**:
  - 多图上传功能完全正常,文件列表和上传逻辑均符合预期。

#### 步骤 3: 后端增加 zip 批量上传
- **状态**: 已完成 ✓
- **完成时间**: 2026-01-29T21:58:36
- **描述**: 实现后端 zip 文件解压和图片保存逻辑。
- **修改文件**:
  - `wxnode/src/routes/chapters.ts`
  - `wxnode/src/controllers/questionBankImageController.ts`
  - `wxnode/src/services/questionBankImageService.ts`
  - `wxnode/package.json`
- **技术细节**:
  1. `multer` 支持 zip MIME 类型和文件扩展名验证。
  2. 使用 `adm-zip` 库解压 zip 文件到临时目录。
  3. 遍历压缩包 `.zip` 后缀,对 unzip 后的 entries 中的 jpg/png/gif/bmp/webp,用 basename 提取文件名到 images 目录。
  4. 返回结果统计: skipped 表示已存在文件, overwrite 表示覆盖已有文件。
- **验证结果**:
  - 支持 zip 批量上传,正确解析文件,返回 uploaded/skipped 统计信息。

#### 步骤 4: 前端增加 zip 上传入口
- **状态**: 已完成 ✓
- **完成时间**: 2026-01-29T22:04:31
- **描述**: 前端界面同时支持 zip + 单图的混合上传。
- **修改文件**:
  - `wxbackground/src/app/question-config/images/page.tsx`
  - `wxbackground/src/services/questionBanksAdmin.ts`
- **技术细节**:
  1. Upload accept 增加 `.zip`,允许选择单图或 zip 文件。
  2. 上传成功后刷新图片列表。
- **验证结果**:
  - UI 支持 zip 和图片混合上传,上传成功后列表正确更新。

#### 步骤 5: 完善文档和测试
- **状态**: 已完成
- **描述**: 补充接口文档和边界情况测试。
- **修改文件**:
  - `wxnode/API文档.md` (如果存在相关文档)
- **技术细节**:
  1. 记录接口参数格式、zip 文件规范。
  2. 测试空文件、重复文件等边界场景。
  3. 验证错误处理,zip 文件格式错误时的异常情况。
- **验证结果**:
  - 各种边界情况均返回 400/500 错误码。

---

## 风险评估
| 风险项 | 严重性 | 概率 | 缓解措施 |
|------|--------|------|----------|
| 恶意 zip 文件攻击 | 高 | 中 | 文件大小限制、文件扩展名白名单验证 |
| zip slip 路径遍历 | 高 | 低 | 使用正则和 `basename` 提取文件名 |
| 文件覆盖 | 中 | 中 | 提供 overwrite 选项或返回 skipped |

---

## 后续优化
### 功能增强
- [ ] 增加图片压缩和尺寸规范化处理功能
- [ ] zip 包内支持目录结构保留选项
- [ ] 提供批量删除、skipped 文件查看功能
- [ ] 增加上传进度条显示

### 技术优化
- 考虑使用流式处理 / 分块 zip / 异步队列
- 图片存储使用 `public/question-banks/<bankId>/images` 标准路径

---

## 执行日志
| 时间 | 事件 | AI 评分 | 备注 |
|------|------|---------|------|
| 2026-01-29T00:11:25 | 完成 1-2 步,修复前端 fileList 问题 | 85/100 | 理解 Upload.Dragger fileList 结构较慢 |
| 2026-01-29T21:58:36 | 完成 3 步后端 zip 上传处理 | 85/100 | 学习 zip 库使用和文件路径安全验证 |
| 2026-01-29T22:04:31 | 完成 4 步前端增加 zip 上传入口 | 85/100 | Upload 组件 zip 文件处理较顺利 |
