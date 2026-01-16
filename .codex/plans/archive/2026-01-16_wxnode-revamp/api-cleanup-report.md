# API 清洗报告（uni-ui -> wxnode）

## 依据与范围
- 依据：`.codex/plans/current/2026-01-16_wxnode-revamp/contract-matrix.md`
- 范围：wxnode 路由、Swagger 注释、uni-ui API_ENDPOINTS 与实际调用

## 保留接口（仍在使用）
### Auth
- POST `/api/auth/login`
- POST `/api/auth/refresh`
- GET `/api/auth/profile`
- POST `/api/auth/logout`

### Questions / Chapters
- GET `/api/questions/banks`
- GET `/api/questions/banks/{id}`
- GET `/api/question-banks/{bankId}/chapters`
- GET `/api/question-banks/{bankId}/chapters/{chapterId}/questions`

### User Progress
- GET `/api/user-progress/{bankId}/chapters`
- GET `/api/user-progress/{bankId}/full`
- POST `/api/user-progress/{bankId}/chapters/{chapterId}`
- DELETE `/api/user-progress/{bankId}/chapters/{chapterId}`
- DELETE `/api/user-progress/{bankId}`

### Word Books
- GET `/api/word-books`
- GET `/api/word-books/{id}/words`

### Files
- POST `/api/files/upload`

## 下线接口（未使用或不合理）
- Auth：`POST /api/auth/register`、`PUT /api/auth/profile`
- Users：`/api/users/*`
- Questions CRUD：`/api/questions`（列表/详情/更新/删除）
- Chapters：`/api/question-banks/{bankId}/chapters/stats`、`/api/question-banks/{bankId}/chapters/{chapterId}`、`DELETE /api/question-banks/{bankId}/chapters/{chapterId}`
- Parse Results：`/api/parse-results/*`
- System：`/api/system/*`
- Word Practice：`/api/word-practice/*`
- Word Books 扩展：上传/收藏/错题/进度等未使用接口
- Files 扩展：列表/详情/解析/解析状态/删除等未使用接口
- 路由别名：`/api/chapters`（已移除挂载）

## 前端同步
- `uni-ui/utils/constants.js`：收敛 API_ENDPOINTS 至当前保留接口
- `uni-ui/stores/auth.js`：移除 `updateUserProfile` 调用（`PUT /api/auth/profile` 已下线）

## Swagger 与路由治理
- swagger-jsdoc 扫描范围收敛为保留路由文件
- app.ts 路由挂载仅保留前端真实调用模块

## 验证记录
- /health: OK（2026-01-16T04:00:59.48Z）
- /api-docs: 200
- 抽样接口（未带 Token，预期 401）：
  - GET /api/auth/profile -> 401
  - GET /api/questions/banks -> 401
  - GET /api/questions/banks/1 -> 401
  - GET /api/question-banks/1/chapters -> 401
  - GET /api/question-banks/1/chapters/1/questions -> 401
  - GET /api/word-books -> 401
  - GET /api/word-books/1/words -> 401
  - GET /api/user-progress/1/chapters -> 401
  - GET /api/user-progress/1/full -> 401
  - POST /api/files/upload -> 401

## 回归验证（带 Token，完整回归）
- 时间：2026-01-16T14:37:51
- POST /api/auth/refresh -> 200
- GET /health -> 200
- GET /api-docs -> 200
- GET /api/auth/profile -> 200
- GET /api/questions/banks -> 200
- GET /api/questions/banks/15 -> 200
- GET /api/question-banks/15/chapters -> 200
- GET /api/question-banks/15/chapters/1/questions -> 200
- GET /api/word-books -> 200
- GET /api/word-books/1/words -> 200
- GET /api/user-progress/15/chapters -> 200
- GET /api/user-progress/15/full -> 200
- POST /api/user-progress/15/chapters/1 -> 200
- 使用的样本数据：bankId=15, chapterId=1, wordBookId=1, current_question_number=4, completed_count=4, total_questions=159
- 未执行：DELETE /api/user-progress/{bankId}/chapters/{chapterId}、DELETE /api/user-progress/{bankId}（避免破坏性操作）
- 未执行：POST /api/files/upload（未提供测试文件）