# 后端模块边界与重构路线（wxnode）

## 当前架构概览（事实）
- 入口：`src/app.ts` 统一挂载路由与中间件。
- 分层：`routes -> controllers -> services -> db/query`，统一响应在 `utils/response.ts`，鉴权/校验在 `middleware/*`。
- 领域路由：`auth/users/files/questions/system/parseResults/userProgress/chapters/wordBooks/wordPractice`。
- 数据访问：mysql2 + 手写 SQL（`config/database.ts` 与各 service 内的 query）。

## 目标边界（域划分）
保持现有技术栈与响应风格，明确领域边界与跨域能力：

### 1) 账号与权限域（Auth & Users）
- 路由：`/api/auth`、`/api/users`
- 责任：登录/刷新、用户资料、用户管理、权限校验
- 关键依赖：`middleware/auth.ts`、`services/authService.ts`、`services/userService.ts`

### 2) 题库与练习域（Questions & Chapters & Progress）
- 路由：`/api/questions`、`/api/question-banks/*`、`/api/user-progress/*`
- 责任：题库列表、章节/题目、学习进度、整卷/章节模式
- 关键依赖：`services/questionService.ts`、`services/chapterService.ts`、`services/userProgressService.ts`

### 3) 文件与解析域（Files & Parse Results）
- 路由：`/api/files`、`/api/parse-results`
- 责任：上传/解析/解析状态、解析结果存储与统计
- 关键依赖：`services/fileService.ts`、`services/parseResultService.ts`

### 4) 单词书与练习域（Word Books & Word Practice）
- 路由：`/api/word-books`、`/api/word-practice`
- 责任：单词书导入/查询、练习进度与状态、收藏/错词
- 关键依赖：`services/wordBookService.ts`、`services/wordPracticeService.ts`

### 5) 系统与供应商域（System & Providers）
- 路由：`/api/system/*`
- 责任：AI provider 配置、模型列表、解析格式模板
- 关键依赖：`services/systemService.ts`、`services/providerStrategies/*`

### 跨域能力（Cross-cutting）
- 认证与鉴权：`middleware/auth.ts`
- 请求校验：`middleware/validation.ts`
- 统一错误与响应：`middleware/errorHandler.ts`、`utils/response.ts`
- 日志与可观测性：`utils/logger.ts`
- 依赖连接：`config/database.ts`、`config/redis.ts`

## 重构路线（不破坏兼容）
1. **接口稳定期**：保持所有现有路由路径与响应结构不变（以契约矩阵为准）。
2. **目录规整**：按域划分建立 `src/modules/{domain}/`，将 routes/controllers/services 按域迁移（保持导出路径不变，可用 barrel/别名）。
3. **DTO/Schema 归一**：各域新增 `dto/` 或 `schema/`，统一请求/响应字段命名（snake_case vs camelCase 统一策略）。
4. **数据访问隔离**：为高频 SQL 建立轻量 `repository`（不引入 ORM），避免服务层直接拼接 SQL。
5. **跨域能力收敛**：公共鉴权/校验/响应/日志封装为可复用中间件，减少各 controller 重复逻辑。
6. **兼容层与迁移开关**：为变更字段提供兼容映射层（例如 `question_count` <-> `total_questions`）。

## 兼容策略
- **接口优先**：任何重构不得改变 `uni-ui` 现有调用路径与 `data.data` 结构。
- **字段映射**：对前端依赖字段提供兼容映射（示例：`/questions/banks/{id}` 返回 `question_count`）。
- **分阶段切换**：先在 service 层增加兼容字段，再在 controller 层对外输出稳定结构。

## 风险点（需与契约矩阵同步修正）
- `/auth/profile` 当前返回 `{ user }` 包裹层与前端预期不一致。
- `/questions/banks/{id}` 未输出 `question_count`。
- `/word-books` 列表缺失 `source_*` 字段，前端对齐需要补充或降级处理。
- `/files/upload` 响应缺失 `parsed_questions`，前端上传统计依赖风险。

## 对照测试记录（本步骤）
- 接口对照测试：复用契约矩阵静态核对（`contract-matrix.md`）。
- 服务启动测试：见执行记录（本步骤仅产出文档，按门禁规则仅做一次基线启动验证）。
