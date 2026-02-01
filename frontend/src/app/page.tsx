'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  question: string;
  question_type: string;
  options: string[] | null;
  order_index: number;
}

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: 基础信息
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('初学者');
  
  // Step 2: 澄清问题
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [intentionId, setIntentionId] = useState<string | null>(null);
  
  // Step 3: 生成计划
  const [planId, setPlanId] = useState<string | null>(null);

  const handleStartLearning = async () => {
    if (!topic.trim()) {
      alert('请输入学习主题');
      return;
    }

    setLoading(true);
    try {
      // Step 1: 创建学习意图
      const response = await fetch('/api/intentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, goal, current_level: level })
      });
      
      const data = await response.json();
      if (data.success) {
        setIntentionId(data.data.id);
        // Step 2: 获取澄清问题
        const questionsResponse = await fetch(`/api/intentions/${data.data.id}/questions`);
        const questionsData = await questionsResponse.json();
        
        if (questionsData.success && questionsData.data.questions.length > 0) {
          setQuestions(questionsData.data.questions);
          setStep(2);
        } else {
          // 没有问题，直接生成计划
          await generatePlan(data.data.id);
        }
      } else {
        alert('创建学习意图失败，请重试');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('服务错误，请检查后端是否运行');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerQuestion = async (answer: string) => {
    if (!intentionId || !questions[currentQuestionIndex]) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/intentions/${intentionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questions[currentQuestionIndex].id,
          answer
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAnswers({ ...answers, [questions[currentQuestionIndex].id]: answer });
        
        if (data.data.is_complete) {
          // 所有问题回答完毕，生成计划
          await generatePlan(intentionId);
        } else {
          // 下一题
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intention_id: id })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPlanId(data.data.id);
        setStep(3);
      } else {
        alert(data.error || '生成学习计划失败');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('服务错误，请检查后端是否运行');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-2xl">
        {/* 进度指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {step === 1 && '第 1 步：基础信息'}
              {step === 2 && `第 2 步：澄清问题 (${currentQuestionIndex + 1}/${questions.length})`}
              {step === 3 && '第 3 步：计划生成'}
            </span>
            <span className="text-sm font-medium text-purple-600">{Math.round(step === 2 ? progress : (step - 1) / 2 * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${step === 2 ? progress : (step - 1) / 2 * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step 1: 基础信息输入 */}
        {step === 1 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl mb-4 shadow-lg">
                <span className="text-3xl">🎯</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                开始你的学习之旅
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
              </p>
            </div>

            <div className="space-y-6">
              {/* 学习主题 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <span className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                  你想学习什么？
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="例如：Python编程、数据分析、机器学习、英语口语"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-lg"
                />
              </div>

              {/* 学习目标 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                  你的学习目标是？
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="例如：掌握Python基础语法、能够独立开发项目、通过考试"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-lg"
                />
              </div>

              {/* 当前水平 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">3</span>
                  你的当前水平是？
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
                >
                  <option value="初学者">🌱 初学者 - 完全零基础</option>
                  <option value="入门">🌿 入门 - 了解一些基本概念</option>
                  <option value="初级">🌴 初级 - 有一定基础，想要系统学习</option>
                  <option value="中级">🌲 中级 - 基础扎实，想要深入进阶</option>
                  <option value="高级">🌳 高级 - 想要精通和实战应用</option>
                </select>
              </div>

              {/* 提交按钮 */}
              <button
                onClick={handleStartLearning}
                disabled={loading || !topic.trim()}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all ${
                  loading || !topic.trim()
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    生成个性化问题...
                  </span>
                ) : (
                  '✨ 继续，回答几个问题'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 澄清问题 */}
        {step === 2 && currentQuestion && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-4 shadow-lg">
                <span className="text-2xl">💬</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                了解你更多
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                回答以下问题，帮助AI生成更适合你的学习计划
              </p>
            </div>

            {/* 问题进度 */}
            <div className="flex justify-center gap-2 mb-8">
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index < currentQuestionIndex ? 'bg-green-500' :
                    index === currentQuestionIndex ? 'bg-amber-500 scale-125' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                ></div>
              ))}
            </div>

            {/* 问题卡片 */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 mb-6">
              <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {currentQuestion.question}
              </p>
            </div>

            {/* 回答选项 */}
            <div className="space-y-3">
              {currentQuestion.question_type === 'choice' && currentQuestion.options ? (
                currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerQuestion(option)}
                    disabled={loading}
                    className="w-full p-4 text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
                  >
                    <span className="flex items-center">
                      <span className="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center mr-3 text-sm font-medium group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </span>
                  </button>
                ))
              ) : (
                <div className="relative">
                  <textarea
                    placeholder="在这里输入你的回答..."
                    rows={3}
                    id="text-answer"
                    className="w-full p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                  />
                  <button
                    onClick={() => {
                      const answer = (document.getElementById('text-answer') as HTMLTextAreaElement)?.value;
                      if (answer?.trim()) handleAnswerQuestion(answer);
                    }}
                    disabled={loading}
                    className="mt-3 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all"
                  >
                    确认回答 →
                  </button>
                </div>
              )}
            </div>

            {/* 跳过按钮 */}
            <button
              onClick={() => handleAnswerQuestion('跳过')}
              className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-sm"
            >
              这个问题不太相关，跳过 →
            </button>
          </div>
        )}

        {/* Step 3: 生成完成 */}
        {step === 3 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-6 shadow-lg animate-bounce">
              <span className="text-4xl">🎉</span>
            </div>
            
            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
              学习计划生成成功！
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              AI已经根据你的回答，生成了个性化的学习计划。让我们开始学习吧！
            </p>

            <button
              onClick={() => planId && router.push(`/learning-plan?id=${planId}`)}
              className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              🚀 开始学习
            </button>

            <button
              onClick={() => {
                setStep(1);
                setTopic('');
                setGoal('');
                setLevel('初学者');
                setQuestions([]);
                setAnswers({});
                setIntentionId(null);
                setPlanId(null);
                setCurrentQuestionIndex(0);
              }}
              className="mt-4 w-full py-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              ← 创建新的学习计划
            </button>
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <span>🔒</span>
            你的学习数据安全存储，仅用于生成个性化计划
          </p>
        </div>
      </div>
    </div>
  );
}
