# JSON导入功能修复总结

**修复日期**: 2025-10-29  
**问题**: `/api/files/upload-json` 接口导入JSON文件时，章节拆分流程（步骤4-6）未执行

---

## 问题根因

### 1. 数据库表缺失
- `question_chapters` 表不存在
- `questions` 表不存在
- 导致 `chapterService.createChapter()` 和 `questionService.createQuestionsWithChapter()` 调用失败

### 2. 数据库迁移逻辑问题
- 服务器启动时会检查 `questions` 表并自动重命名为备份表
- 未能区分新旧表结构，导致误删新创建的表

### 3. 外键约束名称冲突
- 备份表已使用 `fk_questions_bank_id` 等约束名
- 创建新表时产生冲突

---

## 修复方案

### ✅ 1. 创建数据库表

**执行的SQL文件**: `migrations/create_chapters_and_questions_tables.sql`

创建了两个核心表：
- **question_chapters**: 题库章节表
  - 字段: id, bank_id, chapter_name, chapter_order, question_count
  - 外键: bank_id → question_banks(id)
  
- **questions**: 题目表
  - 字段: id, bank_id, chapter_id, question_no, type, content, options, answer, explanation, difficulty, tags
  - 外键: 
    - bank_id → question_banks(id)
    - chapter_id → question_chapters(id)

**执行脚本**: 
```bash
npm run migrate:chapters-questions
```

### ✅ 2. 修复数据库迁移逻辑

**修改文件**: `src/config/database.ts`

在 `migrateQuestionsToParseResults()` 函数中添加表结构检查：
```typescript
// 检查表结构，判断是新表还是旧表
// 新表有 chapter_id 字段，旧表没有
const structureCheck = await connection.execute(`
  SELECT COLUMN_NAME 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = '${dbConfig.database}' 
  AND TABLE_NAME = 'questions'
  AND COLUMN_NAME = 'chapter_id'
`);

if ((structureCheck[0] as any[]).length > 0) {
  logger.info('检测到新版questions表（包含chapter_id字段），跳过迁移');
  return;
}
```

### ✅ 3. 优化JSON导入逻辑

**修改文件**: `src/services/fileService.ts` (uploadJsonFile方法)

**优化内容**:
1. **调整执行顺序**: 优先保存到章节和题目表，再保存备份
2. **添加备份大小限制**: 限制16MB，避免数据库连接问题
3. **容错处理**: 备份失败不影响主流程

```typescript
// 5. 按章节拆分保存题目（优先执行）
await this.saveQuestionsByChapter(bankId, questions);

// 6. 保存原始JSON到parse_results表（作为备份，如果数据量太大则跳过）
const jsonSize = JSON.stringify(questions).length;
const maxJsonSize = 16 * 1024 * 1024; // 16MB 限制

if (jsonSize < maxJsonSize) {
  try {
    await query(/* 保存备份 */);
    logger.info('原始JSON备份保存成功', { bankId, jsonSize });
  } catch (backupError: any) {
    logger.warn('原始JSON备份保存失败（不影响导入）', { error: backupError.message });
  }
} else {
  logger.info('JSON数据过大，跳过备份', { bankId, jsonSize });
}
```

### ✅ 4. 解决外键约束冲突

使用新的约束名称版本：
- `fk_questions_bank_id_v3`
- `fk_questions_chapter_id_v3`

---

## 导入流程说明

现在完整的JSON导入流程如下：

1. **验证JSON格式**
   - 检查文件扩展名
   - 解析JSON内容
   - 验证 `questions` 数组存在
   - 验证每题的必要字段 (type, content, answer)

2. **创建题库记录**
   - 使用文件名（去掉.json后缀）作为题库名称
   - 状态设为 `completed`
   - 记录总题数

3. **按章节拆分保存**
   - 提取每题的 `tags[0]` 作为章节名称
   - 未设置tags的题目归入"未分类"章节
   - 章节按名称中的数字自动排序
   - 创建章节记录到 `question_chapters`

4. **批量保存题目**
   - 按章节分组批量插入到 `questions` 表
   - 关联 bank_id 和 chapter_id

5. **更新章节统计**
   - 更新每个章节的 `question_count`

6. **保存备份**（可选）
   - 如果JSON < 16MB，保存到 `parse_results` 表
   - 失败不影响主流程

7. **记录日志**
   - 插入成功记录到 `parse_logs`

---

## 使用说明

### 上传JSON文件

**API端点**: `POST /api/files/upload-json`

**请求**:
- Method: POST
- Content-Type: multipart/form-data
- Headers: Authorization: Bearer {token}
- Body: 
  - file: JSON文件

**JSON格式要求**:
```json
{
  "questions": [
    {
      "question": "1",
      "type": "single",
      "content": "题目内容",
      "options": ["A.选项1", "B.选项2", "C.选项3", "D.选项4"],
      "answer": "A",
      "explanation": "解析内容",
      "difficulty": 1,
      "tags": ["第01章-章节名称"]
    }
  ]
}
```

**字段说明**:
- `type`: 题型 (single/multiple/judge/fill/essay)
- `tags[0]`: **第一个标签作为章节名称**
- `difficulty`: 难度 (1-简单, 2-中等, 3-困难)

### 验证导入结果

导入完成后，使用验证脚本检查数据：

```bash
# 验证最新导入的题库
npm run verify-import

# 验证指定ID的题库
npm run verify-import 10
```

**验证内容**:
- ✅ 题库基本信息
- ✅ 章节列表和题目数量
- ✅ 题型分布统计
- ✅ 难度分布统计
- ✅ 示例题目预览
- ✅ 数据完整性检查

---

## 测试案例

### gemini.json 测试文件
- **文件大小**: ~2MB
- **题目数量**: 1000题
- **预期章节**: 根据 tags[0] 自动拆分
- **备份**: 会保存到 parse_results（< 16MB限制）

**测试步骤**:
1. 通过 Apifox 上传 gemini.json
2. 检查响应状态是否为 200
3. 运行 `npm run verify-import` 验证数据
4. 检查数据库表数据

---

## 相关脚本

| 脚本 | 命令 | 说明 |
|------|------|------|
| 创建章节和题目表 | `npm run migrate:chapters-questions` | 创建数据库表结构 |
| 验证导入结果 | `npm run verify-import [bank_id]` | 检查导入数据的完整性 |
| 检查数据库表 | `npx ts-node -r tsconfig-paths/register scripts/check-tables.ts` | 列出所有表和状态 |

---

## 数据库表结构

### question_chapters (题库章节表)
```sql
CREATE TABLE `question_chapters` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `bank_id` INT NOT NULL,
  `chapter_name` VARCHAR(200) NOT NULL,
  `chapter_order` INT NOT NULL,
  `question_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bank_chapter` (`bank_id`, `chapter_name`),
  CONSTRAINT `fk_chapters_bank_id` FOREIGN KEY (`bank_id`) 
    REFERENCES `question_banks` (`id`) ON DELETE CASCADE
);
```

### questions (题目表)
```sql
CREATE TABLE `questions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `bank_id` INT NOT NULL,
  `chapter_id` INT NOT NULL,
  `question_no` VARCHAR(50) DEFAULT NULL,
  `type` ENUM('single', 'multiple', 'judge', 'fill', 'essay') NOT NULL,
  `content` TEXT NOT NULL,
  `options` JSON DEFAULT NULL,
  `answer` TEXT NOT NULL,
  `explanation` TEXT DEFAULT NULL,
  `difficulty` INT DEFAULT 1,
  `tags` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_bank` (`bank_id`),
  INDEX `idx_chapter` (`chapter_id`),
  CONSTRAINT `fk_questions_bank_id_v3` FOREIGN KEY (`bank_id`) 
    REFERENCES `question_banks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_questions_chapter_id_v3` FOREIGN KEY (`chapter_id`) 
    REFERENCES `question_chapters` (`id`) ON DELETE CASCADE
);
```

---

## 故障排除

### 问题1: 服务器无法启动
**症状**: SESSION variable 'max_allowed_packet' is read-only  
**原因**: 尝试在会话级别设置只读变量  
**解决**: 已移除相关代码，改用16MB大小限制

### 问题2: questions表被重命名
**症状**: 新创建的表被自动重命名为 questions_backup_xxx  
**原因**: 迁移逻辑未区分新旧表  
**解决**: 通过 chapter_id 字段判断表版本

### 问题3: 外键约束冲突
**症状**: Duplicate foreign key constraint name  
**原因**: 备份表使用了相同的约束名  
**解决**: 使用 v3 版本的约束名

---

## 总结

✅ **问题已完全解决**，JSON导入功能现已正常工作！

**核心改进**:
1. 创建了完整的章节和题目表结构
2. 修复了数据库迁移逻辑，避免误删新表
3. 优化了导入流程，提升稳定性
4. 添加了数据验证工具

**下一步建议**:
- 测试大文件导入（> 1000题）
- 监控导入性能
- 考虑添加导入进度提示
