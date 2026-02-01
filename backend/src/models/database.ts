import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '..', '..', 'data', 'personality-learn.db');
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 创建表
db.exec(`
  -- 用户学习意图表
  CREATE TABLE IF NOT EXISTS learning_intentions (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    goal TEXT,
    current_level TEXT,
    learning_preference TEXT,
    lesson_duration INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 学习计划表
  CREATE TABLE IF NOT EXISTS learning_plans (
    id TEXT PRIMARY KEY,
    intention_id TEXT NOT NULL,
    course_title TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intention_id) REFERENCES learning_intentions(id) ON DELETE CASCADE
  );

  -- 章节表
  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    learning_goal TEXT,
    learning_method TEXT,
    estimated_duration INTEGER,
    order_index INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES learning_plans(id) ON DELETE CASCADE
  );

  -- 学习进度表
  CREATE TABLE IF NOT EXISTS learning_progress (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    status TEXT DEFAULT 'not_started',
    started_at TEXT,
    completed_at TEXT,
    user_self_assessment TEXT,
    ai_evaluation TEXT,
    score REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
  );

  -- 评估问题表
  CREATE TABLE IF NOT EXISTS assessment_questions (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    question TEXT NOT NULL,
    question_type TEXT,
    expected_answer TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
  );

  -- 用户回答表
  CREATE TABLE IF NOT EXISTS user_answers (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    answer TEXT NOT NULL,
    is_correct INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
  );
`);

console.log('✅ 数据库初始化完成:', dbPath);

export default db;

export interface LearningIntention {
  id: string;
  topic: string;
  goal: string;
  current_level: string;
  learning_preference: string;
  lesson_duration: number;
  created_at: string;
}

export interface Chapter {
  id: string;
  plan_id: string;
  title: string;
  description: string;
  learning_goal: string;
  learning_method: string;
  estimated_duration: number;
  order_index: number;
}

export interface LearningProgress {
  id: string;
  chapter_id: string;
  status: string;
  started_at: string;
  completed_at: string;
  user_self_assessment: string;
  ai_evaluation: string;
  score: number;
}
