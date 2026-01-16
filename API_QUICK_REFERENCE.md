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
