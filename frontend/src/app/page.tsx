'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('初学者');
  const [preference, setPreference] = useState('理论+实践');
  const [duration, setDuration] = useState(30);

  const handleSubmit = async () => {
    if (!topic.trim()) {
      alert('请输入学习主题');
      return;
    }

    try {
      const response = await fetch('/api/intentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          goal,
          current_level: level,
          learning_preference: preference,
          lesson_duration: duration
        })
      });

      const data = await response.json();
      
      if (data.success && data.data?.id) {
        // 生成学习计划
        await fetch('/api/plans/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intention_id: data.data.id })
        });

        alert('学习计划已生成！');
        router.push(`/learning-plan?id=${data.data.id}`);
      } else {
        alert('创建学习意图失败，请重试');
      }
    } catch (error) {
      console.error('API错误:', error);
      alert('服务错误，请检查后端是否运行');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* 页头 */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              🎓 个性化学习
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              AI驱动的智能学习平台，为每个学习者定制个性化学习路径
            </p>
          </div>

          {/* 学习意图采集表单 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="mr-3">📝</span>
              创建学习计划
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 学习主题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  学习主题 *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="例如：Python编程、数据结构、人工智能"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* 学习目标 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  学习目标
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="例如：掌握Python基础语法、能够独立完成项目"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 当前水平 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  当前水平
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="初学者">初学者</option>
                  <option value="入门">入门</option>
                  <option value="初级">初级</option>
                  <option value="中级">中级</option>
                  <option value="高级">高级</option>
                </select>
              </div>

              {/* 学习方式偏好 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  学习方式偏好
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="preference"
                      value="理论"
                      checked={preference === '理论'}
                      onChange={(e) => setPreference(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">理论</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="preference"
                      value="实践"
                      checked={preference === '实践'}
                      onChange={(e) => setPreference(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">实践</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="preference"
                      value="理论+实践"
                      checked={preference === '理论+实践'}
                      onChange={(e) => setPreference(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">理论+实践</span>
                  </label>
                </div>
              </div>

              {/* 单节课学习时长 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  单节课学习时长（分钟）
                </label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  建议：30-60分钟为佳
                </div>
              </div>

              {/* 提交按钮 */}
              <div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  ✨ 生成个性化学习计划
                </button>
              </div>
            </form>
          </div>

          {/* 功能说明 */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI智能生成</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                根据您的需求，AI自动生成个性化学习计划和内容
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">进度跟踪</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                自动记录学习进度，支持随时中断和继续
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">智能评估</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                章节完成后提供智能评估，检验学习效果
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
