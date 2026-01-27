-- Create markdown files and chapters tables
CREATE TABLE IF NOT EXISTS markdown_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  original_filename VARCHAR(500),
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  parse_status ENUM('pending','parsing','completed','failed') DEFAULT 'pending',
  chapter_count INT DEFAULT 0,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_markdown_status (parse_status),
  INDEX idx_markdown_created_by (created_by),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS markdown_chapters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  file_id INT NOT NULL,
  chapter_title VARCHAR(200) NOT NULL,
  chapter_order INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_markdown_file_chapter (file_id, chapter_order),
  INDEX idx_markdown_file_id (file_id),
  CONSTRAINT fk_markdown_chapters_file FOREIGN KEY (file_id)
    REFERENCES markdown_files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
