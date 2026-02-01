import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { LearningIntention, Chapter, LearningProgress } from '../models/database';
import { generateClarificationQuestions, generateLearningPlan, generateChapterContent, generateAssessmentQuestions, evaluateAnswer } from '../services/aiService';

const router = Router();

// ============ 学习意图接口 ============

// 创建学习意图（第一步）
router.post('/intentions', async (req: Request, res: Response) => {
  try {
    const { topic, goal, current_level } = req.body;
    
    const id = uuidv4();
    
    // 保存基础信息
    const stmt = db.prepare(`
      INSERT INTO learning_intentions (id, topic, goal, current_level)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, topic, goal, current_level);
    
    // 生成动态澄清问题
    const aiResponse = await generateClarificationQuestions(topic, goal, current_level);
    
    let questions: any[] = [];
    try {
      const match = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        questions = JSON.parse(match[1]);
      } else {
        questions = JSON.parse(aiResponse);
      }
    } catch {
      // 使用默认问题
      questions = [
        { question: `你学习${topic}每天能投入多少时间？`, type: 'text', options: null },
        { question: `你更倾向于哪种学习方式？`, type: 'choice', options: ['理论学习', '动手实践', '理论+实践'] },
        { question: `你有相关的学习经验吗？`, type: 'choice', options: ['完全没有', '了解一些', '有一定基础', '比较熟练'] }
      ];
    }
    
    // 保存问题
    const insertQuestion = db.prepare(`
      INSERT INTO clarification_questions (id, intention_id, question, question_type, options, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    questions.forEach((q: any, index: number) => {
      insertQuestion.run(uuidv4(), id, q.question, q.type, JSON.stringify(q.options), index + 1);
    });
    
    res.json({
      success: true,
      data: {
        id,
        topic,
        goal,
        current_level,
        step: 'clarification',
        questions_count: questions.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// 获取澄清问题列表（第二步）
router.get('/intentions/:id/questions', (req: Request, res: Response) => {
  try {
    const intentionId = req.params.id;
    
    const intention: any = db.prepare('SELECT * FROM learning_intentions WHERE id = ?').get(intentionId);
    if (!intention) {
      return res.status(404).json({ success: false, error: '未找到该学习意图' });
    }
    
    const questions = db.prepare(`
      SELECT id, question, question_type, options, order_index, answered
      FROM clarification_questions
      WHERE intention_id = ? AND answered = 0
      ORDER BY order_index
    `).all(intentionId) as any[];
    
    // 解析options
    questions.forEach(q => {
      q.options = q.options ? JSON.parse(q.options) : null;
    });
    
    res.json({
      success: true,
      data: {
        intention: {
          id: intention.id,
          topic: intention.topic,
          goal: intention.goal
        },
        questions,
        total: questions.length,
        answered: questions.filter(q => q.answered).length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// 回答澄清问题（第三步）
router.post('/intentions/:id/answers', async (req: Request, res: Response) => {
  try {
    const intentionId = req.params.id;
    const { question_id, answer } = req.body;
    
    const question = db.prepare('SELECT * FROM clarification_questions WHERE id = ?').get(question_id) as any;
    if (!question) {
      return res.status(404).json({ success: false, error: '未找到该问题' });
    }
    
    // 保存回答
    const answerId = uuidv4();
    db.prepare(`
      INSERT INTO user_answers (id, question_id, intention_id, answer)
      VALUES (?, ?, ?, ?)
    `).run(answerId, question_id, intentionId, answer);
    
    // 标记问题为已回答
    db.prepare('UPDATE clarification_questions SET answered = 1 WHERE id = ?').run(question_id);
    
    // 检查是否还有未回答的问题
    const remainingQuestions = db.prepare(`
      SELECT COUNT(*) as count FROM clarification_questions
      WHERE intention_id = ? AND answered = 0
    `).get(intentionId) as any;
    
    const isComplete = remainingQuestions.count === 0;
    
    res.json({
      success: true,
      data: {
        answer_id: answerId,
        is_complete: isComplete,
        remaining: remainingQuestions.count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// 获取所有学习意图
router.get('/intentions', (req: Request, res: Response) => {
  try {
    const intentions = db.prepare('SELECT * FROM learning_intentions ORDER BY created_at DESC').all() as LearningIntention[];
    res.json({ success: true, data: intentions });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============ 学习计划接口 ============

// 创建学习计划（AI生成，基于澄清答案）
router.post('/plans/generate', async (req: Request, res: Response) => {
  try {
    const { intention_id } = req.body;
    
    // 获取学习意图
    const intention = db.prepare('SELECT * FROM learning_intentions WHERE id = ?').get(intention_id) as any;
    if (!intention) {
      return res.status(404).json({ success: false, error: '未找到该学习意图' });
    }
    
    // 检查是否所有问题都已回答
    const remainingQuestions = db.prepare(`
      SELECT COUNT(*) as count FROM clarification_questions
      WHERE intention_id = ? AND answered = 0
    `).get(intention_id) as any;
    
    if (remainingQuestions.count > 0) {
      return res.status(400).json({
        success: false,
        error: '请先回答所有澄清问题',
        remaining: remainingQuestions.count
      });
    }
    
    // 获取所有回答
    const answers = db.prepare(`
      SELECT q.question, a.answer
      FROM user_answers a
      JOIN clarification_questions q ON q.id = a.question_id
      WHERE a.intention_id = ?
    `).all(intention_id) as { question: string; answer: string }[];
    
    // AI生成学习计划
    const aiResponse = await generateLearningPlan(
      intention.topic,
      intention.goal,
      intention.current_level,
      intention.learning_preference || '理论+实践',
      intention.lesson_duration || 30,
      answers
    );
    
    // 解析AI响应
    let planData;
    try {
      const match = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        planData = JSON.parse(match[1]);
      } else {
        planData = JSON.parse(aiResponse);
      }
    } catch {
      // 使用默认计划
      planData = {
        course_title: `${intention.topic}学习课程`,
        chapters: [
          { title: '基础概念', description: '学习核心概念', learning_goal: '掌握基础', learning_method: intention.learning_preference || '理论+实践', estimated_duration: intention.lesson_duration || 30 },
          { title: '进阶内容', description: '深入学习', learning_goal: '深入理解', learning_method: intention.learning_preference || '理论+实践', estimated_duration: intention.lesson_duration || 30 },
          { title: '实践应用', description: '动手实践', learning_goal: '能够应用', learning_method: 'practice', estimated_duration: intention.lesson_duration || 30 }
        ]
      };
    }
    
    // 保存计划
    const planId = uuidv4();
    db.prepare(`
      INSERT INTO learning_plans (id, intention_id, course_title)
      VALUES (?, ?, ?)
    `).run(planId, intention_id, planData.course_title);
    
    // 保存章节
    const insertChapter = db.prepare(`
      INSERT INTO chapters (id, plan_id, title, description, learning_goal, learning_method, estimated_duration, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    planData.chapters.forEach((chapter: any, index: number) => {
      const chapterId = uuidv4();
      insertChapter.run(
        chapterId,
        planId,
        chapter.title,
        chapter.description || '',
        chapter.learning_goal || '',
        chapter.learning_method || intention.learning_preference,
        chapter.estimated_duration || intention.lesson_duration,
        index + 1
      );
    });
    
    res.json({
      success: true,
      data: {
        id: planId,
        course_title: planData.course_title,
        chapters_count: planData.chapters.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// 获取学习计划
router.get('/plans/:id', (req: Request, res: Response) => {
  try {
    const plan = db.prepare('SELECT * FROM learning_plans WHERE id = ?').get(req.params.id) as any;
    if (!plan) {
      return res.status(404).json({ success: false, error: '未找到该学习计划' });
    }
    
    const chapters = db.prepare('SELECT * FROM chapters WHERE plan_id = ? ORDER BY order_index').all(req.params.id) as Chapter[];
    
    res.json({
      success: true,
      data: {
        ...plan,
        chapters
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// 获取所有学习计划
router.get('/plans', (req: Request, res: Response) => {
  try {
    const plans = db.prepare(`
      SELECT lp.*, li.topic, li.goal
      FROM learning_plans lp
      JOIN learning_intentions li ON li.id = lp.intention_id
      ORDER BY lp.created_at DESC
    `).all();
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============ 学习进度接口 ============

router.post('/progress/start/:chapterId', (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    
    let progress = db.prepare('SELECT * FROM learning_progress WHERE chapter_id = ?').get(chapterId) as LearningProgress | undefined;
    
    if (progress) {
      db.prepare('UPDATE learning_progress SET status = ?, started_at = ?, updated_at = ? WHERE id = ?')
        .run('in_progress', new Date().toISOString(), new Date().toISOString(), progress.id);
    } else {
      const id = uuidv4();
      db.prepare('INSERT INTO learning_progress (id, chapter_id, status, started_at) VALUES (?, ?, ?, ?)')
        .run(id, chapterId, 'in_progress', new Date().toISOString());
    }
    
    res.json({ success: true, message: '开始学习' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.post('/progress/complete/:chapterId', (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    const { selfAssessment } = req.body;
    
    let progress = db.prepare('SELECT * FROM learning_progress WHERE chapter_id = ?').get(chapterId) as LearningProgress | undefined;
    
    if (progress) {
      db.prepare('UPDATE learning_progress SET status = ?, completed_at = ?, user_self_assessment = ?, updated_at = ? WHERE id = ?')
        .run('completed', new Date().toISOString(), selfAssessment, new Date().toISOString(), progress.id);
    } else {
      const id = uuidv4();
      db.prepare('INSERT INTO learning_progress (id, chapter_id, status, completed_at, user_self_assessment) VALUES (?, ?, ?, ?, ?)')
        .run(id, chapterId, 'completed', new Date().toISOString(), selfAssessment);
    }
    
    res.json({ success: true, message: '章节完成' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============ 学习内容接口 ============

router.get('/chapters/:id/content', async (req: Request, res: Response) => {
  try {
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id) as Chapter | undefined;
    
    if (!chapter) {
      return res.status(404).json({ success: false, error: '未找到该章节' });
    }
    
    const plan = db.prepare('SELECT * FROM learning_plans WHERE id = ?').get(chapter.plan_id) as any;
    const intention = db.prepare(`
      SELECT li.* FROM learning_intentions li
      JOIN learning_plans lp ON lp.intention_id = li.id
      WHERE lp.id = ?
    `).get(chapter.plan_id) as any;
    
    // AI生成学习内容
    const content = await generateChapterContent(
      intention?.topic || '学习主题',
      chapter.title,
      chapter.learning_goal,
      chapter.learning_method
    );
    
    res.json({
      success: true,
      data: {
        chapter,
        content,
        plan_title: plan?.course_title
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============ 评估接口 ============

router.get('/assessment/:chapterId', async (req: Request, res: Response) => {
  try {
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id) as any;
    if (!chapter) {
      return res.status(404).json({ success: false, error: '未找到该章节' });
    }
    
    const plan = db.prepare('SELECT * FROM learning_plans WHERE id = ?').get(chapter.plan_id) as any;
    const intention = db.prepare(`
      SELECT li.* FROM learning_intentions li
      JOIN learning_plans lp ON lp.intention_id = li.id
      WHERE lp.id = ?
    `).get(chapter.plan_id) as any;
    
    // AI生成评估问题
    const aiResponse = await generateAssessmentQuestions(
      intention?.topic || '学习主题',
      chapter.title
    );
    
    let questions;
    try {
      const match = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        questions = JSON.parse(match[1]);
      } else {
        questions = JSON.parse(aiResponse);
      }
    } catch {
      questions = [
        { question: `请简述${chapter.title}的核心概念`, type: 'short', expected_answer: '' },
        { question: `判断：${chapter.learning_goal}是本章的学习目标`, type: 'judgment', expected_answer: '正确' }
      ];
    }
    
    // 保存问题
    const insertQuestion = db.prepare(`
      INSERT INTO assessment_questions (id, chapter_id, question, question_type, expected_answer)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const savedQuestions = [];
    for (const q of questions) {
      const id = uuidv4();
      insertQuestion.run(id, req.params.id, q.question, q.type, q.expected_answer || '');
      savedQuestions.push({ id, ...q });
    }
    
    res.json({
      success: true,
      data: {
        chapter_title: chapter.title,
        questions: savedQuestions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.post('/assessment/submit', async (req: Request, res: Response) => {
  try {
    const { questionId, answer } = req.body;
    
    const question: any = db.prepare('SELECT * FROM assessment_questions WHERE id = ?').get(questionId);
    
    if (!question) {
      return res.status(404).json({ success: false, error: '未找到该问题' });
    }
    
    // AI评估
    const evaluation = await evaluateAnswer(question.question, answer, question.expected_answer);
    
    // 保存回答
    const id = uuidv4();
    db.prepare(`
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
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
