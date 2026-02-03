# 任务计划：恢复 uni-ui 代码并优化 wxnode 服务

## 元信息
- 计划 ID：7f9a592d-e040-4ba8-9f17-403c93c733f6
- 创建时间：2026-01-14T22:47:10.2680005+08:00
- 状态：执行中
- 预估复杂度：高
- 预估步骤数：7
- MCP 同步：是

---

## 任务目标

恢复 uni-ui 昨日修改但当前缺失的页面/代码（聚焦 word-practice），并对 wxnode 后端进行 API 清理与 SQL/性能优化，使其符合商业化后端维护标准。

---

## 背景分析

### 现状
- uni-ui 与 wxnode 为独立 Git 仓库，工作区根目录无 .git。
- uni-ui 当前存在 unpackage/dist 产物变更，源文件 `pages/word-practice/word-practice.vue` 内容仍在。
- wxnode 当前分支为 `master-docker`，工作区存在未提交改动（`src/middleware/validation.ts`）。
- 前端 API 调用分布于 `utils/constants.js`、`stores/*` 与 `pages/exam*` / `pages/word-practice` 等页面。
- 后端路由集中在 `src/app.ts` + `src/routes/*`，服务层以 MySQL 直连查询为主。

### 问题/需求
- 确认“昨天代码消失”的实际原因，基于 Git 历史恢复并回到可用页面状态。
- 建立前后端 API 映射，删除未使用或弃用接口，避免误删核心功能。
- 统一优化关键 API 与 SQL 查询路径，提升性能与可维护性。
- 按商业化标准完善文档、监控、错误处理和发布流程。

### 影响范围
- uni-ui：`pages/word-practice/*`、`components/word-practice/*`、`stores/*`、`services/*`、`utils/request.js`、`utils/constants.js`。
- wxnode：`src/app.ts`、`src/routes/*`、`src/controllers/*`、`src/services/*`、`src/config/database.ts`、`docs/*`、`sql/*`。

---

## 实现方案

### 技术选型
- 前端延续现有 uni-app + Pinia + `utils/request.js` 调用规范。
- 后端延续 Express + validation/auth/error middleware + MySQL 服务层 + Swagger 文档。
- 通过 Git 历史（log/reflog）恢复页面与组件，避免手工回忆。

### 步骤分解

#### 步骤 1：回滚 wxnode validation.ts 并验证启动
- **状态**：已完成
- **目标**：回滚 `validation.ts` 到昨天可启动版本，并验证 `npm run dev` 能正常启动。
- **涉及文件**：`wxnode/src/middleware/validation.ts`，`wxnode/package.json`。
- **具体操作**：
  1) 在 `wxnode` 仓库内查看 `validation.ts` 的 git 历史，定位可用版本。
  2) 回滚该文件到目标提交。
  3) 运行 `npm run dev` 验证服务启动。
- **验证方法**：`npm run dev` 正常启动且无启动错误。

#### 步骤 2：定位缺失范围与恢复基线
- **状态**：已完成
- **目标**：确认“昨天修改”具体指向的提交/变更，并恢复到可运行状态。
- **涉及文件**：`uni-ui/pages/word-practice/word-practice.vue`，`uni-ui/components/word-practice/*`，`uni-ui/pages/word-practice/word-detail.vue`，`uni-ui/unpackage/*`。
- **具体操作**：
  1) 在 `uni-ui` 仓库内检查 `git log` / `git reflog` / 文件历史。
  2) 对比工作区与目标提交，明确“缺失”来源（误看 dist、分支切换、未提交变更等）。
  3) 选择恢复方式（checkout 文件、cherry-pick 提交或反向恢复）。
- **验证方法**：文件内容与目标提交一致，页面可加载且无明显空白。

#### 步骤 3：建立前端调用清单与后端路由映射
- **状态**：待执行
- **目标**：建立 API 使用清单并映射到 wxnode 路由，作为清理依据。
- **涉及文件**：`uni-ui/pages/*`、`uni-ui/stores/*`、`uni-ui/utils/*`；`wxnode/src/app.ts`、`wxnode/src/routes/*`。
- **具体操作**：
  1) 汇总前端 API 调用（含 `API_ENDPOINTS` 与页面内硬编码路径）。
  2) 汇总后端路由与 Swagger 文档路径。
  3) 生成“已使用/可能废弃/未知用途”分类清单。
- **验证方法**：清单中每个端点都有前端来源或明确的“待确认/弃用”标记。

#### 步骤 4：API 清理与下线策略
- **状态**：待执行
- **目标**：删除未使用或弃用接口，并确保不破坏现有功能。
- **涉及文件**：`wxnode/src/routes/*`、`wxnode/src/controllers/*`、`wxnode/src/services/*`、`wxnode/docs/*`、`uni-ui/utils/constants.js`。
- **具体操作**：
  1) 对“未使用/弃用”接口进行二次确认（文档、日志、需求）。
  2) 移除路由/控制器/服务层并更新 Swagger 与文档。
  3) 若存在替代接口，统一迁移前端调用。
- **验证方法**：前端关键页面 API 调用全部 2xx，Swagger 与实际路由一致。

#### 步骤 5：API 与 SQL 系统性优化
- **状态**：待执行
- **目标**：改善查询效率、分页一致性与响应结构稳定性。
- **涉及文件**：`wxnode/src/services/*`、`wxnode/src/config/database.ts`、`wxnode/sql/*`。
- **具体操作**：
  1) 识别高频查询（wordPractice/wordBooks/question/user-progress/file/parse）。
  2) 评估并添加索引（例：`word_book_entries(book_id, order_index)`、`user_word_progress(user_id, book_id, word_entry_id)`）。
  3) 合并或重写双查询，减少大表全量扫描。
  4) 统一分页参数与响应字段格式。
- **验证方法**：关键列表查询响应时间下降，分页一致且无数据错乱。

#### 步骤 6：商业化维护标准补齐
- **状态**：待执行
- **目标**：让服务满足稳定上线与运维需求。
- **涉及文件**：`wxnode/src/app.ts`、`wxnode/src/middleware/*`、`wxnode/docs/*`。
- **具体操作**：
  1) 规范错误码与响应结构，补齐日志字段与 trace 信息。
  2) 完善健康检查、版本信息、发布与迁移说明。
  3) 明确权限、速率限制与审计日志策略。
- **验证方法**：文档完整、错误可追踪、监控指标清晰。

#### 步骤 7：回归验证与交付
- **状态**：待执行
- **目标**：确认前后端联调稳定，核心页面功能可用。
- **涉及文件**：`uni-ui/pages/*`、`wxnode/src/*`、`wxnode/docs/*`。
- **具体操作**：
  1) 手工回归关键页面（登录、上传、题库、单词练习）。
  2) 复核 API 与 SQL 变更的兼容性。
  3) 输出变更记录与后续维护建议。
- **验证方法**：核心页面无报错，接口清单与文档一致。

---

## 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 误删仍在使用的 API | 中 | 高 | 以“前端调用 + Swagger + 日志”三方校验，必要时提供下线窗口 |
| 数据查询性能退化 | 中 | 中 | 先评估索引与查询计划，再逐步优化 |
| 页面恢复版本错误 | 低 | 中 | 使用 git log/reflog 对照提交，恢复后做差异检查 |
| 编码/换行损坏引发解析错误 | 中 | 中 | 保持文件原有编码与行尾风格，修改时显式指定编码 |

---

## 验收标准

### 完成条件
- [ ] word-practice 页面与相关组件恢复到昨天的目标版本。
- [ ] API 使用清单与后端路由映射完成并可追踪。
- [ ] 未使用/弃用 API 移除并完成文档更新。
- [ ] SQL 与 API 性能优化落地且关键查询更快。
- [ ] 后端维护标准（日志/错误/健康/文档）满足上线要求。

### 验证方法（可选）
- 对 `uni-ui` 关键页面进行手工回归。
- 对 `wxnode` 核心接口做请求验证与基础性能对比。
- 对文档与 Swagger 做一致性检查。

---

## 执行记录

| 时间 | 操作 | 结果 |
|------|------|------|
| 2026-01-14T23:36:12 | 回滚 validation.ts 并运行 npm run dev 验证启动 | 服务启动成功；Swagger 注释解析与用户表迁移存在错误日志 |
| 2026-01-14T23:40:28 | 核对 uni-ui word-practice 代码历史与路由配置 | 源码未缺失，pages.json 含 word-practice 路由；当前版本与 918a0b0 有较大差异，需确认目标版本 |
| 2026-01-14T23:47:27 | 恢复 2026-01-12 版本的 word-practice 页面与组件 | 已回滚 word-practice.vue、word-detail.vue、相关组件与 store 到 918a0b0，差异为零 |
| 2026-01-15T00:04:38 | 修复 wordBooks Swagger 注释解析错误并加固用户表迁移 | Swagger YAML 通过；用户表迁移不再因重复索引报错；npm run dev 仅剩端口占用提示 |
| 2026-01-15T00:10:09 | 清理占用端口进程并复跑 npm run dev | 服务正常启动，日志显示端口 3001 运行中 |
| 2026-01-15T00:17:08 | 今日收尾并提交远程 | uni-ui 与 wxnode 代码已推送；计划步骤 3 明日继续 |

---

## 用户确认

- [x] 我已审阅并批准此计划

**批准后执行**：`/do-plan`
