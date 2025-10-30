-- 调整练习模式的唯一约束
-- 迁移时间：2025-10-30
-- 目的：整卷练习记录真实章节ID，通过 practice_mode 区分

USE `wxnode_db`;

-- 1. 删除旧的唯一约束
ALTER TABLE user_study_progress
  DROP INDEX uk_user_bank_chapter;

-- 2. 添加新的复合唯一索引
-- 对于整卷练习：每个用户每个题库只有一条记录（通过 practice_mode='full' 唯一）
-- 对于章节练习：每个用户每个题库每个章节一条记录
ALTER TABLE user_study_progress
  ADD UNIQUE KEY uk_user_bank_mode_chapter (user_id, bank_id, practice_mode, chapter_id);

-- 说明：
-- 整卷练习：
--   - practice_mode = 'full'
--   - chapter_id = 当前所在的真实章节ID
--   - current_question_number = 该章节内的题号
--   - completed_count = 全局已完成题数
--   - 由于唯一约束包含 practice_mode，同一用户同一题库的整卷记录会在切换章节时更新同一条记录
--
-- 章节练习：
--   - practice_mode = 'chapter'
--   - chapter_id = 练习的章节ID
--   - current_question_number = 该章节内的题号
--   - completed_count = 该章节已完成题数
--   - 每个章节独立一条记录

-- 3. 验证
SELECT 
  user_id,
  bank_id,
  practice_mode,
  chapter_id,
  current_question_number,
  completed_count
FROM user_study_progress
ORDER BY user_id, bank_id, practice_mode, chapter_id;
