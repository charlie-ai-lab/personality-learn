const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');

const db = new Database('./data/personality-learn.db');

const app = express();
app.use(cors());
app.use(express.json());

// 测试路由
app.post('/test-intentions', (req, res) => {
  console.log('收到请求');
  const { topic, goal, current_level, learning_preference, lesson_duration } = req.body;
  console.log('请求数据:', { topic, goal, current_level, learning_preference, lesson_duration });
  
  const id = uuidv4();
  const sql = 'INSERT INTO learning_intentions (id, topic, goal, current_level, learning_preference, lesson_duration) VALUES (?, ?, ?, ?, ?, ?)';
  const stmt = db.prepare(sql);
  
  stmt.run(id, topic, goal, current_level, learning_preference, lesson_duration);
  console.log('插入成功，ID:', id);
  
  res.json({ success: true, data: { id, topic, goal } });
});

app.post('/test-plans/generate', (req, res) => {
  console.log('收到生成计划请求');
  const { intentionId } = req.body;
  console.log('intentionId:', intentionId);
  
  const intention = db.prepare('SELECT * FROM learning_intentions WHERE id = ?').get(intentionId);
  console.log('查询结果:', intention);
  
  if (!intention) {
    console.log('未找到意图');
    return res.status(404).json({ success: false, error: '未找到该学习意图' });
  }
  
  res.json({ success: true, data: intention });
});

app.listen(3003, () => {
  console.log('测试服务启动在端口3003');
});
