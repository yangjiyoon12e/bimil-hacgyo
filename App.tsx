import React, { useState } from 'react';
import CommunityFeed from './components/ArticleEditor'; 
import PostDetail from './components/SimulationDashboard'; 
import { Article, ArticleCategory, EmergencyType } from './types';
import { generateStudentFeed } from './services/geminiService';

const App: React.FC = () => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSpicyMode, setIsSpicyMode] = useState(false);
  const [currentEmergency, setCurrentEmergency] = useState<EmergencyType>(EmergencyType.NONE);

  // Modal State Lifted from ArticleEditor
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [writeModalInitData, setWriteModalInitData] = useState<{title: string, content: string, category: ArticleCategory} | undefined>(undefined);

  // Initial load or manual refresh
  const handleLoadMore = async () => {
    setLoading(true);
    try {
        const newArticles = await generateStudentFeed(4, isSpicyMode, currentEmergency);
        setArticles(prev => [...prev, ...newArticles]);
    } catch (e) {
        console.error("Failed to fetch feed");
    } finally {
        setLoading(false);
    }
  };

  const handleCreatePost = (postData: Omit<Article, 'id' | 'timestamp' | 'likes' | 'viewCount'>) => {
      const newArticle: Article = {
          ...postData,
          id: `user-post-${Date.now()}`,
          timestamp: new Date().toISOString(),
          likes: 0,
          viewCount: 0,
          studentGrade: 0,
          studentClass: 0,
          realName: '관리자(본인)',
          isUserCreated: true
      };
      setArticles(prev => [newArticle, ...prev]);
  };

  const handleContinue = (article: Article) => {
      setWriteModalInitData({
          title: `[후속] ${article.title}에 관하여`,
          content: '',
          category: ArticleCategory.SECRET
      });
      setSelectedArticle(null); 
      setIsWriteModalOpen(true); 
  };

  const handleOpenWriteModal = () => {
      setWriteModalInitData(undefined); 
      setIsWriteModalOpen(true);
  };

  const getEmergencyColor = () => {
      switch(currentEmergency) {
          case EmergencyType.TEACHER_RAID: return 'border-orange-500 bg-orange-950/30';
          case EmergencyType.POLICE_ALERT: return 'border-blue-500 bg-blue-950/30';
          default: return 'border-slate-800 bg-transparent';
      }
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-green-900 selection:text-green-100 transition-colors duration-500 ${isSpicyMode ? 'bg-[#1a0505] text-red-100' : 'bg-slate-950 text-slate-200'}`}>
      
      {/* Top Bar with Emergency Protocol */}
      <nav className={`border-b backdrop-blur-md sticky top-0 z-50 transition-colors duration-500 ${isSpicyMode ? 'border-red-900 bg-red-950/80' : 'border-slate-800 bg-slate-900/80'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedArticle(null)}>
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-lg shadow-lg transition-colors ${isSpicyMode ? 'bg-red-700 shadow-red-900/50' : 'bg-green-700 shadow-green-900/50'}`}>
                        B
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white hidden md:block">
                        Bamboo<span className={`transition-colors ${isSpicyMode ? 'text-red-500' : 'text-green-500'}`}>Admin</span>
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Emergency Controls */}
                    <div className="flex bg-black/30 rounded-lg p-1 gap-1 border border-slate-700">
                        <button 
                            onClick={() => setCurrentEmergency(EmergencyType.NONE)}
                            className={`px-3 py-1 text-xs font-bold rounded transition-all ${currentEmergency === EmergencyType.NONE ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            NORMAL
                        </button>
                        <button 
                            onClick={() => setCurrentEmergency(EmergencyType.TEACHER_RAID)}
                            className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 ${currentEmergency === EmergencyType.TEACHER_RAID ? 'bg-orange-700 text-white animate-pulse' : 'text-slate-500 hover:text-orange-400'}`}
                        >
                            <span className="md:hidden">👮</span>
                            <span className="hidden md:inline">교무실습격</span>
                        </button>
                        <button 
                            onClick={() => setCurrentEmergency(EmergencyType.POLICE_ALERT)}
                            className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 ${currentEmergency === EmergencyType.POLICE_ALERT ? 'bg-blue-700 text-white animate-pulse' : 'text-slate-500 hover:text-blue-400'}`}
                        >
                            <span className="md:hidden">🚨</span>
                            <span className="hidden md:inline">경찰수사</span>
                        </button>
                    </div>

                    {/* Spicy Toggle */}
                    <button 
                        onClick={() => setIsSpicyMode(!isSpicyMode)}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${isSpicyMode ? 'bg-red-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-300 shadow-sm ${isSpicyMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                </div>
            </div>
            
            {/* Emergency Banner */}
            {currentEmergency !== EmergencyType.NONE && (
                <div className={`mt-2 text-center text-xs font-bold py-1 border rounded animate-fade-in ${getEmergencyColor()}`}>
                     ⚠️ PROTOCOL ACTIVATED: {currentEmergency} ⚠️
                </div>
            )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!selectedArticle ? (
          <div className="animate-fade-in">
             <div className="mb-8 text-center">
                 <h1 className={`text-3xl font-bold mb-2 ${isSpicyMode ? 'text-red-500' : 'text-white'}`}>
                     {currentEmergency !== EmergencyType.NONE ? '🚨 비상 사태 발령 중' : (isSpicyMode ? '⚠️ 위험 감지 모드' : '관리자 대시보드')}
                 </h1>
                 <p className={isSpicyMode ? 'text-red-300/70' : 'text-slate-400'}>
                     학교의 여론을 조작하고, 학생들의 비밀을 파헤치십시오.
                 </p>
             </div>
             <CommunityFeed 
                articles={articles}
                loading={loading}
                isSpicyMode={isSpicyMode}
                onLoadMore={handleLoadMore}
                onCreatePost={handleCreatePost}
                onSelectArticle={setSelectedArticle} 
                isWriteModalOpen={isWriteModalOpen}
                onOpenWriteModal={handleOpenWriteModal}
                onCloseWriteModal={() => setIsWriteModalOpen(false)}
                initialPostData={writeModalInitData}
                currentEmergency={currentEmergency}
             />
          </div>
        ) : (
          <PostDetail 
            article={selectedArticle}
            isSpicyMode={isSpicyMode}
            onBack={() => setSelectedArticle(null)} 
            onContinue={handleContinue}
          />
        )}
      </main>
    </div>
  );
};

export default App;