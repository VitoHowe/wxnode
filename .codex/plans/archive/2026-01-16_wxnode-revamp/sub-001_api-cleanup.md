# 子计划：API 清洗与性能优化

## 元信息
- 子计划 ID：sub-001-api-cleanup
- 父计划：2026-01-16-wxnode-revamp
- 状态：已完成 ✓
- 创建时间：2026-01-16
- 完成时间：2026-01-16T12:02:39
- 执行顺序：先清洗 API，后文档治理（文档治理由父计划步骤 5 承接）

## 目标
- 基于 uni-ui 实际调用清单，收缩未使用与不合理接口，降低维护成本。
- 保留前端所需的核心接口，避免兼容性回归。
- 收敛 Swagger 文档到现用接口范围。

## 范围
- wxnode/src/app.ts
- wxnode/src/routes/auth.ts
- wxnode/src/routes/chapters.ts
- wxnode/src/routes/wordBooks.ts
- wxnode/src/routes/questions.ts
- wxnode/src/routes/files.ts
- wxnode/src/routes/userProgress.ts
- .codex/plans/current/2026-01-16_wxnode-revamp/api-cleanup-report.md

## 步骤
### 步骤 1：路由清洗与接口收缩
- 状态：已完成 ✓
- 执行时间：2026-01-16T11:30:42
- AI 评分：85/100
- 目标：移除未使用路由入口，确保仅保留 uni-ui 真实调用路径。
- 具体操作：
  1. 调整 app.ts 路由挂载，移除 users/system/parse-results/word-practice 等未用入口。
  2. 移除 auth 注册与 profile 更新接口路由。
  3. 仅保留章节列表与章节题目接口，删除统计/详情/删除等未用接口。
  4. 新建精简版 wordBooks 路由，仅保留列表与词条接口。
- 验证方法：对照前端调用清单，Swagger 路由列表仅包含使用中的接口。

### 步骤 2：Swagger 收敛与契约同步
- 状态：已完成 ✓
- 执行时间：2026-01-16T11:59:45
- AI 评分：84/100
- 目标：收敛 Swagger 扫描范围，避免无效接口出现在文档。
- 具体操作：
  1. 更新 swagger-jsdoc 的 apis 列表为显式路由文件。
  2. 清理被移除接口的 swagger 注释。
- 验证方法：/api-docs 可访问，文档列表与接口清单一致。

### 步骤 3：清洗报告与回归验证
- 状态：已完成 ✓
- 执行时间：2026-01-16T12:02:39
- AI 评分：85/100
- 目标：形成可追溯的清洗报告并记录接口验证结果。
- 具体操作：
  1. 生成 api-cleanup-report.md，记录保留/移除接口与原因。
  2. 执行 /health 与 /api-docs 校验，抽样验证核心接口。
- 验证方法：报告落地，接口对照测试无新增缺口。

## 执行记录

| 时间 | 操作 | 结果 |
|------|------|------|
| 2026-01-16 11:30 | 步骤 1：路由清洗与接口收缩 | 已完成（路由收缩完成，/health 与 /api-docs 校验通过） |
| 2026-01-16 11:59 | 步骤 2：Swagger 收敛与契约同步 | 已完成（Swagger 扫描范围收敛，/api-docs 返回 200） |
| 2026-01-16 12:02 | 步骤 3：清洗报告与回归验证 | 已完成（报告落地，/health 与核心接口抽样验证完成） |
| 2026-01-16 14:37 | 补充：完整接口回归验证 | 已完成（refresh/profile/题库/章节/单词书/进度全链路 200） |
