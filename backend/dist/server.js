"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const api_1 = __importDefault(require("./routes/api"));
// 加载环境变量
dotenv_1.default.config();
// 确保数据目录存在
const dataDir = path_1.default.join(__dirname, '..', 'data');
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// 中间件
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API路由
app.use('/api', api_1.default);
// 静态文件（如果需要）
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
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
exports.default = app;
