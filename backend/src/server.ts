import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRoutes from './routes/api';

// 加载环境变量
dotenv.config();

// 确保数据目录存在
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// API路由
app.use('/api', apiRoutes);

// 静态文件（如果需要）
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'personality-learn-backend',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎓 个性化学习后端服务已启动                                ║
║                                                            ║
║   服务地址: http://localhost:${PORT}                          ║
║   API文档:   http://localhost:${PORT}/api                     ║
║   健康检查:  http://localhost:${PORT}/health                  ║
║                                                            ║
║   API端点:                                                 ║
║   - POST   /api/intentions       创建学习意图               ║
║   - GET    /api/intentions       获取所有意图               ║
║   - POST   /api/plans/generate   AI生成学习计划             ║
║   - GET    /api/plans/:id        获取学习计划               ║
║   - GET    /api/chapters/:id/content  获取学习内容          ║
║   - POST   /api/progress/start/:chapterId  开始学习         ║
║   - POST   /api/progress/complete/:chapterId  完成学习      ║
║   - GET    /api/assessment/:chapterId  获取评估问题         ║
║   - POST   /api/assessment/submit  提交回答并评估           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
