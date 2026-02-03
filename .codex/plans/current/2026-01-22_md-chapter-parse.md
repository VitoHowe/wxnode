# 任务计划：文件管理改为 Markdown 章节解析

## 元信息
- 计划 ID：2026-01-22_md-chapter-parse
- 创建时间：2026-01-22
- 状态：已完成
- 预计复杂度：中-高
- 预计步骤数：6
- MCP 同步：是

---

## 任务目标
将 wxbackground 的“文件管理”改造为 Markdown 文档上传与解析：上传 .md 后可点击“解析”，系统按一级标题（# 第X章-…）拆分为章节文件，展示章节列表并支持在线查看与下载，解析产物需落盘保存。

---

## 背景分析
### 现状
- 前端存在文件上传与文件列表页面（`wxbackground/src/app/files`），目前不再使用。
- 需要接入新的 Markdown 拆分逻辑（以 H1 标题作为章节边界）。
- 样例 `full.md` 已给出，可作为拆分依据与测试基线。

### 问题/需求
- 上传后解析拆分章节、持久化章节内容、在线查看/下载。
- 需要选用成熟的 Markdown 解析/拆分库，避免手写 parser。
- 规划阶段只读，不改代码。

### 影响范围
- 前端：`wxbackground/src/app/files` 上传与列表页 UI/流程调整。
- 后端：`wxnode` 新增/调整文档上传、解析、章节列表与下载接口。
- 存储：新增 Markdown 原文与章节文件存储目录。

---

## 实现方案

### 技术选型
- Markdown 解析：unified/remark 生态解析为 mdast。
- 章节拆分：按 H1 进行 splitDepth=1 拆分。
- 章节序列化：mdast -> markdown 输出章节文件。

### 步骤分解

#### 步骤 1：梳理现有文件管理结构
- **状态**：已完成 ✅
- **执行时间**：2026-01-27
- **目标**：明确复用与改造点（上传页、列表页、服务接口、数据结构）
- **涉及文件**：
  - `wxbackground/src/app/files/page.tsx`（改造列表/解析）
  - `wxbackground/src/app/files/upload/page.tsx`（改造上传）
  - `wxbackground/src/services/files.ts`（前端服务）
  - `wxnode/src/controllers`、`wxnode/src/services`、`wxnode/src/routes`（后端入口）
- **具体操作**：
  1. 确认后端 Files 相关接口与数据字段。
  2. 明确新增/复用字段：解析状态、章节数、下载路径等。
- **验证方法**：输出数据结构草案与接口清单。
  - **现有接口清单**：
    - 后端：`POST /api/files/upload`，`GET /api/files`，`GET /api/files/:id`，`POST /api/files/:id/parse`，`PATCH /api/files/:id/status`，`GET /api/files/:id/status`，`DELETE /api/files/:id`
    - 数据层：`question_banks` 表承载文件记录（file_path/parse_status/total_questions 等）
  - **前端入口**：
    - `wxbackground/src/app/files/page.tsx`（列表/解析 UI）
    - `wxbackground/src/app/files/upload/page.tsx`（上传 UI）
    - `wxbackground/src/services/files.ts`（API 服务封装）

#### 步骤 2：设计存储与数据库结构
- **状态**：已完成 ✅
- **执行时间**：2026-01-27
- **目标**：确定文档与章节落盘位置、DB 表结构/字段
- **涉及文件**：
  - `wxnode/migrations/*`（如需新增表）
  - `wxnode/src/config/database.ts`（字段对齐）
- **具体操作**：
  1. 原文存储：`wxnode/public/markdown-docs/<fileId>/source.md`。
  2. 章节存储：`wxnode/public/markdown-docs/<fileId>/chapters/chapter-XX.md`。
  3. DB 设计：
     - 方案 A：扩展现有 files 表 + 新增 file_chapters 表。
     - 方案 B：新增 markdown_files / markdown_chapters 专表。
  4. 约定章节字段：chapter_id、title、order、file_path、size、created_at。
- **验证方法**：
  - 设计评审：字段、索引、清理策略是否完整。
  - **设计结论**：
    - 存储根目录：`wxnode/public/markdown-docs/<fileId>/`
    - 原文路径：`wxnode/public/markdown-docs/<fileId>/source.md`
    - 章节路径：`wxnode/public/markdown-docs/<fileId>/chapters/chapter-XX.md`
    - 新表：`markdown_files`（文档元数据）与 `markdown_chapters`（章节清单）
    - 清理策略：删除文档或重解析时，覆盖/清理 `markdown-docs/<fileId>` 目录并同步表数据

#### 步骤 3：后端接口与解析服务设计
- **状态**：已完成 ✅
- **执行时间**：2026-01-27
- **目标**：完成上传、解析、章节列表、下载的接口与流程
- **涉及文件**：
  - `wxnode/src/routes/*`（新增或扩展路由）
  - `wxnode/src/controllers/*`（控制器）
  - `wxnode/src/services/*`（解析服务）
- **具体操作**：
  1. 接口设计：
     - POST /api/admin/markdown-files（上传）
     - POST /api/admin/markdown-files/:id/parse（解析）
     - GET /api/admin/markdown-files/:id/chapters（列表）
     - GET /api/markdown-files/:id/chapters/:chapterId/download（下载/静态）
  2. 解析逻辑：
     - 用 remark-parse 生成 mdast。
     - 用 split-by-heading 按 H1 拆分。
     - 用 to-markdown 生成章节文本并落盘。
  3. 失败兜底：无 H1 -> 单章节；解析异常 -> 记录状态与错误。
- **验证方法**：
  - API 调用：上传/解析/列表/下载全链路打通。
  - **实现说明**：
    - 新增后端路由与控制器：`/api/admin/markdown-files`
    - 新增解析服务：基于 MarkdownIt 按 H1 切分并落盘
    - 静态资源路径：`/api/markdown-files/:fileId/*` 直接下载章节

#### 步骤 4：前端页面改造（上传 + 解析 + 章节展示）
- **状态**：已完成 ✅
- **执行时间**：2026-01-27
- **目标**：文件管理页面改为 Markdown 解析中心
- **涉及文件**：
  - `wxbackground/src/app/files/upload/page.tsx`
  - `wxbackground/src/app/files/page.tsx`
  - `wxbackground/src/services/files.ts`
- **具体操作**：
  1. 上传页限制仅 md；表单字段简化（文档名/描述）。
  2. 列表页增加“解析”按钮与解析状态展示。
  3. 解析后显示章节列表：标题、大小、下载、在线预览。
  4. 在线预览使用 Markdown 渲染组件并做安全过滤。
- **验证方法**：
  - UI 流程：上传 -> 解析 -> 章节可见/可下载/可预览。
  - **实现说明**：
    - 上传页限制为 .md 文件，仅保留文档名称与描述
    - 列表页展示解析状态与章节数，支持解析/删除/章节查看
    - 章节抽屉支持在线预览与下载（MarkdownPreview + skipHtml）

#### 步骤 5：存储与清理策略
- **状态**：已完成 ✅
- **执行时间**：2026-01-27
- **目标**：确保删除或重解析时文件可控
- **涉及文件**：
  - 后端删除逻辑（删除文件时移除目录）
- **具体操作**：
  1. 删除文档时清理 `markdown-docs/<fileId>` 目录。
  2. 重新解析时覆盖章节目录并更新 DB。
- **验证方法**：
  - 删除/重解析后磁盘与 DB 一致。
  - **实现说明**：
    - 删除文档时递归移除 `markdown-docs/<fileId>` 目录
    - 重新解析时清空章节目录并重建章节记录

#### 步骤 6：验收与回归
- **状态**：已完成 ✅
- **执行时间**：2026-01-27
- **目标**：确保功能完整且性能可控
- **验证方法**：
  - 以 `full.md` 上传解析，章节按 H1 正确拆分。
  - 章节列表/预览/下载均可用。
  - 大文档解析耗时可接受，失败可提示。
  - **执行结果**：
    - full.md 上传成功，解析得到 56 个章节
    - 章节列表接口返回正常，下载链接可访问

---

## 风险评估
| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| Markdown 库为 ESM 导致后端构建不兼容 | 中 | 中 | 评估现有构建方式，必要时使用动态 import 或替换库 |
| 文档缺少 H1 导致无法拆分 | 中 | 中 | 无 H1 时兜底为单章节 |
| 大文档解析阻塞请求 | 中 | 高 | 解析异步化或限制单次解析大小 |

---

## 验收标准
- [ ] 上传 md 成功并保存原文
- [ ] 点击解析后生成章节文件并入库
- [ ] 章节列表可查看/可下载/可预览
- [ ] 解析失败有明确提示，状态正确
- [ ] 删除或重解析后数据一致

---

## 执行记录
| 时间 | 操作 | 结果 |
|------|------|------|
| 2026-01-22 | 步骤 1：梳理现有文件管理结构（开始） | 进行中 |
| 2026-01-27 | 步骤 1：梳理现有文件管理结构（完成） | 已完成 |
| 2026-01-27 | 步骤 2：设计存储与数据库结构（完成） | 已完成 |
| 2026-01-27 | 步骤 3：后端接口与解析服务设计（完成） | 已完成 |
| 2026-01-27 | 步骤 4：前端页面改造（完成） | 已完成 |
| 2026-01-27 | 步骤 5：存储与清理策略（完成） | 已完成 |
| 2026-01-27 | 步骤 6：验收与回归（完成） | 已完成 |

---

## 用户确认
- [x] 我已审阅并批准此计划

**批准后执行**：`/do-plan`
