# 微信小程序题库管理系统 API 接口文档

**版本**: v1.6.0
**最后更新**: 2026-01-16
**基础 URL**: `http://localhost:3001/api`
**文档来源**: Swagger (/api-docs)，本文为发布物

## 更新日志

### v1.6.0 (2026-01-16)
- ✅ 接口清洗：移除未使用模块（users/system/parse-results/word-practice 等）
- ✅ 契约收敛：保留 auth/题库/章节/单词书/进度/文件上传
- ✅ Refresh 兼容：refreshToken 支持 body 与 Authorization
- ✅ 文档治理：Swagger 为事实源，Markdown 为发布物

## 通用约定

### 认证
- 除 `/auth/login` 与 `/auth/refresh` 外，其余接口需要 `Authorization: Bearer <accessToken>`
- 刷新令牌支持两种方式：
  - `POST /auth/refresh` body: `{ "refreshToken": "..." }`
  - `Authorization: Bearer <refreshToken>`

### 统一响应格式
```json
{ "code": 200, "message": "ok", "data": {}, "timestamp": "2026-01-16T00:00:00.000Z" }
```


### 常见错误码
- 400 请求参数验证失败
- 401 未授权或 Token 失效
- 403 无权限
- 404 资源不存在
- 429 请求过于频繁
- 500 服务异常

## 接口目录
- 认证: `POST /auth/login`, `POST /auth/refresh`, `GET /auth/profile`, `POST /auth/logout`
- 题库: `GET /questions/banks`, `GET /questions/banks/:id`
- 章节: `GET /question-banks/:bankId/chapters`, `GET /question-banks/:bankId/chapters/:chapterId/questions`
- 单词书: `GET /word-books`, `GET /word-books/:id/words`
- 进度: `GET /user-progress/:bankId/chapters`, `GET /user-progress/:bankId/full`, `POST /user-progress/:bankId/chapters/:chapterId`
- 进度: `DELETE /user-progress/:bankId/chapters/:chapterId`, `DELETE /user-progress/:bankId`
- 文件: `POST /files/upload`
- 健康检查: `GET /health`

## 认证
### POST /auth/login
说明: 微信 code 或普通账号密码登录
请求示例 (微信):
```json
{ "code": "wx_code", "encryptedData": "...", "iv": "...", "signature": "..." }
```
请求示例 (账号):
```json
{ "username": "demo", "password": "secret" }
```
响应 data: accessToken, refreshToken, expiresIn, user

### POST /auth/refresh
说明: 用 refreshToken 换新 accessToken，成功后会下发新的 refreshToken
请求示例 (body):
```json
{ "refreshToken": "..." }
```
请求示例 (header): `Authorization: Bearer <refreshToken>`
响应 data: accessToken, refreshToken, expiresIn

### GET /auth/profile
说明: 获取当前用户信息（需 Authorization）

### POST /auth/logout
说明: 登出并使当前 token 失效（需 Authorization）

## 题库管理
### GET /questions/banks
说明: 获取题库列表（仅 parse_status=completed）
查询参数: page (默认 1), limit (默认 20, 最大 100)
响应 data: { banks: [], total, pagination }

### GET /questions/banks/:id
说明: 获取题库详情与统计信息
响应 data: 题库信息 + statistics + question_count

## 章节管理
### GET /question-banks/:bankId/chapters
说明: 获取题库下章节列表
响应 data: { chapters: [], totalChapters }

### GET /question-banks/:bankId/chapters/:chapterId/questions
说明: 获取章节题目列表
查询参数: page (默认 1), limit (默认 0 = 全量, >0 分页)
响应 data: { questions: [], total, pagination }

## 单词书
### GET /word-books
说明: 获取单词书列表
查询参数: page (默认 1), limit (默认 10), keyword, language
响应 data: { books: [], total, pagination }

### GET /word-books/:id/words
说明: 获取指定单词书的单词条目
响应 data: { book, words: [], total, pagination }

## 进度管理
### GET /user-progress/:bankId/chapters
说明: 获取题库各章节进度
响应 data: 章节进度数组

### GET /user-progress/:bankId/full
说明: 获取整卷练习进度
响应 data: 进度对象或 null

### POST /user-progress/:bankId/chapters/:chapterId
说明: 保存章节/整卷进度
请求 body: { practice_mode?, current_chapter_id?, current_question_number, completed_count?, total_questions }
说明: practice_mode=full 时可传 current_chapter_id
响应 data: 进度对象

### DELETE /user-progress/:bankId/chapters/:chapterId
说明: 重置章节进度

### DELETE /user-progress/:bankId
说明: 重置题库进度

## 文件管理
### POST /files/upload
说明: 上传题库文件（需 Authorization）
请求: multipart/form-data，字段 file/name，description/type 可选
支持格式: pdf, doc, docx, txt, md, xlsx, xls, csv, json, jpg, jpeg, png, gif, bmp, webp
响应 data: 上传后的文件信息

## 静态资源
### GET /question-banks/:bankId/images/<filename>
说明: 访问题库图片资源（无需鉴权）

## 健康检查
### GET /health
说明: 服务健康检查（无鉴权）

