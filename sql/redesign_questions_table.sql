-- 重新设计题目存储结构
-- 执行日期: 2025-10-19
-- 说明: 将原有的单题目记录改为存储整个解析结果

USE `wxnode_db`;

-- 1. 备份现有 questions 表（如果需要的话）
-- CREATE TABLE `questions_backup` AS SELECT * FROM `questions`;

-- 2. 删除现有 questions 表
DROP TABLE IF EXISTS `questions`;

-- 3. 创建新的 parse_results 表
CREATE TABLE `parse_results` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `bank_id` INT NOT NULL COMMENT '关联的题库ID',
  `questions` JSON NOT NULL COMMENT '解析得到的题目数组(JSON格式)',
  `total_questions` INT NOT NULL DEFAULT 0 COMMENT '题目总数',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_bank_id` (`bank_id`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_parse_results_bank_id` FOREIGN KEY (`bank_id`) 
    REFERENCES `question_banks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='解析结果表';

-- 4. 验证表结构
DESC `parse_results`;

-- 5. 查看表信息
SELECT 
  TABLE_NAME, 
  TABLE_COMMENT,
  CREATE_TIME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'wxnode_db' 
  AND TABLE_NAME = 'parse_results';
