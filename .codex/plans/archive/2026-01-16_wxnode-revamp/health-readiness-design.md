# 自启检查与依赖健康/就绪设计

## 1. 现状与目标
- 当前 /health 仅返回 status + timestamp + version
- 服务启动时连接 MySQL，并尝试连接 Redis（失败会降级）
- 目标：区分 liveness 与 readiness，暴露依赖状态但不泄露敏感信息

## 2. 设计原则
- Liveness 只判断进程存活，不依赖外部资源
- Readiness 反映是否可对外服务，失败返回 503
- 依赖分级：required（必须）与 optional（可降级）
- 输出固定字段 + 状态码，便于监控采集

## 3. 接口契约（建议）
### 3.1 GET /health（Liveness）
- 状态码：200
- 响应示例：
```json
{
  "status": "OK",
  "timestamp": "2026-01-16T10:00:00Z",
  "version": "1.0.0",
  "uptime_seconds": 12345
}
```

### 3.2 GET /ready（Readiness）
- 状态码：200（ready） / 503（not ready）
- 响应示例：
```json
{
  "status": "READY",
  "timestamp": "2026-01-16T10:00:00Z",
  "dependencies": {
    "mysql": { "status": "UP", "latency_ms": 12, "required": true },
    "redis": { "status": "DOWN", "latency_ms": null, "required": false },
    "ai_provider": { "status": "DEGRADED", "required": false }
  },
  "degraded": ["redis", "ai_provider"]
}
```

## 4. 依赖检查规则
- MySQL：执行 `SELECT 1` 或连接池 ping；失败则 readiness=503
- Redis：执行 `PING`；失败只标记 degraded，不阻断 readiness
- AI provider：
  - 首选检查是否存在 status=1 的供应商配置
  - 可选触发 `fetchModels()` 进行浅探测（短超时，避免阻塞）

## 5. 启动自检与日志
- 启动流程建议：connectDB -> connectRedis -> dependencyCheck -> startServer
- 输出统一启动自检日志（结构化 JSON）：
  - mysql/redis/provider 状态 + 耗时
  - 缺失依赖列表
  - 关键表存在性（question_banks/question_chapters/questions/user_study_progress 等）
- 严禁打印密码、密钥、连接串等敏感信息

## 6. 失败场景与响应策略
- MySQL 不可用：/ready 返回 503，/health 仍 200
- Redis 不可用：/ready 200 + degraded=redis，日志 warn
- AI provider 不可用：/ready 200 + degraded=ai_provider，调用 AI 相关接口需提示配置缺失

## 7. 验证步骤
1. `GET /health` -> 200，包含 uptime_seconds
2. `GET /ready` -> 200（mysql 正常时）
3. 停止 Redis -> /ready 仍 200，degraded 包含 redis
4. 停止 MySQL -> /ready 503
