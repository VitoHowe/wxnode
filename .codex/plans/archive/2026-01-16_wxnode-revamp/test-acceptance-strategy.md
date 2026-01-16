# 测试与验收策略

## 目标
- 覆盖接口契约、迁移验证、健康检查与回归清单
- 形成可执行的门禁流程，降低重构风险

## 现有基础
- 后端测试: `wxnode/tests/wordBookService.test.ts`（ts-jest）
- 前端测试: `uni-ui/tests/wordPractice.spec.js`（词库数据校验）
- 测试配置: `wxnode/jest.config.ts`

## 测试分层
1. 单元测试：services/utils 的纯逻辑与边界
2. 集成测试：controller + service + db/redis（可用 docker）
3. 契约测试：接口输入/输出 + 状态码
4. 回归测试：核心业务链路

## 契约测试清单（后端）
- POST /auth/login (wx code / 账号密码)
- POST /auth/refresh (body 或 Authorization)
- GET /auth/profile
- GET /questions/banks?page=1&limit=20
- GET /questions/banks/:id
- GET /question-banks/:bankId/chapters
- GET /question-banks/:bankId/chapters/:chapterId/questions?limit=0
- GET /word-books, /word-books/:id/words
- GET /user-progress/:bankId/chapters, /user-progress/:bankId/full
- POST /user-progress/:bankId/chapters/:chapterId
- DELETE /user-progress/:bankId/chapters/:chapterId, /user-progress/:bankId
- POST /files/upload (可选，按需执行)

## 数据库迁移验证
- 表结构存在性：question_banks/question_chapters/questions/user_study_progress/word_books/word_book_entries
- 字段一致性：关键字段类型、索引与默认值
- 数据完整性：题库-章节-题目外键引用与统计字段
- 迁移回滚：失败时回滚脚本与备份策略

## 健康检查与依赖验证
- /health 200（liveness）
- /ready 200/503（readiness，若已实现）
- Redis/AI provider 降级场景记录

## 回归测试链路
1. 登录 -> refresh -> profile
2. 题库列表 -> 题库详情 -> 章节列表 -> 章节题目
3. 保存章节进度 -> 获取章节进度 -> 删除章节进度
4. 单词书列表 -> 单词书词条

## 数据准备与清理
- 预置测试用户（可用微信 code 或账号密码）
- 预置题库与章节数据（bankId/chapterId/wordBookId）
- 每轮回归后清理 progress 记录

## 执行门禁（建议）
1. 变更前：/health 与 /api-docs 基线检查
2. 变更后：同等检查 + 契约与回归清单
3. 未通过：阻止合并，记录失败点

## 工具与建议
- 后端：jest + supertest（建议新增接口测试套件）
- 数据库：SQL 快照对比 + 数据完整性脚本
- 前端：保持现有 mock 校验，补充真实接口 e2e

## 验证记录
- 基线启动检查：/health 200，/api-docs 200（2026-01-16）
