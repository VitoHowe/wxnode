-- 为用户学习进度表添加章节支持
-- 迁移时间：2025-10-29

-- 1. 添加新字段
ALTER TABLE user_study_progress
  ADD COLUMN chapter_id INT NULL COMMENT '章节ID' AFTER bank_id,
  ADD COLUMN current_question_number INT NULL COMMENT '当前题号(从1开始)' AFTER current_question_index;

-- 2. 添加章节索引
ALTER TABLE user_study_progress
  ADD INDEX idx_chapter_id (chapter_id);

-- 3. 删除旧的唯一约束（仅题库级别）
ALTER TABLE user_study_progress
  DROP INDEX uk_user_bank;

-- 4. 添加新的唯一约束（题库+章节级别）
-- 注意：chapter_id 可为 NULL，表示旧的题库级别记录
ALTER TABLE user_study_progress
  ADD UNIQUE KEY uk_user_bank_chapter (user_id, bank_id, chapter_id);

-- 5. 添加外键约束
ALTER TABLE user_study_progress
  ADD CONSTRAINT fk_progress_chapter 
    FOREIGN KEY (chapter_id) 
    REFERENCES question_chapters(id) 
    ON DELETE CASCADE;

-- 说明：
-- - 旧记录保留（chapter_id = NULL）表示题库级别进度
-- - 新记录必须指定 chapter_id，表示章节级别进度
-- - current_question_index 保留向后兼容，但推荐使用 current_question_number
-- - 唯一约束允许：同一用户在同一题库的不同章节有不同进度
