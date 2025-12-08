-- 用户单词练习进度表
CREATE TABLE IF NOT EXISTS user_word_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  word_entry_id INT NOT NULL,
  status ENUM('pending','review','mastered') NOT NULL DEFAULT 'pending',
  is_favorite TINYINT(1) NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  last_practice_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_word (user_id, word_entry_id),
  KEY idx_user_book (user_id, book_id),
  KEY idx_book_word (book_id, word_entry_id)
);

-- 用户单词书学习位置表
CREATE TABLE IF NOT EXISTS user_word_book_state (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  last_word_entry_id INT NULL,
  last_word_order_index INT NULL,
  last_practice_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_book (user_id, book_id),
  KEY idx_user_book_state (user_id, book_id)
);
