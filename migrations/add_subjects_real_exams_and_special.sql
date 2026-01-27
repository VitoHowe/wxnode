-- Add subjects, subject chapters, real exam tables, and special progress
-- Migration date: 2026-01-20

USE `wxnode_db`;

-- 1) Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NULL,
  status TINYINT DEFAULT 1 COMMENT '1:active 0:disabled',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_subject_name (name),
  UNIQUE KEY uk_subject_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Question banks -> subject_id
ALTER TABLE question_banks
  ADD COLUMN subject_id INT NULL COMMENT 'Subject ID' AFTER description;
ALTER TABLE question_banks
  ADD INDEX idx_subject_id (subject_id);
ALTER TABLE question_banks
  ADD CONSTRAINT fk_question_banks_subject
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

-- 3) Subject chapters + mapping
CREATE TABLE IF NOT EXISTS subject_chapters (
  id INT NOT NULL AUTO_INCREMENT,
  subject_id INT NOT NULL,
  chapter_name VARCHAR(200) NOT NULL,
  display_name VARCHAR(200) DEFAULT NULL,
  chapter_order INT NOT NULL DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_subject_chapter (subject_id, chapter_name),
  INDEX idx_subject_order (subject_id, chapter_order),
  CONSTRAINT fk_subject_chapters_subject FOREIGN KEY (subject_id)
    REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE question_chapters
  ADD COLUMN subject_chapter_id INT NULL COMMENT 'Subject chapter ID' AFTER bank_id;
ALTER TABLE question_chapters
  ADD INDEX idx_subject_chapter (subject_chapter_id);
ALTER TABLE question_chapters
  ADD CONSTRAINT fk_chapters_subject_chapter
  FOREIGN KEY (subject_chapter_id) REFERENCES subject_chapters(id) ON DELETE SET NULL;

-- 4) Random key for sampling
ALTER TABLE questions
  ADD COLUMN random_key INT NULL COMMENT 'Random key' AFTER tags;
ALTER TABLE questions
  ADD INDEX idx_random_key (random_key);

-- 5) Real exam papers and questions
CREATE TABLE IF NOT EXISTS real_exam_papers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  total_questions INT DEFAULT 0,
  status TINYINT DEFAULT 1 COMMENT '1:active 0:disabled',
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subject_id (subject_id),
  INDEX idx_status (status),
  CONSTRAINT fk_real_exam_subject FOREIGN KEY (subject_id)
    REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_real_exam_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS real_exam_questions (
  id INT NOT NULL AUTO_INCREMENT,
  paper_id INT NOT NULL,
  question_no INT NOT NULL,
  type ENUM('single', 'multiple', 'judge', 'fill', 'essay') NOT NULL,
  content TEXT NOT NULL,
  options JSON DEFAULT NULL,
  answer TEXT NOT NULL,
  explanation TEXT DEFAULT NULL,
  difficulty INT DEFAULT 1,
  tags JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_paper_question (paper_id, question_no),
  INDEX idx_paper (paper_id),
  INDEX idx_type (type),
  INDEX idx_difficulty (difficulty),
  CONSTRAINT fk_real_exam_questions_paper FOREIGN KEY (paper_id)
    REFERENCES real_exam_papers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) Real exam attempts and wrong questions (no progress saved)
CREATE TABLE IF NOT EXISTS real_exam_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  paper_id INT NOT NULL,
  total_questions INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  accuracy DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attempt_user (user_id),
  INDEX idx_attempt_paper (paper_id),
  CONSTRAINT fk_real_exam_attempt_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_real_exam_attempt_paper FOREIGN KEY (paper_id)
    REFERENCES real_exam_papers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS real_exam_wrong_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  attempt_id INT NOT NULL,
  user_id INT NOT NULL,
  paper_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_answer TEXT NULL,
  correct_answer TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_attempt_question (attempt_id, question_id),
  INDEX idx_wrong_user (user_id),
  INDEX idx_wrong_paper (paper_id),
  CONSTRAINT fk_wrong_attempt FOREIGN KEY (attempt_id)
    REFERENCES real_exam_attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_wrong_question FOREIGN KEY (question_id)
    REFERENCES real_exam_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7) Special training progress
CREATE TABLE IF NOT EXISTS user_special_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  subject_id INT NOT NULL,
  subject_chapter_id INT NOT NULL,
  current_question_number INT NULL,
  completed_count INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  last_study_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_subject_chapter (user_id, subject_id, subject_chapter_id),
  INDEX idx_special_subject (subject_id),
  INDEX idx_special_chapter (subject_chapter_id),
  CONSTRAINT fk_special_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_special_subject FOREIGN KEY (subject_id)
    REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_special_chapter FOREIGN KEY (subject_chapter_id)
    REFERENCES subject_chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
