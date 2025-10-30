-- 为整卷练习添加当前章节记录字段
-- 迁移时间：2025-10-30
-- 目的：整卷练习时记录当前所在的真实章节

USE `wxnode_db`;

-- 1. 添加 current_chapter_id 字段
ALTER TABLE user_study_progress
  ADD COLUMN current_chapter_id INT NULL 
  COMMENT '当前所在章节ID（整卷练习时使用）' 
  AFTER chapter_id;

-- 2. 添加索引
ALTER TABLE user_study_progress
  ADD INDEX idx_current_chapter (current_chapter_id);

-- 说明：
-- 章节练习：
--   - practice_mode = 'chapter'
--   - chapter_id = 实际章节ID
--   - current_chapter_id = NULL（不使用）
--   - current_question_number = 该章节内题号
--
-- 整卷练习：
--   - practice_mode = 'full'
--   - chapter_id = NULL（保持唯一约束简单）
--   - current_chapter_id = 当前所在的真实章节ID
--   - current_question_number = 该章节内题号
--   - completed_count = 全局已完成题数
--
-- 唯一约束保持不变：(user_id, bank_id, chapter_id)
--   - 章节练习：每个章节一条记录
--   - 整卷练习：每个题库一条记录（chapter_id = NULL）

-- 3. 验证
SELECT 
  practice_mode,
  chapter_id,
  current_chapter_id,
  COUNT(*) as count
FROM user_study_progress
GROUP BY practice_mode, chapter_id, current_chapter_id;
