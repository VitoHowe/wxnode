# 数据库结构与迁移治理方案（wxnode）

## 1. 结构盘点（基于代码与脚本）
本节只列出当前代码/脚本能覆盖的结构来源，避免凭空猜测。

### 1.1 自启创建 + 运行时迁移（wxnode/src/config/database.ts）
- 自动创建：roles, users, question_banks, user_study_progress, parse_logs, ai_providers, system_settings, word_books, word_book_entries, word_book_favorites, word_book_wrong_entries, word_book_progress
- 自动迁移：migrateUserTable（username/password/openid NULL）、migrateQuestionBanksTable（file_type/provider_id/model_name）、addParsedJsonPathField（parsed_json_path）、migrateProviderTable（model_configs -> ai_providers，旧表重命名备份）
- 风险：启动即 DDL/数据迁移，生产环境不可控；与手工 SQL 脚本存在重复或冲突

### 1.2 手工迁移脚本（wxnode/migrations）
- add_practice_mode.sql：user_study_progress 增加 practice_mode 与索引
- add_chapter_to_progress.sql：增加 chapter_id/current_question_number，并调整唯一约束与外键
- add_current_chapter_field.sql：增加 current_chapter_id
- adjust_practice_mode_constraint.sql：唯一约束调整为 (user_id, bank_id, practice_mode, chapter_id)
- add_word_practice_tables.sql：新增 user_word_progress, user_word_book_state

### 1.3 SQL 脚本（wxnode/sql）
- create_chapters_and_questions_tables.sql：创建 question_chapters 与 questions
- add_parse_logs_columns.sql：补充 parse_logs.request_data/response_data
- add_parsed_json_path.sql：补充 question_banks.parsed_json_path
- redesign_questions_table.sql：创建 parse_results（README 标记为“已废弃”）
- README 约定通过 scripts/run-sql.ts 或 npm run sql 执行

### 1.4 代码使用表映射（节选）
- question_chapters / questions：chapterService、questionService、fileService 保存与查询
- parse_results：parseResultService 读写
- user_study_progress：userProgressService 读写（含 practice_mode、chapter_id、current_chapter_id、parse_result_id、current_question_number）
- user_word_progress / user_word_book_state：wordPracticeService 读写

## 2. 关键缺口与风险
- parse_results 被 parseResultService 使用，但 database.ts 未创建，且对应 SQL 脚本被标记为“已废弃”，新环境可能缺表
- question_chapters/questions 在代码中强依赖，但仅存在于 SQL 脚本，未纳入启动自动创建
- user_word_progress/user_word_book_state 只存在迁移脚本，若未执行会导致单词练习接口直接报错
- user_study_progress 基表缺少 practice_mode/chapter_id/current_chapter_id/current_question_number/parse_result_id 等字段，依赖迁移脚本补齐，其中 parse_result_id 当前无迁移脚本
- 约束冲突风险：add_chapter_to_progress 与 adjust_practice_mode_constraint 对唯一约束的演进路径不一致，若顺序或执行状态不明，会导致约束缺失或重复
- 设计口径不一致：docs 中仍以 parse_results 为主存储，实际 fileService 将解析结果落盘为 JSON 并写入章节/题目表，数据主路径需要统一

## 3. 迁移分级策略（建议）
- L0：新增表/新增可空字段/新增索引，允许线上滚动执行
- L1：唯一约束变化、字段类型变更、列改名/删除，需停机窗口 + 强制备份
- L2：数据迁移/回填（questions -> parse_results 或 JSON -> questions），需记录迁移批次与校验结果

## 4. 版本化迁移治理方案
### 4.1 统一迁移入口
- 建议建立 schema_migrations 表记录已执行脚本（id、name、checksum、applied_at）
- 以现有 scripts/run-sql.ts 为执行入口，禁止生产环境由服务启动执行 DDL

### 4.2 文件命名与执行顺序
- 命名规范：YYYYMMDD_HHMM_<scope>_<desc>.sql
- 执行顺序：基础建表 -> 字段扩展 -> 约束调整 -> 数据迁移 -> 统计/校验

### 4.3 环境控制策略
- 开发环境：允许 AUTO_MIGRATE=true 执行 DDL
- 生产环境：AUTO_MIGRATE=false，仅由发布流水线执行迁移

## 5. 备份与回滚流程（生产建议）
1. 全库备份：`mysqldump -u <user> -p wxnode_db > backup_YYYYMMDD_HHMM.sql`
2. 关键表备份：question_banks, question_chapters, questions, user_study_progress, word_*、parse_logs
3. 数据迁移前：使用 RENAME TABLE 保留旧表（questions_backup_时间戳）
4. 回滚策略：
   - 结构回滚：恢复备份表或回滚 SQL
   - 数据回滚：从备份表导回或整库恢复
   - 服务回滚：灰度期间保留旧版本可回退

## 6. 上线验证清单（最小闭环）
### 6.1 结构一致性
```sql
SHOW TABLES LIKE 'question_chapters';
SHOW TABLES LIKE 'questions';
SHOW TABLES LIKE 'user_word_progress';
SHOW TABLES LIKE 'user_word_book_state';
SHOW TABLES LIKE 'parse_results';
```

### 6.2 字段与约束
```sql
SHOW COLUMNS FROM user_study_progress;
SHOW INDEX FROM user_study_progress;
SHOW COLUMNS FROM question_banks;
SHOW COLUMNS FROM parse_logs;
```

### 6.3 数据一致性
```sql
SELECT id, total_questions FROM question_banks ORDER BY id DESC LIMIT 5;
SELECT bank_id, COUNT(*) AS questions FROM questions GROUP BY bank_id ORDER BY bank_id DESC LIMIT 5;
SELECT bank_id, COUNT(*) AS chapters FROM question_chapters GROUP BY bank_id ORDER BY bank_id DESC LIMIT 5;
```

### 6.4 服务验证
- 启动日志应包含：数据库连接成功、Redis 连接成功、/api-docs 与 /health 地址
- /health 返回正常并包含数据库/Redis 状态

## 7. 近期优先级建议
1. 明确“解析结果主存储”口径（parse_results vs JSON + chapters/questions）并统一文档
2. 将 question_chapters/questions 与单词练习表纳入统一迁移机制
3. 补齐 user_study_progress 的 parse_result_id 字段迁移
