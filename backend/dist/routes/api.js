"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../models/database"));
const aiService_1 = require("../services/aiService");
const router = (0, express_1.Router)();
// ============ 学习意图接口 ============
// 创建学习意图
router.post('/intentions', (req, res) => {
    try {
        const { topic, goal, current_level, learning_preference, lesson_duration } = req.body;
        const id = (0, uuid_1.v4)();
        const stmt = database_1.default.prepare(`
      INSERT INTO learning_intentions (id, topic, goal, current_level, learning_preference, lesson_duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, topic, goal, current_level, learning_preference, lesson_duration);
        res.json({
            success: true,
            data: { id, topic, goal, current_level, learning_preference, lesson_duration }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// 获取所有学习意图
router.get('/intentions', (req, res) => {
    try {
        const stmt = database_1.default.prepare('SELECT * FROM learning_intentions ORDER BY created_at DESC');
        const intentions = stmt.all();
        res.json({ success: true, data: intentions });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// 获取单个学习意图
router.get('/intentions/:id', (req, res) => {
    try {
        const stmt = database_1.default.prepare('SELECT * FROM learning_intentions WHERE id = ?');
        const intention = stmt.get(req.params.id);
        if (!intention) {
            return res.status(404).json({ success: false, error: '未找到该学习意图' });
        }
        res.json({ success: true, data: intention });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// ============ 学习计划接口 ============
// 创建学习计划（AI生成）
router.post('/plans/generate', async (req, res) => {
    try {
        const { intentionId } = req.body;
        console.log('[plans/generate] 收到请求, intentionId:', intentionId);
        console.log('[plans/generate] 请求体:', req.body);
        // 获取学习意图
        const intention = database_1.default.prepare('SELECT * FROM learning_intentions WHERE id = ?').get(intentionId);
        console.log('[plans/generate] 查询结果:', intention);
        if (!intention) {
            console.log('[plans/generate] 未找到意图，返回404');
            return res.status(404).json({ success: false, error: '未找到该学习意图' });
        }
        // AI生成学习计划
        const aiResponse = await (0, aiService_1.generateLearningPlan)(intention.topic, intention.goal, intention.current_level, intention.learning_preference, intention.lesson_duration);
        // 解析AI响应
        let planData;
        try {
            const match = aiResponse.match(/```json\n([\s\S]*?)\n```/);
            if (match) {
                planData = JSON.parse(match[1]);
            }
            else {
                planData = JSON.parse(aiResponse);
            }
        }
        catch {
            // 使用默认计划
            planData = {
                course_title: `${intention.topic}学习课程`,
                chapters: [
                    { title: '基础概念', description: '学习核心概念', learning_goal: '掌握基础', learning_method: intention.learning_preference, estimated_duration: intention.lesson_duration },
                    { title: '进阶内容', description: '深入学习', learning_goal: '深入理解', learning_method: intention.learning_preference, estimated_duration: intention.lesson_duration },
                    { title: '实践应用', description: '动手实践', learning_goal: '能够应用', learning_method: 'practice', estimated_duration: intention.lesson_duration }
                ]
            };
        }
        // 保存计划
        const planId = (0, uuid_1.v4)();
        const insertPlan = database_1.default.prepare(`
      INSERT INTO learning_plans (id, intention_id, course_title)
      VALUES (?, ?, ?)
    `);
        insertPlan.run(planId, intentionId, planData.course_title);
        // 保存章节
        const insertChapter = database_1.default.prepare(`
      INSERT INTO chapters (id, plan_id, title, description, learning_goal, learning_method, estimated_duration, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        planData.chapters.forEach((chapter, index) => {
            const chapterId = (0, uuid_1.v4)();
            insertChapter.run(chapterId, planId, chapter.title, chapter.description || '', chapter.learning_goal || '', chapter.learning_method || intention.learning_preference, chapter.estimated_duration || intention.lesson_duration, index + 1);
        });
        res.json({
            success: true,
            data: {
                id: planId,
                course_title: planData.course_title,
                chapters: planData.chapters
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// 获取学习计划
router.get('/plans/:id', (req, res) => {
    try {
        const plan = database_1.default.prepare('SELECT * FROM learning_plans WHERE id = ?').get(req.params.id);
        if (!plan) {
            return res.status(404).json({ success: false, error: '未找到该学习计划' });
        }
        const chapters = database_1.default.prepare('SELECT * FROM chapters WHERE plan_id = ? ORDER BY order_index').all(req.params.id);
        res.json({
            success: true,
            data: {
                ...plan,
                chapters
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// ============ 学习内容接口 ============
// 获取章节学习内容
router.get('/chapters/:id/content', async (req, res) => {
    try {
        const chapter = database_1.default.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
        if (!chapter) {
            return res.status(404).json({ success: false, error: '未找到该章节' });
        }
        // 获取计划信息
        const plan = database_1.default.prepare('SELECT * FROM learning_plans WHERE id = ?').get(chapter.plan_id);
        const intention = database_1.default.prepare(`
      SELECT li.* FROM learning_intentions li
      JOIN learning_plans lp ON lp.intention_id = li.id
      WHERE lp.id = ?
    `).get(chapter.plan_id);
        // AI生成学习内容
        const content = await (0, aiService_1.generateChapterContent)(intention?.topic || '学习主题', chapter.title, chapter.learning_goal, chapter.learning_method);
        res.json({
            success: true,
            data: {
                chapter,
                content,
                plan_title: plan?.course_title
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// ============ 学习进度接口 ============
// 开始学习章节
router.post('/progress/start/:chapterId', (req, res) => {
    try {
        const { chapterId } = req.params;
        // 检查是否已有进度
        let progress = database_1.default.prepare('SELECT * FROM learning_progress WHERE chapter_id = ?').get(chapterId);
        if (progress) {
            // 更新状态
            database_1.default.prepare(`
        UPDATE learning_progress
        SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(progress.id);
            return res.json({ success: true, data: { ...progress, status: 'in_progress' } });
        }
        // 创建新进度
        const id = (0, uuid_1.v4)();
        database_1.default.prepare(`
      INSERT INTO learning_progress (id, chapter_id, status, started_at)
      VALUES (?, ?, 'in_progress', CURRENT_TIMESTAMP)
    `).run(id, chapterId);
        res.json({
            success: true,
            data: { id, chapter_id: chapterId, status: 'in_progress' }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// 完成章节学习
router.post('/progress/complete/:chapterId', (req, res) => {
    try {
        const { chapterId } = req.params;
        const { userSelfAssessment } = req.body;
        const progress = database_1.default.prepare('SELECT * FROM learning_progress WHERE chapter_id = ?').get(chapterId);
        if (!progress) {
            return res.status(404).json({ success: false, error: '未找到学习进度' });
        }
        database_1.default.prepare(`
      UPDATE learning_progress
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          user_self_assessment = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(userSelfAssessment || 'pending', progress.id);
        res.json({
            success: true,
            data: { ...progress, status: 'completed', user_self_assessment: userSelfAssessment }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// 获取学习进度
router.get('/progress/:chapterId', (req, res) => {
    try {
        const progress = database_1.default.prepare('SELECT * FROM learning_progress WHERE chapter_id = ?').get(req.params.chapterId);
        res.json({ success: true, data: progress });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// 获取计划的所有进度
router.get('/progress/plan/:planId', (req, res) => {
    try {
        const chapters = database_1.default.prepare('SELECT id FROM chapters WHERE plan_id = ?').all(req.params.planId);
        const progressList = chapters.map((ch) => {
            return database_1.default.prepare('SELECT * FROM learning_progress WHERE chapter_id = ?').get(ch.id);
        });
        res.json({ success: true, data: progressList });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// ============ 评估接口 ============
// 生成评估问题
router.get('/assessment/:chapterId', async (req, res) => {
    try {
        const chapter = database_1.default.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.chapterId);
        if (!chapter) {
            return res.status(404).json({ success: false, error: '未找到该章节' });
        }
        // 获取意图信息
        const plan = database_1.default.prepare('SELECT * FROM learning_plans WHERE id = ?').get(chapter.plan_id);
        const intention = database_1.default.prepare(`
      SELECT li.* FROM learning_intentions li
      JOIN learning_plans lp ON lp.intention_id = li.id
      WHERE lp.id = ?
    `).get(chapter.plan_id);
        // AI生成评估问题
        const questions = await (0, aiService_1.generateAssessmentQuestions)(intention?.topic || '学习主题', chapter.title, chapter.learning_goal);
        // 保存问题
        const insertQuestion = database_1.default.prepare(`
      INSERT INTO assessment_questions (id, chapter_id, question, question_type, expected_answer)
      VALUES (?, ?, ?, ?, ?)
    `);
        const savedQuestions = questions.map(q => {
            const id = (0, uuid_1.v4)();
            insertQuestion.run(id, chapter.id, q.question, q.type, q.answer);
            return { id, ...q };
        });
        res.json({
            success: true,
            data: savedQuestions
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// 提交回答并评估
router.post('/assessment/submit', async (req, res) => {
    try {
        const { questionId, answer } = req.body;
        const question = database_1.default.prepare('SELECT * FROM assessment_questions WHERE id = ?').get(questionId);
        if (!question) {
            return res.status(404).json({ success: false, error: '未找到该问题' });
        }
        // AI评估
        const evaluation = await (0, aiService_1.evaluateAnswer)(question.question, answer, question.expected_answer);
        // 保存回答
        const id = (0, uuid_1.v4)();
        database_1.default.prepare(`
      INSERT INTO user_answers (id, question_id, answer, is_correct)
      VALUES (?, ?, ?, ?)
    `).run(id, questionId, answer, evaluation.correct ? 1 : 0);
        res.json({
            success: true,
            data: {
                answer_id: id,
                ...evaluation
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
// ============ 健康检查 ============
router.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
exports.default = router;
