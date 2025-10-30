-- 为用户学习进度表添加练习模式字段
-- 迁移时间：2025-10-30
-- 目的：区分章节练习和整卷练习

USE `wxnode_db`;

-- 1. 添加 practice_mode 字段
ALTER TABLE user_study_progress
  ADD COLUMN practice_mode ENUM('chapter', 'full') NOT NULL DEFAULT 'chapter' 
  COMMENT '练习模式：chapter=章节练习, full=整卷练习' 
  AFTER bank_id;

-- 2. 添加索引
ALTER TABLE user_study_progress
  ADD INDEX idx_practice_mode (practice_mode);

-- 3. 说明
-- - 章节练习：practice_mode='chapter', chapter_id=实际章节ID
-- - 整卷练习：practice_mode='full', chapter_id=0（虚拟ID表示整卷）
-- - 唯一约束 (user_id, bank_id, chapter_id) 仍然有效：
--   * 每个用户每个题库每个章节只有一条章节练习记录
--   * 每个用户每个题库只有一条整卷练习记录（chapter_id=0）

-- 4. 验证
SELECT 
  practice_mode,
  COUNT(*) as count
FROM user_study_progress
GROUP BY practice_mode;
