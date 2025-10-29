-- 为 parse_logs 表添加详细日志字段
-- 执行日期: 2025-10-14

USE `wxnode_db`;

-- 添加 request_data 字段
ALTER TABLE `parse_logs` 
ADD COLUMN `request_data` JSON NULL COMMENT '请求数据（fileContentResult、parts等）' 
AFTER `processing_time`;

-- 添加 response_data 字段
ALTER TABLE `parse_logs` 
ADD COLUMN `response_data` JSON NULL COMMENT 'API响应数据' 
AFTER `request_data`;

-- 验证字段是否添加成功
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'wxnode_db' 
  AND TABLE_NAME = 'parse_logs' 
  AND COLUMN_NAME IN ('request_data', 'response_data');
