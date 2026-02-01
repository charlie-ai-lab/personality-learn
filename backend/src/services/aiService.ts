import dotenv from 'dotenv';
dotenv.config();

// 使用配置文件中的Minimax API Key
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-ZCBjkdBFc62b7ptVa4NVMgftiSuN1nhcXijqcz3rs6gL5GqVa6L90Wbqj6UdDlh3GiCqBDc5SOUU-kIuONVSGlCMi055J9bWu6E6cBxdwNUf12nrwbqti3g';
const MINIMAX_API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

interface AIResponse {
  success: boolean;
  content: string;
  error?: string;
}

export async function callMinimax(prompt: string): Promise<AIResponse> {
  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`
      },
      body: JSON.stringify({
        model: 'abab6.5s-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的AI学习导师，擅长根据学习者的需求生成个性化的学习计划。你的回复简洁、专业、有针对性。'
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

    const data = await response.json() as any;
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
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
  } catch (error) {
    return {
      success: false,
      error: String(error),
      content: ''
    };
  }
}

// 生成动态澄清问题
export async function generateClarificationQuestions(
  topic: string,
  goal: string,
  currentLevel: string
): Promise<string> {
  const prompt = `
作为AI学习导师，用户想学习"${topic}"，目标是"${goal}"，当前水平是"${currentLevel}"。

请生成3-5个针对性的澄清问题，帮助更好地了解用户需求，生成更个性化的学习计划。

要求：
1. 问题要针对学习内容的特点
2. 包含不同类型的问题（选择、填空）
3. 问题要有深度，能帮助精确定制学习路径
4. 用JSON数组格式返回，每道问题包含：
   - question: 问题内容
   - type: "choice" 或 "text"
   - options: 选项数组（如果是选择题）

示例格式：
\`\`\`json
[
  {
    "question": "你学习Python的主要目的是什么？",
    "type": "choice",
    "options": ["Web开发", "数据分析", "机器学习", "自动化脚本"]
  },
  {
    "question": "你每天能投入多少时间学习？",
    "type": "text",
    "options": null
  }
]
\`\`\`

请直接返回JSON，不要有其他内容。
`;

  const response = await callMinimax(prompt);
  return response.success ? response.content : '';
}

// 生成学习计划
export async function generateLearningPlan(
  topic: string,
  goal: string,
  currentLevel: string,
  preference: string,
  duration: number,
  clarifications: { question: string; answer: string }[]
): Promise<string> {
  const clarificationText = clarifications.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n');
  
  const prompt = `
作为AI学习导师，请为以下学习需求生成个性化的学习计划：

**基础信息**：
- 学习主题: ${topic}
- 学习目标: ${goal}
- 当前水平: ${currentLevel}
- 学习偏好: ${preference}
- 单节课时长: ${duration}分钟

**澄清信息**：
${clarificationText}

请生成一个完整的学习计划，要求：
1. 课程标题要体现学习内容
2. 3-5个章节，每个章节包含：标题、描述、学习目标、学习方式、预计时长
3. 学习方式要结合用户偏好和澄清问题的答案
4. 章节要有逻辑递进性

请用JSON格式返回：
\`\`\`json
{
  "course_title": "课程标题",
  "chapters": [
    {
      "title": "章节标题",
      "description": "章节描述",
      "learning_goal": "学习目标",
      "learning_method": "理论/实践/理论+实践",
      "estimated_duration": 预计时长分钟数
    }
  ]
}
\`\`\`
`;

  const response = await callMinimax(prompt);
  return response.success ? response.content : '';
}

// 生成章节学习内容
export async function generateChapterContent(
  topic: string,
  chapterTitle: string,
  goal: string,
  method: string
): Promise<string> {
  const prompt = `
作为AI学习导师，请为"${topic}"的"${chapterTitle}"章节生成学习内容。

学习目标：${goal}
学习方式：${method}

要求：
1. 生成详细的学习内容，包括概念解释、原理说明
2. 提供2-3个实际示例或代码片段
3. 包含动手操作的步骤指南
4. 内容要有深度，但也要通俗易懂
5. 使用Markdown格式

请直接返回学习内容。
`;

  const response = await callMinimax(prompt);
  return response.success ? response.content : '';
}

// 生成评估问题
export async function generateAssessmentQuestions(
  topic: string,
  chapterTitle: string
): Promise<string> {
  const prompt = `
作为AI学习导师，请为"${topic}"的"${chapterTitle}"章节生成3个评估问题。

要求：
1. 包含不同类型的问题（判断题、简答题、实践题）
2. 问题要有针对性，能检验学习效果
3. 简答题要提供参考答案要点

请用JSON格式返回：
\`\`\`json
[
  {
    "question": "问题内容",
    "type": "judgment/short/practice",
    "expected_answer": "参考答案"
  }
]
\`\`\`
`;

  const response = await callMinimax(prompt);
  return response.success ? response.content : '';
}

// 评估用户答案
export async function evaluateAnswer(
  question: string,
  userAnswer: string,
  expectedAnswer: string
): Promise<{ correct: boolean; feedback: string; score: number }> {
  const prompt = `
作为AI学习导师，请评估用户对以下问题的回答：

问题：${question}
参考答案：${expectedAnswer}
用户回答：${userAnswer}

请评估用户回答的质量，返回JSON格式：
\`\`\`json
{
  "correct": true/false,
  "score": 0-100的分数,
  "feedback": "简短的评价和反馈"
}
\`\`\`
`;

  const response = await callMinimax(prompt);
  
  if (!response.success) {
    return {
      correct: false,
      feedback: response.error || '评估失败',
      score: 0
    };
  }

  try {
    const match = response.content.match(/```json\n([\s\S]*?)\n```/);
    if (match) {
      const data = JSON.parse(match[1]);
      return {
        correct: data.correct,
        score: data.score,
        feedback: data.feedback
      };
    }
  } catch {
    // 解析失败返回默认结果
  }

  return {
    correct: false,
    feedback: '无法评估',
    score: 0
  };
}
