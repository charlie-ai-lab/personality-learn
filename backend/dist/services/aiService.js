"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithAI = generateWithAI;
exports.generateLearningPlan = generateLearningPlan;
exports.generateChapterContent = generateChapterContent;
exports.generateAssessmentQuestions = generateAssessmentQuestions;
exports.evaluateAnswer = evaluateAnswer;
// AI服务 - 使用Minimax API生成学习内容
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MINIMAX_API_URL = process.env.MINIMAX_API_URL || 'https://api.minimax.chat/v1';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'abab5.5-chat';
async function generateWithAI(prompt) {
    try {
        // 模拟AI响应（如果没有配置API）
        if (!process.env.MINIMAX_API_KEY) {
            return {
                success: true,
                content: generateMockResponse(prompt)
            };
        }
        const response = await fetch(`${MINIMAX_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`
            },
            body: JSON.stringify({
                model: MINIMAX_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的AI学习导师，擅长根据用户需求生成个性化的学习计划和内容。回答要简洁、清晰、有条理。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        const data = await response.json();
        if (data.choices && data.choices[0]) {
            return {
                success: true,
                content: data.choices[0].message.content
            };
        }
        return {
            success: false,
            error: 'AI响应格式错误',
            content: ''
        };
    }
    catch (error) {
        return {
            success: false,
            error: String(error),
            content: ''
        };
    }
}
// 生成学习计划
async function generateLearningPlan(topic, goal, currentLevel, preference, duration) {
    const prompt = `
作为AI学习导师，请为以下学习需求生成个性化的学习计划：

**学习主题**: ${topic}
**学习目标**: ${goal}
**当前水平**: ${currentLevel}
**学习方式偏好**: ${preference}
**单节课时长**: ${duration}分钟

请生成一个结构化的学习计划，包含：
1. 课程标题
2. 3-5个章节（每个章节包含：标题、学习目标、学习方式、预计时长）
3. 以JSON格式返回，格式如下：
\`\`\`json
{
  "course_title": "课程标题",
  "chapters": [
    {
      "title": "章节标题",
      "description": "章节描述",
      "learning_goal": "学习目标",
      "learning_method": "理论/实践/理论+实践",
      "estimated_duration": 预计时长(分钟)
    }
  ]
}
\`\`\`
`;
    const result = await generateWithAI(prompt);
    return result.success ? result.content : generateMockPlan(topic, goal, currentLevel, preference, duration);
}
// 生成学习内容
async function generateChapterContent(topic, chapterTitle, learningGoal, learningMethod) {
    const prompt = `
作为AI学习导师，请为以下章节生成详细的学习内容：

**课程主题**: ${topic}
**章节标题**: ${chapterTitle}
**学习目标**: ${learningGoal}
**学习方式**: ${learningMethod}

请生成以下内容：
1. 章节简介
2. 核心知识点（用简洁的要点列出）
3. 详细讲解
4. 示例或实践步骤
5. 小贴士

用Markdown格式返回，内容要实用、易懂。
`;
    const result = await generateWithAI(prompt);
    return result.success ? result.content : generateMockContent(chapterTitle, learningGoal);
}
// 生成评估问题
async function generateAssessmentQuestions(topic, chapterTitle, learningGoal) {
    const prompt = `
作为AI学习导师，请为以下章节生成简单的评估问题：

**课程主题**: ${topic}
**章节标题**: ${chapterTitle}
**学习目标**: ${learningGoal}

请生成3-5个简单的评估问题（可以是判断题、选择题、简答题）来检验学习效果。

以JSON数组格式返回：
\`\`\`json
[
  {
    "question": "问题内容",
    "type": "true_false/choice/short_answer",
    "answer": "参考答案"
  }
]
\`\`\`
`;
    const result = await generateWithAI(prompt);
    return result.success ? parseQuestions(result.content) : generateMockQuestions(chapterTitle);
}
// 评估用户回答
async function evaluateAnswer(question, userAnswer, expectedAnswer) {
    const prompt = `
作为AI学习导师，请评估用户的回答：

**问题**: ${question}
**参考答案**: ${expectedAnswer}
**用户回答**: ${userAnswer}

请判断回答是否正确，并给出简要反馈。

以JSON格式返回：
\`\`\`json
{
  "correct": true/false,
  "feedback": "简短反馈",
  "score": 0-100
}
\`\`\`
`;
    const result = await generateWithAI(prompt);
    if (result.success) {
        return parseEvaluation(result.content);
    }
    // 简单匹配
    const isCorrect = userAnswer.toLowerCase().includes(expectedAnswer.toLowerCase());
    return {
        correct: isCorrect,
        feedback: isCorrect ? '回答正确！' : '建议再学习一下相关内容',
        score: isCorrect ? 100 : 50
    };
}
// 模拟响应函数
function generateMockResponse(prompt) {
    return `模拟AI响应：\n\n根据您的需求，我为您生成了以下内容。\n\n（这是模拟响应，请配置MINIMAX_API_KEY以使用真实AI）`;
}
function generateMockPlan(topic, goal, level, pref, dur) {
    const chapters = [];
    const count = pref === 'theory' ? 3 : (pref === 'practice' ? 5 : 4);
    for (let i = 1; i <= count; i++) {
        chapters.push({
            title: `${topic} - 第${i}章`,
            description: `本章介绍${topic}的核心概念和基础知识`,
            learning_goal: `掌握${topic}的基本原理`,
            learning_method: pref,
            estimated_duration: dur
        });
    }
    return `\`\`\`json
{
  "course_title": "${topic}系统学习课程",
  "chapters": ${JSON.stringify(chapters, null, 2)}
}
\`\`\``;
}
function generateMockContent(title, goal) {
    return `# ${title}

## 简介
欢迎学习本章内容！本章将帮助您达成学习目标：${goal}。

## 核心知识点

- 概念一：基础定义和原理
- 概念二：关键术语解释
- 概念三：应用场景
- 概念四：最佳实践

## 详细讲解

### 1. 基础概念
（这里应该是详细的讲解内容...）

### 2. 进阶内容
（这里应该是进阶内容...）

## 示例与实践

\`\`\`javascript
// 示例代码
console.log("Hello, World!");
\`\`\`

## 小贴士
- 建议边学边练
- 多做笔记加深记忆
- 实践出真知
`;
}
function generateMockQuestions(chapter) {
    return [
        {
            question: `关于${chapter}，以下说法是否正确：学习目标是掌握核心概念`,
            type: 'true_false',
            answer: '正确'
        },
        {
            question: `${chapter}的主要目的是什么？`,
            type: 'short_answer',
            answer: '掌握基础知识和技能'
        },
        {
            question: `${chapter}学习中应该怎么做？`,
            type: 'choice',
            answer: '理论与实践相结合'
        }
    ];
}
function parseQuestions(content) {
    try {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match) {
            return JSON.parse(match[1]);
        }
        // 尝试直接解析
        return JSON.parse(content);
    }
    catch {
        return generateMockQuestions('章节');
    }
}
function parseEvaluation(content) {
    try {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match) {
            return JSON.parse(match[1]);
        }
        return JSON.parse(content);
    }
    catch {
        return { correct: false, feedback: '评估失败', score: 0 };
    }
}
