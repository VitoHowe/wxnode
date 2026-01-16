# 接口契约矩阵（uni-ui -> wxnode）

## 统一响应约定
- wxnode 统一响应：`{ code, message, data, timestamp }`
- uni-ui 请求封装：仅在 `HTTP 200` 且 `data.code === 200` 时返回 `data.data`
- 结论：所有接口需保证 `data.data` 的业务结构与前端预期一致

## 接口清单（按模块）

### Auth
| 前端调用位置 | 方法 | 路径 | 请求 | 认证 | 后端路由 | 前端期望 | 对照结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `stores/auth.js` | POST | `/api/auth/login` | `{ code }` 或 `{ username, password }`（可选 `encryptedData/iv/signature`） | 否 | `routes/auth.ts` | `{ accessToken, refreshToken, expiresIn, user }` | ✅ 对齐 |
| `stores/auth.js`, `utils/request.js` | POST | `/api/auth/refresh` | `{ refreshToken }` | 否（refresh token） | `routes/auth.ts` | `{ accessToken, refreshToken, expiresIn }` | ✅ 对齐 |
| `stores/auth.js` | GET | `/api/auth/profile` | 无 | 是 | `routes/auth.ts` | `user` 对象 | ⚠️ 后端返回 `{ user }`，前端直接赋值 `userInfo`，存在结构不一致风险 |
| `stores/auth.js` | PUT | `/api/auth/profile` | `{ nickname, avatar_url, phone }` | 是 | `routes/auth.ts` | 更新后的 `user` 对象 | ✅ 对齐 |
| `stores/auth.js` | POST | `/api/auth/logout` | 无 | 是 | `routes/auth.ts` | 无强依赖 | ✅ 对齐 |

### Word Books / Word Practice
| 前端调用位置 | 方法 | 路径 | 请求 | 认证 | 后端路由 | 前端期望 | 对照结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `services/wordBooks.js`, `stores/wordPractice.js` | GET | `/api/word-books` | `page/limit/keyword/language` | 是 | `routes/wordBooks.ts` | `{ books, total, pagination }` 且 `book` 含 `source_filename/stored_path/source_size` | ⚠️ 后端 `listWordBooks` 仅返回 `id/name/description/language/total_words/created_at/updated_at`，源文件字段缺失 |
| `services/wordBooks.js`, `stores/wordPractice.js` | GET | `/api/word-books/{id}/words` | `all` 可选 | 是 | `routes/wordBooks.ts` | `{ book, words, total }`，`word` 含 `word/translation/phonetic/definition/example_sentence/part_of_speech/tags/extra/order_index` | ✅ 对齐 |
| `utils/constants.js`（未见 src 调用） | GET/POST/DELETE | `/api/word-books/{id}/progress` | 见后端定义 | 是 | `routes/wordBooks.ts` | 进度结构 | ⚠️ 常量已定义但当前 src 未调用，需确认是否保留 |
| `utils/constants.js`（未见 src 调用） | GET/POST | `/api/word-practice/books/{bookId}/(words|progress|state)` | 见后端定义 | 是 | `routes/wordPractice.ts` | 练习进度/状态 | ⚠️ 仅在 dist 中出现，src 未使用，需确认是否弃用或补齐 |

### Questions / Chapters
| 前端调用位置 | 方法 | 路径 | 请求 | 认证 | 后端路由 | 前端期望 | 对照结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pages/exam-list/exam-list.vue` | GET | `/api/questions/banks` | `page/limit` 可选 | 是 | `routes/questions.ts` | `{ banks }`，单项含 `question_count` 与 `study_progress` | ✅ 对齐（后端含 `study_progress`） |
| `pages/exam/exam.vue` | GET | `/api/questions/banks/{id}` | 无 | 是 | `routes/questions.ts` | `question_count` 字段 | ⚠️ 后端返回 `total_questions` 与 `statistics`，未返回 `question_count` |
| `pages/exam-list/exam-list.vue` | GET | `/api/question-banks/{bankId}/chapters` | 无 | 是 | `routes/chapters.ts` | `{ chapters }` | ✅ 对齐 |
| `pages/exam/exam.vue` | GET | `/api/question-banks/{bankId}/chapters/{chapterId}/questions` | `questionNumber` | 是 | `routes/chapters.ts` | `{ question, total, hasNext, hasPrev }` | ✅ 对齐 |
| `pages/exam/exam.vue`, `utils/imageParser.js` | GET | `/api/question-banks/{bankId}/images/{filename}` | 无 | 否 | `app.ts` 静态路由 | 图片资源 | ✅ 对齐 |

### User Progress
| 前端调用位置 | 方法 | 路径 | 请求 | 认证 | 后端路由 | 前端期望 | 对照结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pages/exam-list/exam-list.vue` | GET | `/api/user-progress/{bankId}/chapters` | 无 | 是 | `routes/userProgress.ts` | 章节进度列表（含 `chapter_id/current_question_number/progress_percentage`） | ✅ 对齐（字段以服务实际返回为准） |
| `pages/exam-list/exam-list.vue` | GET | `/api/user-progress/{bankId}/full` | 无 | 是 | `routes/userProgress.ts` | `current_chapter_id/current_question_number/completed_count` | ✅ 对齐（字段以服务实际返回为准） |
| `pages/exam/exam.vue` | POST | `/api/user-progress/{bankId}/chapters/{chapterId}` | `practice_mode/current_question_number/completed_count/total_questions`（full 模式额外传 `current_chapter_id`） | 是 | `routes/userProgress.ts` | 返回保存后的进度 | ⚠️ 后端 `saveChapterProgress` 未接收 `current_chapter_id`，full 模式字段被忽略 |
| `pages/exam/exam.vue` | DELETE | `/api/user-progress/{bankId}/chapters/{chapterId}` | 无 | 是 | `routes/userProgress.ts` | 删除成功 | ✅ 对齐 |
| `pages/exam/exam.vue`, `pages/exam-list/exam-list.vue` | DELETE | `/api/user-progress/{bankId}` | 无 | 是 | `routes/userProgress.ts` | 删除成功 | ✅ 对齐 |

### Files (Upload)
| 前端调用位置 | 方法 | 路径 | 请求 | 认证 | 后端路由 | 前端期望 | 对照结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `stores/upload.js` | POST | `/api/files/upload` | `multipart/form-data`（`name/description/type`） | 是 | `routes/files.ts` | `data.parsed_questions` 与 `data.id` | ⚠️ 后端返回 `question_banks` 记录，未提供 `parsed_questions` 字段 |

## 关键缺口与不一致
1. `/api/auth/profile` 响应包裹层不一致（前端期望 `user`，后端返回 `{ user }`）。
2. `/api/questions/banks/{id}` 字段不一致（前端读取 `question_count`，后端返回 `total_questions`）。
3. `/api/word-books` 列表字段不一致（前端期望 `source_*` 字段，后端未返回）。
4. `/api/user-progress/{bankId}/chapters/0` full 模式字段缺失（后端未接收 `current_chapter_id`）。
5. `/api/files/upload` 前端期望 `parsed_questions`，后端返回题库记录本身。
6. `API_ENDPOINTS.WORD/WORD_BOOKS.PROGRESS` 与 `/api/word-practice/*` 在 src 未使用，需明确是否保留或清理。

## 对照测试记录（本步骤）
- 接口对照测试：基于前端源码调用路径与后端路由表静态比对（`uni-ui/*` vs `wxnode/src/routes/*`）。
- 服务启动测试：见执行记录（本步骤仅产出文档，按门禁规则仅做一次基线启动验证）。
