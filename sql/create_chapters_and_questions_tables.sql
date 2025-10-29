-- 创建章节表和题目表
-- 执行日期: 2025-10-29
-- 说明: 将parse_results的JSON数据拆分为章节和题目表，优化查询性能

USE `wxnode_db`;

-- 1. 创建题库章节表
CREATE TABLE IF NOT EXISTS `question_chapters` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `bank_id` INT NOT NULL COMMENT '关联的题库ID',
  `chapter_name` VARCHAR(200) NOT NULL COMMENT '章节名称',
  `chapter_order` INT NOT NULL COMMENT '章节顺序',
  `question_count` INT NOT NULL DEFAULT 0 COMMENT '该章节题目数量',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bank_chapter` (`bank_id`, `chapter_name`),
  INDEX `idx_bank_order` (`bank_id`, `chapter_order`),
  CONSTRAINT `fk_chapters_bank_id` FOREIGN KEY (`bank_id`) 
    REFERENCES `question_banks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='题库章节表';

-- 2. 创建题目表
CREATE TABLE IF NOT EXISTS `questions` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `bank_id` INT NOT NULL COMMENT '关联的题库ID',
  `chapter_id` INT NOT NULL COMMENT '关联的章节ID',
  `question_no` VARCHAR(50) DEFAULT NULL COMMENT '题号',
  `type` ENUM('single', 'multiple', 'judge', 'fill', 'essay') NOT NULL COMMENT '题型',
  `content` TEXT NOT NULL COMMENT '题目内容',
  `options` JSON DEFAULT NULL COMMENT '选项（JSON数组）',
  `answer` TEXT NOT NULL COMMENT '答案',
  `explanation` TEXT DEFAULT NULL COMMENT '解析',
  `difficulty` INT DEFAULT 1 COMMENT '难度：1-简单 2-中等 3-困难',
  `tags` JSON DEFAULT NULL COMMENT '标签（JSON数组）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_bank` (`bank_id`),
  INDEX `idx_chapter` (`chapter_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_difficulty` (`difficulty`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_questions_bank_id_v3` FOREIGN KEY (`bank_id`) 
    REFERENCES `question_banks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_questions_chapter_id_v3` FOREIGN KEY (`chapter_id`) 
    REFERENCES `question_chapters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='题目表';

-- 3. 验证表结构
DESC `question_chapters`;
DESC `questions`;

-- 4. 查看表信息
SELECT 
  TABLE_NAME, 
  TABLE_COMMENT,
  CREATE_TIME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'wxnode_db' 
  AND TABLE_NAME IN ('question_chapters', 'questions');

-- 注意：
-- 1. parse_results表保留作为原始数据备份
-- 2. 需要编写数据迁移脚本从parse_results迁移到新表
-- 3. API需要适配新的表结构
