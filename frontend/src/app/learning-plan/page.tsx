'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Chapter {
  id: string;
  title: string;
  description: string;
  learning_goal: string;
  learning_method: string;
  estimated_duration: number;
}

interface LearningProgress {
  id: string;
  chapter_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

export default function LearningPlan() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progressList, setProgressList] = useState<LearningProgress[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 加载学习计划
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    try {
      setIsLoading(true);
      
      // 加载计划信息
      const planRes = await fetch(`http://localhost:3001/api/plans/${planId}`);
      const planData = await planRes.json();
      setPlan(planData.data);

      // 加载章节
      const chaptersRes = await fetch(`http://localhost:3001/api/progress/plan/${planId}`);
      const chaptersData = await chaptersRes.json();
      setProgressList(chaptersData.data);
      setChapters(planData.data.chapters);
      
      setIsLoading(false);
    } catch (error) {
      console.error('加载学习计划失败:', error);
      setIsLoading(false);
      alert('加载学习计划失败，请检查网络连接');
    }
  };

  const startLearning = async (chapterId: string) => {
    try {
      await fetch(`http://localhost:3001/api/progress/start/${chapterId}`, {
        method: 'POST'
      });
      
      // 刷新进度
      loadPlan();
      alert('开始学习！');
    } catch (error) {
      console.error('开始学习失败:', error);
      alert('开始学习失败，请重试');
    }
  };

  const completeChapter = async (chapterId: string) => {
    try {
      await fetch(`http://localhost:3001/api/progress/complete/${chapterId}`, {
        method: 'POST'
      });
      
      // 刷新进度
      loadPlan();
      alert('章节已完成！');
    } catch (error) {
      console.error('完成章节失败:', error);
      alert('完成章节失败，请重试');
    }
  };

  const loadChapterContent = async (chapterId: string) => {
    try {
      setIsLoading(true);
      setSelectedChapter(chapterId);

      const res = await fetch(`http://localhost:3001/api/chapters/${chapterId}/content`);
      const data = await res.json();
      setChapterContent(data.data.content);
      setIsLoading(false);
    } catch (error) {
      console.error('加载章节内容失败:', error);
      setIsLoading(false);
      alert('加载章节内容失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'not_started':
        return '未开始';
      case 'in_progress':
        return '学习中';
      case 'completed':
        return '已完成';
      default:
        return status;
    }
  };

  const calculateProgress = () => {
    const completed = progressList.filter(p => p.status === 'completed').length;
    return Math.round((completed / chapters.length) * 100);
  };

  if (isLoading && !plan) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 导航栏 */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            📚 {plan?.course_title || '学习计划'}
          </h1>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 进度总览 */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">学习进度</h2>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {calculateProgress()}%
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {progressList.filter(p => p.status === 'completed').length} / {chapters.length} 章节已完成
          </p>
        </div>

        {/* 章节列表 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">学习章节</h2>
          
          {chapters.map((chapter, index) => {
            const progress = progressList.find(p => p.chapter_id === chapter.id);
            return (
              <div
                key={chapter.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg transition-all duration-200 hover:shadow-2xl cursor-pointer ${progress?.status === 'in_progress' ? 'border-2 border-blue-500' : ''}`}
                onClick={() => loadChapterContent(chapter.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl font-bold mr-3">
                        {index + 1}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {chapter.title}
                      </h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      🎯 {chapter.learning_goal}
                    </p>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span className="font-semibold">📖 学习方式：</span> {chapter.learning_method}
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">⏱️ 预计时长：</span> {chapter.estimated_duration}分钟
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {/* 状态标签 */}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(progress?.status || 'not_started')}`}>
                      {getStatusText(progress?.status || 'not_started')}
                    </span>
                    
                    {/* 开始按钮 */}
                    {(!progress || progress.status === 'not_started') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startLearning(chapter.id);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200"
                      >
                        开始学习
                      </button>
                    )}
                    
                    {/* 完成按钮 */}
                    {progress?.status === 'in_progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          completeChapter(chapter.id);
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200"
                      >
                        完成学习
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 章节内容模态框 */}
        {selectedChapter && chapterContent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    章节内容
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedChapter(null);
                      setChapterContent('');
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕ 关闭
                  </button>
                </div>
                
                <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                  <div className="whitespace-pre-wrap">{chapterContent}</div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setSelectedChapter(null);
                      setChapterContent('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    继续学习
                  </button>
                  <button
                    onClick={() => {
                      const chapterId = selectedChapter;
                      completeChapter(chapterId);
                      setSelectedChapter(null);
                      setChapterContent('');
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200"
                  >
                    我已学会
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
