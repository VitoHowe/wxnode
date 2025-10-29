-- 添加解析JSON文件路径字段
-- 执行日期: 2025-10-29
-- 说明: 将解析后的JSON保存为文件，而非存储在数据库中

USE `wxnode_db`;

-- 检查字段是否已存在
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'wxnode_db' 
    AND TABLE_NAME = 'question_banks' 
    AND COLUMN_NAME = 'parsed_json_path'
);

-- 如果字段不存在，则添加
SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `question_banks` ADD COLUMN `parsed_json_path` VARCHAR(500) NULL COMMENT ''解析后的JSON文件路径'' AFTER `file_path`',
  'SELECT ''字段 parsed_json_path 已存在，跳过'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 验证
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'wxnode_db' 
  AND TABLE_NAME = 'question_banks' 
  AND COLUMN_NAME IN ('file_path', 'parsed_json_path');
