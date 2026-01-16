# 外部对标与商业化标准差距分析

## 参考项目与实践
1. Online Exam Management System (FastAPI + Next.js)
   - Admin/Student 角色分离，考试管理、Excel 导入、自动评分
   - Docker 部署与 Swagger 文档
   - https://raw.githubusercontent.com/tarik1bosunia/online-exam-management-system/main/README.md
2. Spring Boot Online Exam (Spring Boot)
   - RBAC 角色权限、考试记录、题型管理、REST Controller 结构
   - https://deepwiki.com/lsgwr/spring-boot-online-exam/3-backend-system
3. Express Security Best Practices
   - TLS、Helmet、输入校验、依赖安全
   - https://expressjs.com/en/advanced/best-practice-security.html
4. OWASP API Security Top 10 2023
   - 身份验证与资源消耗控制等安全基线
   - https://owasp.org/www-project-api-security/

## 商业化标准清单（对标摘要）
- 认证与授权：多角色 RBAC、细粒度权限、token 轮换
- 安全：TLS、输入校验、依赖漏洞扫描、最小暴露
- 运营能力：审计日志、操作留痕、导出/归档、数据修订
- 稳定性：限流、配额、降级、重试与熔断
- 可观测性：结构化日志、指标、链路追踪、告警
- 数据治理：PII 脱敏、备份/恢复、数据保留策略
- API 生命周期：版本化、弃用策略、文档一致性、契约测试
- 部署与迁移：CI/CD、可回滚迁移、环境分层

## wxnode 当前差距
- P0: 缺少 RBAC/角色权限，无法区分 admin/teacher/student
- P0: 无全局限流/配额，缺少资源消耗保护（OWASP API4）
- P0: 文档一致性问题，README/配置指南仍含下线接口与误导信息
- P0: 配置指南末尾疑似敏感密钥泄露，需尽快清理
- P0: Token 安全策略不完善，缺少 refresh 轮换与撤销列表
- P1: 缺少审计日志与关键操作留痕
- P1: 缺少考试/试卷记录模型（对标 exam record）
- P1: 无 API 版本化与弃用策略
- P1: 可观测性不足，缺少 metrics/tracing/告警
- P2: 文件解析无异步队列与失败回放
- P2: 业务统计与学习分析能力不足
- P2: 多租户/组织边界未定义

## 改造优先级建议
### P0（安全与稳定，2-4 周）
- RBAC + 权限中间件
- 全局限流/配额、请求大小限制
- 文档与 README 清理，移除误导与敏感信息
- refresh 轮换、token blacklist 或 jti 追踪

### P1（运营与商业化，4-8 周）
- 审计日志、关键操作追踪
- 考试记录/评分模块（与题库结构对齐）
- API 版本化与弃用窗口策略
- metrics/trace/告警接入

### P2（体验与效率，8-12 周）
- 文件解析任务队列与回放
- 统计报表与学习分析
- 多租户/组织管理

## 验证记录
- 基线启动检查：/health 200，/api-docs 200（2026-01-16）
