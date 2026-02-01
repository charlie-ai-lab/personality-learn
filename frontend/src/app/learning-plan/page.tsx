'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
}

export default function LearningPlan() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('id');

  const [plan, setPlan] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progressList, setProgressList] = useState<LearningProgress[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      loadPlan();
    }
  }, [planId]);

  const loadPlan = async () => {
    if (!planId) return;
    
    try {
      setIsLoading(true);
      const planRes = await fetch(`/api/plans/${planId}`);
      const planData = await planRes.json();
      
      if (planData.success) {
        setPlan(planData.data);
        setChapters(planData.data.chapters || []);
      }
    } catch (error) {
      console.error('加载学习计划失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startLearning = async (chapterId: string) => {
    try {
      await fetch(`/api/progress/start/${chapterId}`, { method: 'POST' });
      loadPlan();
    } catch (error) {
      console.error('开始学习失败:', error);
    }
  };

  const completeChapter = async (chapterId: string) => {
    try {
      await fetch(`/api/progress/complete/${chapterId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfAssessment: '已掌握' })
      });
      loadPlan();
    } catch (error) {
      console.error('完成章节失败:', error);
    }
  };

  const loadChapterContent = async (chapterId: string) => {
    try {
      setIsLoading(true);
      setSelectedChapter(chapterId);
      const res = await fetch(`/api/chapters/${chapterId}/content`);
      const data = await res.json();
      setChapterContent(data.data.content);
    } catch (error) {
      console.error('加载章节内容失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgress = (chapterId: string) => {
    return progressList.find(p => p.chapter_id === chapterId);
  };

  const calculateProgress = () => {
    if (chapters.length === 0) return 0;
    const completed = chapters.filter(c => getProgress(c.id)?.status === 'completed').length;
    return Math.round((completed / chapters.length) * 100);
  };

  if (isLoading && !plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-200 rounded-full animate-spin border-t-purple-500 mx-auto mb-4"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="text-2xl">📚</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">加载学习计划中...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">未找到学习计划</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">请先创建一个学习计划</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-xl"
          >
            创建学习计划
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900/10 dark:to-indigo-900/10">
      {/* 顶部导航 */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-white/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <span className="text-xl">←</span>
              <span>返回</span>
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              📚 {plan.course_title}
            </h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 进度卡片 */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl p-6 mb-8 border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">学习进度</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {chapters.filter(c => getProgress(c.id)?.status === 'completed').length} / {chapters.length} 章节已完成
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {calculateProgress()}%
              </span>
            </div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
        </div>

        {/* 章节列表 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
            <span className="text-2xl">📖</span>
            学习章节
          </h2>
          
          {chapters.map((chapter, index) => {
            const progress = getProgress(chapter.id);
            const status = progress?.status || 'not_started';
            
            return (
              <div
                key={chapter.id}
                onClick={() => loadChapterContent(chapter.id)}
                className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] cursor-pointer ${
                  status === 'in_progress' ? 'ring-2 ring-purple-400 border-purple-400' : 'border-white/50'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* 章节序号 */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                      status === 'completed' 
                        ? 'bg-green-500 text-white' 
                        : status === 'in_progress'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {status === 'completed' ? '✓' : index + 1}
                    </div>
                    
                    {/* 章节内容 */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                        {chapter.title}
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                        {chapter.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                          🎯 {chapter.learning_goal}
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full">
                          ⏱️ {chapter.estimated_duration}分钟
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full">
                          📖 {chapter.learning_method}
                        </span>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex-shrink-0">
                      {status === 'not_started' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startLearning(chapter.id);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-lg hover:shadow-lg transition-all"
                        >
                          开始学习
                        </button>
                      )}
                      {status === 'in_progress' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            completeChapter(chapter.id);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:shadow-lg transition-all"
                        >
                          完成学习
                        </button>
                      )}
                      {status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium rounded-lg">
                          ✓ 已完成
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 章节内容模态框 */}
        {selectedChapter && chapterContent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
              {/* 模态框头部 */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {chapters.find(c => c.id === selectedChapter)?.title}
                </h2>
                <button
                  onClick={() => {
                    setSelectedChapter(null);
                    setChapterContent('');
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* 模态框内容 */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                    {chapterContent}
                  </div>
                </div>
              </div>
              
              {/* 模态框底部 */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => setSelectedChapter(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    const chapterId = selectedChapter;
                    completeChapter(chapterId);
                    setSelectedChapter(null);
                    setChapterContent('');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  ✓ 我已学会
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
