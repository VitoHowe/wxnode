# API 文档治理规范

## 目标
- Swagger 为事实源（/api-docs）
- Markdown 为发布物（API接口文档.md, API_QUICK_REFERENCE.md）
- 变更必须同步 uni-ui 调用点

## 文档分层
- `API接口文档.md`: 全量说明与示例
- `API_QUICK_REFERENCE.md`: 端点速查
- `docs/API_DOC_GOVERNANCE.md`: 维护流程与规范

## 版本策略
- 文档版本号与代码版本对齐，统一写入更新时间
- 影响接口契约的变更需更新更新日志
- 删除/合并接口必须在 Markdown 与 Swagger 同步

## 变更流程
1. 先改路由/控制器/校验，再改 Swagger 注释
2. 本地启动服务，确认 `/health` 与 `/api-docs`
3. 更新 `API接口文档.md` 与 `API_QUICK_REFERENCE.md`
4. 同步 `uni-ui` 调用与 mock 数据
5. 记录接口回归结果（接口、参数、结果、时间）

## 验收清单
- /health 200
- /api-docs 可打开
- 关键接口回归通过（登录、题库、章节、进度、单词书）
- 文档与前端调用一致

## 写作规则
- 禁止在 Markdown 中编造未上线接口
- 统一响应格式示例与错误码
- 参数说明以 Swagger 为准，Markdown 只做归纳
- 修改后优先跑接口回归再提交
