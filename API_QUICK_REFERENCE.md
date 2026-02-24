# wxnode API 快速参考

基础 URL: `http://localhost:3001/api`
认证: `Authorization: Bearer <accessToken>`
刷新令牌: `POST /auth/refresh` (body 或 Authorization)

## Endpoints

### 认证
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/profile`
- `POST /auth/logout`

### 题库
- `GET /questions/banks`
- `GET /questions/banks/:id`

### 章节
- `GET /question-banks/:bankId/chapters`
- `GET /question-banks/:bankId/chapters/:chapterId/questions`

### 单词书
- `GET /word-books`
- `GET /word-books/:id/words`

### 进度
- `GET /user-progress/:bankId/chapters`
- `GET /user-progress/:bankId/full`
- `POST /user-progress/:bankId/chapters/:chapterId`
- `DELETE /user-progress/:bankId/chapters/:chapterId`
- `DELETE /user-progress/:bankId`

### 文件
- `POST /files/upload`

### 论文（管理端）
- `GET /admin/essay-orgs?includeDisabled=1`
- `POST /admin/essay-orgs`
- `PUT /admin/essay-orgs/:orgId`
- `DELETE /admin/essay-orgs/:orgId`
- `GET /admin/essays?page=1&limit=20&subjectId=1&orgId=1&subjectChapterId=2&status=1&keyword=关键字`
- `POST /admin/essays` (multipart/form-data，字段: `file`, `title`, `orgId`, `subjectId`, `subjectChapterId`, `status`)
- `PUT /admin/essays/:id` (multipart/form-data，可选携带 `file`)
- `DELETE /admin/essays/:id`

### 论文（小程序消费）
- `GET /subjects/:subjectId/essay-orgs`
- `GET /subjects/:subjectId/chapters/:chapterId/essays?orgId=:orgId`
- `GET /essays/:id`
- `GET /essays/:essayId/source.md`（静态 markdown 原文）

## 常用示例

### 登录
```json
{ "code": "wx_code" }
```

### 刷新令牌
```json
{ "refreshToken": "..." }
```

### 题库列表
`GET /questions/banks?page=1&limit=20`

### 章节题目（全量）
`GET /question-banks/1/chapters/1/questions?limit=0`

### 保存章节进度
```json
{ "current_question_number": 4, "completed_count": 4, "total_questions": 159 }
```

### 新增论文机构
```json
{
  "name": "某机构 A",
  "description": "可选",
  "status": 1,
  "sort_order": 10
}
```

### 论文详情响应（节选）
```json
{
  "id": 12,
  "title": "项目范围管理论文示例",
  "org_id": 3,
  "subject_id": 1,
  "subject_chapter_id": 7,
  "content_url": "/api/essays/12/source.md"
}
```
