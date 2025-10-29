# SQL 文件管理

本目录包含所有数据库相关的SQL脚本文件。

---

## 📁 文件列表

| 文件名 | 说明 | 状态 |
|--------|------|------|
| `add_parse_logs_columns.sql` | 添加解析日志请求/响应数据字段 | ✅ 可用 |
| `add_parsed_json_path.sql` | 添加解析JSON文件路径字段 | ✅ 可用 |
| `create_chapters_and_questions_tables.sql` | 创建章节和题目表 | ✅ 可用 |
| `redesign_questions_table.sql` | 题目表重新设计 | ⚠️ 已废弃 |

---

## 🚀 使用方法

### 方式1：使用npm命令（推荐）

```bash
# 列出所有可用的SQL文件
npm run sql

# 执行指定的SQL文件
npm run sql <文件名>

# 示例
npm run sql add_parsed_json_path
npm run sql create_chapters_and_questions_tables
```

### 方式2：直接使用ts-node

```bash
npx ts-node -r tsconfig-paths/register scripts/run-sql.ts <文件名>
```

### 方式3：MySQL命令行

```bash
mysql -u root -p wxnode_db < sql/文件名.sql
```

---

## 📝 SQL文件详解

### add_parse_logs_columns.sql

**用途**: 为 `parse_logs` 表添加请求和响应数据字段

**影响的表**: `parse_logs`

**新增字段**:
- `request_data` - JSON类型，存储API请求数据
- `response_data` - JSON类型，存储API响应数据

**何时使用**: 初次部署或升级系统时

---

### add_parsed_json_path.sql

**用途**: 为 `question_banks` 表添加解析JSON文件路径字段

**影响的表**: `question_banks`

**新增字段**:
- `parsed_json_path` - VARCHAR(500)，存储解析后的JSON文件路径

**何时使用**: 
- 启用JSON文件系统存储时
- 从数据库JSON存储迁移到文件系统存储时

**注意**:
- 该字段会在服务器启动时自动添加（通过代码）
- 本SQL文件提供手动执行选项

---

### create_chapters_and_questions_tables.sql

**用途**: 创建题库的章节和题目表结构

**影响的表**: 
- `question_chapters` - 章节表
- `questions` - 题目表

**表结构**:

**question_chapters**
- id, bank_id, chapter_name, chapter_order, question_count
- 唯一约束：(bank_id, chapter_name)
- 外键：bank_id → question_banks(id)

**questions**
- id, bank_id, chapter_id, question_no, type, content, options, answer, explanation, difficulty, tags
- 外键：
  - bank_id → question_banks(id)
  - chapter_id → question_chapters(id)

**何时使用**:
- 初次部署系统时
- 表被误删需要重建时

**注意**:
- 外键约束名使用 `_v3` 后缀以避免冲突
- 支持 `IF NOT EXISTS` 安全创建

---

### redesign_questions_table.sql ⚠️

**状态**: 已废弃

**原因**: 
- 已被 `create_chapters_and_questions_tables.sql` 替代
- 旧的设计不再使用

**建议**: 不要执行此文件

---

## ⚙️ 执行顺序建议

对于全新安装：

```bash
# 1. 创建章节和题目表（核心）
npm run sql create_chapters_and_questions_tables

# 2. 添加解析日志字段（可选，服务器会自动处理）
npm run sql add_parse_logs_columns

# 3. 添加JSON文件路径字段（可选，服务器会自动处理）
npm run sql add_parsed_json_path
```

**注意**: 大多数迁移会在服务器启动时自动执行，手动执行SQL主要用于：
- 故障恢复
- 手动维护
- 了解表结构

---

## 🔍 验证执行结果

执行SQL后，可以使用以下命令验证：

```bash
# 检查数据库表状态
npx ts-node -r tsconfig-paths/register scripts/check-tables.ts

# 验证系统就绪状态
npx ts-node -r tsconfig-paths/register scripts/test-upload-ready.ts
```

---

## 🛡️ 安全注意事项

1. **备份数据库**
   ```bash
   mysqldump -u root -p wxnode_db > backup_$(date +%Y%m%d).sql
   ```

2. **测试环境优先**
   - 先在测试环境执行
   - 确认无误后再在生产环境执行

3. **检查依赖**
   - 确保依赖的表已存在
   - 检查外键约束

4. **事务支持**
   - 所有SQL文件都使用InnoDB引擎
   - 支持事务回滚

---

## 📊 常见问题

### Q: 为什么有些字段会重复添加？

A: SQL文件包含了检查逻辑，如果字段已存在会跳过。这是为了：
- 支持幂等性（可重复执行）
- 避免执行错误

### Q: 执行失败怎么办？

A: 
1. 查看错误信息
2. 检查表是否存在
3. 检查字段是否已存在
4. 确认外键依赖的表存在

### Q: 可以直接在数据库工具中执行吗？

A: 可以，但推荐使用 `npm run sql` 命令，因为：
- 自动处理动态SQL
- 提供友好的错误信息
- 支持执行日志

---

## 🔄 版本历史

- **v1.0.0** (2025-10-29)
  - 初始版本
  - 整合所有SQL文件到统一目录
  - 创建执行脚本

---

## 📞 获取帮助

如果遇到问题，可以：

1. 查看 `docs/系统优化总结.md`
2. 查看 `docs/JSON导入功能修复总结.md`  
3. 运行 `npm run sql` 查看可用文件
4. 查看日志文件 `logs/`
