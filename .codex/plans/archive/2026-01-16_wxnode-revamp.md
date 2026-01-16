# 任务计划：wxnode 后端革命化维护规划

## 元信息
- 计划 ID：2026-01-16-wxnode-revamp
- 创建时间：2026-01-16
- 状态：已完成 ✓（用户已验收）
- 完成时间：2026-01-16 17:35
- 预估复杂度：高
- 预估步骤数：8 步
- MCP 同步：是

---

## 任务目标

在不变更现有技术栈的前提下，基于 uni-ui 的真实接口使用情况，对 wxnode 后端进行结构治理与文档统一：对齐接口契约、明确模块边界、规范数据库结构与迁移治理、完善自启健康检查与依赖就绪性，并结合外部成熟题库项目形成商业化对标改造路线。

---

## 背景分析

### 现状
- uni-ui 侧通过 `uni-ui/utils/constants.js` 定义 API_ENDPOINTS，通过 `uni-ui/utils/request.js` 封装鉴权与刷新；调用集中在 `services/wordBooks.js`、`stores/auth.js`、`pages/exam*`、`pages/word-practice*`。
- wxnode 侧为 Express + TypeScript，路由位于 `wxnode/src/routes`，`wxnode/src/app.ts` 集成 swagger-jsdoc 并暴露 `/api-docs`，`/health` 返回状态信息；启动时连接 MySQL 与 Redis（可选）。
- 数据库由 `wxnode/src/config/database.ts` 在启动时自动建库/建表并执行迁移逻辑，配套说明 `wxnode/docs/数据库自动迁移说明.md`。
- 文档存在多份并行维护：`wxnode/API接口文档.md`、`wxnode/API_QUICK_REFERENCE.md`、`wxnode/docs/*` 与 swagger 注释并存。

### 问题/需求
- 需要以 uni-ui 的真实调用为唯一约束，形成稳定的接口契约与响应结构。
- 自动迁移与文档多源可能带来生产风险与维护成本。
- 商业化服务需要更严格的自启检查与依赖就绪策略。
- 需要引入外部成熟项目的组织方式与标准化实践进行对标。

### 影响范围
- wxnode：`src/routes`、`src/controllers`、`src/services`、`src/middleware`、`src/config`、`migrations`、`sql`、`docs`
- uni-ui：`utils/constants.js`、`utils/request.js`、`services/wordBooks.js`、`stores/auth.js`、`pages/*`

---

## 实现方案

### 技术选型
- 保持 Express + TypeScript + swagger-jsdoc + mysql2 现有栈，重点治理架构边界与流程。
- 文档治理以 swagger 注释为事实源，Markdown 作为发布产物或版本归档。
- 对标参考：
  - programming-question-bank（Clean Architecture + MySQL + Jest）：https://github.com/Weslley03/programming-question-bank
  - question-bank-backend（Swagger 文档实践）：https://github.com/thisashish/question-bank-backend
  - virtual-question-bank-backend（功能模块划分）：https://github.com/wareesha-Jannat/virtual-question-bank-backend
  - Node + MySQL REST API 实践（事务与结构化 CRUD）：https://blog.logrocket.com/build-rest-api-node-express-mysql/

### 逐步验证门禁（每步必做）
1. 改动前：对本步涉及接口执行对照测试（契约矩阵/Swagger/调用示例），记录基线差异。
2. 改动后：重复接口对照测试，确认无新增差异或已按预期收敛。
3. 服务启动测试：启动 wxnode，检查 `/health` 与 `/api-docs` 可用性，并记录 MySQL/Redis/AI provider 连接状态。
4. 若本步仅产出文档或方案，至少执行一次服务启动测试并记录基线。

### 步骤分解

#### 步骤 1：盘点 uni-ui API 使用并生成契约矩阵
- **状态**：已完成 ✓
- **执行时间**：2026-01-16T10:13:19
- **AI 评分**：85/100
- **产出**：`.codex/plans/current/2026-01-16_wxnode-revamp/contract-matrix.md`
- **接口对照测试**：完成（静态比对前端调用与后端路由，缺口 6 项，详见产出文件）
- **服务启动测试**：失败（`npm run dev` 报错：ENOENT，尝试读取 `E:\\下载\\MCP.Router-win32-x64-0.5.5\\package.json`；`/health` 与 `/api-docs` 未验证）
- **目标**：输出覆盖全部前端调用的接口清单与字段对照表，标注缺口和不一致。
- **涉及文件**：
  - `uni-ui/utils/constants.js` — 参考
  - `uni-ui/utils/request.js` — 参考
  - `uni-ui/services/wordBooks.js` — 参考
  - `uni-ui/stores/auth.js` — 参考
  - `uni-ui/pages/exam/exam.vue` — 参考
  - `uni-ui/pages/exam-list/exam-list.vue` — 参考
  - `uni-ui/pages/word-practice/word-practice.vue` — 参考
  - `uni-ui/pages/word-practice/word-detail.vue` — 参考
  - `wxnode/src/routes` — 参考
- **具体操作**：
  1. 提取 API_ENDPOINTS 与实际调用路径，形成端点列表。
  2. 对照 swagger 注释与路由实现，记录请求参数/响应字段/鉴权要求。
  3. 输出“接口契约矩阵”，标注缺口与冲突。
- **验证方法**：契约矩阵覆盖所有前端调用，包含字段级别的差异记录与修正建议。
  - 执行“逐步验证门禁”，记录基线与回归结果。

#### 步骤 2：后端模块边界与重构方案设计
- **状态**：已完成 ✓
- **执行时间**：2026-01-16T10:17:21
- **AI 评分**：84/100
- **产出**：`.codex/plans/current/2026-01-16_wxnode-revamp/module-boundaries.md`
- **接口对照测试**：完成（无接口变更，基于契约矩阵核对无新增差异）
- **服务启动测试**：首次失败（`npm run dev` 报错：ENOENT，尝试读取 `E:\\\\下载\\\\MCP.Router-win32-x64-0.5.5\\\\package.json`；`/health` 与 `/api-docs` 未验证）；后续用户在 `wxnode` 目录执行成功，日志显示服务运行并输出 `/api-docs` 与 `/health` 地址
- **目标**：定义清晰的模块边界与重构顺序，确保兼容性与可落地性。
- **涉及文件**：
  - `wxnode/src/routes` — 参考
  - `wxnode/src/controllers` — 参考
  - `wxnode/src/services` — 参考
  - `wxnode/src/middleware` — 参考
  - `wxnode/src/utils/response.ts` — 参考
- **具体操作**：
  1. 识别领域模块（auth、questions、files、progress、word-books、system）。
  2. 归类跨领域能力（鉴权、校验、错误处理、日志）。
  3. 输出模块边界图与重构路线图（先兼容、后抽象）。
- **验证方法**：形成可执行的重构路线与模块接口说明，明确依赖与兼容策略，并执行“逐步验证门禁”记录结果。

#### 步骤 3：数据库结构与迁移治理方案
- **状态**：已完成 ✓
- **执行时间**：2026-01-16T10:34:10
- **AI 评分**：86/100
- **产出**：`.codex/plans/current/2026-01-16_wxnode-revamp/db-migration-governance.md`
- **接口对照测试**：完成（无接口变更，基于契约矩阵核对无新增差异）
- **服务启动测试**：成功（/health 返回 OK，/api-docs 返回 200；尝试启动新实例时端口 3001 已占用）
- **目标**：从“启动即迁移”过渡到“版本化迁移 + 可回滚”的治理方案。
- **涉及文件**：
  - `wxnode/src/config/database.ts` — 参考
  - `wxnode/migrations` — 参考
  - `wxnode/sql` — 参考
  - `wxnode/docs/数据库自动迁移说明.md` — 参考
  - `wxnode/docs/解析结果存储重构说明.md` — 参考
- **具体操作**：
  1. 输出当前表结构清单与服务调用对照表。
  2. 识别破坏性变更与兼容性变更，定义迁移级别。
  3. 给出版本化迁移、回滚与备份流程。
- **验证方法**：提供迁移分级策略、验证清单与回滚路径，并执行“逐步验证门禁”记录结果。

#### 步骤 4：自启检查与依赖健康/就绪设计
- **状态**：已完成 ✓
- **执行时间**：2026-01-16T10:53:30
- **AI 评分**：85/100
- **产出**：`.codex/plans/current/2026-01-16_wxnode-revamp/health-readiness-design.md`
- **接口对照测试**：完成（无接口变更，基于契约矩阵核对无新增差异）
- **服务启动测试**：成功（服务运行中，/health OK，/api-docs 200）
- **目标**：完善 liveness/readiness 与依赖探测，形成启动自检报告。
- **涉及文件**：
  - `wxnode/src/app.ts` — 参考
  - `wxnode/src/config/redis.ts` — 参考
  - `wxnode/src/services/systemService.ts` — 参考
- **具体操作**：
  1. 设计健康检查输出格式与安全字段白名单。
  2. 增加 MySQL/Redis/AI provider 探测与 readiness 规则。
  3. 定义启动自检报告与告警策略。
- **验证方法**：输出健康检查契约与验证步骤，覆盖依赖失效与降级场景，并执行“逐步验证门禁”记录结果。

#### 步骤 5：API 文档治理与版本化流程
- **状态**：已完成 ✓
- **执行时间**：2026-01-16T15:13:16
- **AI 评分**：84/100
- **执行顺序**：在步骤 8 完成后执行
- **目标**：统一 swagger 与 Markdown 文档口径，形成版本化发布流程。
- **涉及文件**：
  - `wxnode/src/app.ts` — 参考
  - `wxnode/src/routes` — 参考
  - `wxnode/API接口文档.md` — 已更新
  - `wxnode/API_QUICK_REFERENCE.md` — 已更新
  - `wxnode/docs/API_DOC_GOVERNANCE.md` — 新增
- **产出**：
  - `wxnode/API接口文档.md`
  - `wxnode/API_QUICK_REFERENCE.md`
  - `wxnode/docs/API_DOC_GOVERNANCE.md`
- **接口对照测试**：文档与路由清单对齐（认证/题库/章节/单词书/进度/文件上传）
- **服务启动测试**：/health OK，/api-docs 200
- **具体操作**：
  1. 对照 swagger 注释与 Markdown 文档，列出差异清单。
  2. 设计“swagger 为事实源，Markdown 为发布物”的治理流程。
  3. 明确版本号、变更日志与发布节奏。
- **验证方法**：输出可执行的文档治理流程与版本化规范，并执行“逐步验证门禁”记录结果。

#### 步骤 6：外部对标与商业化标准差距分析
- **状态**：已完成 ✓
- **执行时间**：2026-01-16T16:11:21
- **AI 评分**：83/100
- **目标**：提炼外部项目的架构/治理/运维实践并形成差距清单。
- **涉及文件**：
  - `wxnode/README.md` — 参考
  - `wxnode/配置指南.md` — 参考
  - `.codex/plans/current/2026-01-16_wxnode-revamp/external-benchmark-gap.md` — 新增
- **产出**：
  - `.codex/plans/current/2026-01-16_wxnode-revamp/external-benchmark-gap.md`
- **接口对照测试**：无接口改动，完成 /health、/api-docs 基线检查（前/后）
- **服务启动测试**：/health OK，/api-docs 200
- **具体操作**：
  1. 对标外部项目在权限、审计、可观测性、限流、发布流程等方面的实践。
  2. 形成差距清单与改造优先级。
- **验证方法**：输出可落地的商业化改造优先级清单，并执行“逐步验证门禁”记录结果。

#### 步骤 7：测试与验收策略
- **状态**：已完成 ✓
- **执行时间**：2026-01-16T16:13:56
- **AI 评分**：82/100
- **目标**：建立接口契约测试、迁移验证、健康检查与回归清单。
- **涉及文件**：
  - `wxnode/tests` — 参考
  - `wxnode/jest.config.ts` — 参考
  - `uni-ui/tests` — 参考
  - `.codex/plans/current/2026-01-16_wxnode-revamp/test-acceptance-strategy.md` — 新增
- **产出**：
  - `.codex/plans/current/2026-01-16_wxnode-revamp/test-acceptance-strategy.md`
- **接口对照测试**：无接口改动，完成 /health、/api-docs 基线检查（前/后）
- **服务启动测试**：/health OK，/api-docs 200
- **具体操作**：
  1. 定义接口契约测试与数据迁移验证清单。
  2. 设计健康检查与依赖就绪测试步骤。
  3. 汇总回归测试与灰度验证策略。
- **验证方法**：输出可执行的测试清单与预期结果，并执行“逐步验证门禁”记录结果。

#### 步骤 8：API 清洗与性能优化（基于 uni-ui 使用）
- **状态**：已完成 ✓
- **执行时间**：2026-01-16T12:02:39
- **AI 评分**：85/100
- **子计划**：`.codex/plans/current/2026-01-16_wxnode-revamp/sub-001_api-cleanup.md`
- **产出**：`.codex/plans/current/2026-01-16_wxnode-revamp/api-cleanup-report.md`
- **接口对照测试**：完成（抽样接口返回 401，/api-docs 文档范围收敛）
- **服务启动测试**：成功（/health OK，/api-docs 200）
- **目标**：基于 uni-ui 真实调用清单清理未使用接口，优化不合理接口与慢路径，必要时重构以降低服务器压力。
- **涉及文件**：
  - `uni-ui/utils/constants.js` — 参考
  - `uni-ui/utils/request.js` — 参考
  - `uni-ui/services/*` — 参考
  - `uni-ui/stores/*` — 参考
  - `uni-ui/pages/*` — 参考
  - `wxnode/src/routes` — 参考/待修改
  - `wxnode/src/controllers` — 参考/待修改
  - `wxnode/src/services` — 参考/待修改
  - `wxnode/src/utils/response.ts` — 参考
  - `wxnode/API接口文档.md` — 参考/待更新
  - `wxnode/API_QUICK_REFERENCE.md` — 参考/待更新
- **具体操作**：
  1. 基于契约矩阵与前端调用，生成“未使用接口清单”与“设计不合理接口清单”。
  2. 对未使用接口制定废弃策略（标记、日志、兼容窗口），必要时移除。
  3. 对不合理接口进行重构（分页、字段裁剪、N+1 查询优化、缓存策略）。
  4. 更新 Swagger 与 Markdown 文档口径，补充变更记录。
- **验证方法**：完成清单与变更说明，接口对照测试无新增缺口；服务启动与 /health、/api-docs 验证通过。

---

## 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 接口契约与前端调用不一致 | 中 | 高 | 以 uni-ui 调用为准建立契约矩阵，先对齐再重构 |
| 启动即迁移在生产环境风险 | 中 | 高 | 迁移分级、回滚方案与预备备份 |
| 多份文档导致口径漂移 | 高 | 中 | 统一 swagger 为事实源，Markdown 自动化生成 |
| 依赖就绪探测不足导致误报 | 中 | 中 | 区分 liveness/readiness，定义降级策略 |
| API 清理/重构造成客户端断裂 | 中 | 高 | 先废弃标记+兼容窗口，基于 uni-ui 调用验证 |

---

## 验收标准

### 完成条件
- [x] 形成接口契约矩阵并明确所有缺口与不一致。
- [x] 输出模块边界图、重构路线与兼容策略。
- [x] 给出数据库迁移治理方案与回滚流程。
- [x] 输出健康检查与依赖就绪设计规范。
- [x] 文档治理与版本化发布流程明确可执行。
- [x] 外部对标差距清单与优先级明确。
- [x] 测试与验收清单可执行、可复现。
- [x] 完成 API 清洗与性能优化清单，并完成必要重构与回归验证。
- [x] 每个步骤均记录改动前后接口对照测试与服务启动测试结果。

### 验证方法
- 手动审阅契约矩阵与差距清单。
- 以清单形式核对文档与迁移治理方案完整性。
- 结合现有测试框架输出可执行的验证步骤。

---

## 执行记录

| 时间 | 操作 | 结果 |
|------|------|------|
| 2026-01-16 10:13 | 步骤 1：接口契约矩阵与基线对照 | 已完成（产出契约矩阵；启动测试失败，需排查 npm 工作目录） |
| 2026-01-16 10:17 | 步骤 2：模块边界与重构方案 | 已完成（产出模块边界文档；启动测试失败，ENOENT 工作目录） |
| 2026-01-16 10:19 | 补充：服务启动测试成功 | 用户在 wxnode 目录执行 `npm run dev`，日志显示服务运行并输出 `/api-docs` 与 `/health` 地址 |
| 2026-01-16 10:34 | 步骤 3：数据库结构与迁移治理方案 | 已完成（产出迁移治理文档；/health OK，/api-docs 200） |
| 2026-01-16 15:13 | 步骤 5：API 文档治理与版本化流程 | 已完成（更新 API 文档与治理规范；/health OK，/api-docs 200） |
| 2026-01-16 16:11 | 步骤 6：外部对标与商业化标准差距分析 | 已完成（对标清单与优先级输出；/health OK，/api-docs 200） |
| 2026-01-16 16:13 | 步骤 7：测试与验收策略 | 已完成（输出测试与验收策略；/health OK，/api-docs 200） |
| 2026-01-16 10:53 | 步骤 4：自启检查与依赖健康设计 | 已完成（产出健康就绪设计；/health OK，/api-docs 200） |
| 2026-01-16 12:02 | 步骤 8：API 清洗与性能优化 | 已完成（清洗报告落地，路由与 Swagger 收敛，前端接口同步完成） |
| 2026-01-16 14:37 | 补充：接口完整回归验证 | 已完成（refresh/profile/题库/章节/单词书/进度全链路 200） |
| 2026-01-16 17:29 | 补充：整体验证回归（DB 生成 token） | 已完成（/health、/api-docs、refresh、认证、题库、章节、单词书、进度均 200；已执行章节进度写入） |

---

## 用户确认

- [x] 我已审阅并批准此计划（/do-plan 触发）
- [x] 用户验收：✅ 通过（2026-01-16 17:35）
- [x] 归档状态：已归档

**批准后执行**：`/do-plan` 或 `/do-plan 2026-01-16_wxnode-revamp.md`
