"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = path_1.default.resolve(__dirname, '..', '..', 'data', 'personality-learn.db');
const db = new better_sqlite3_1.default(dbPath);
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
exports.default = db;
