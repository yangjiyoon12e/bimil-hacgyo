import React, { useState, useEffect } from 'react';
import { Article, ArticleCategory, EmergencyType } from '../types';

interface CommunityFeedProps {
  articles: Article[];
  loading: boolean;
  isSpicyMode: boolean;
  currentEmergency: EmergencyType; // New Prop
  onSelectArticle: (article: Article) => void;
  onLoadMore: () => void;
  onCreatePost: (article: Omit<Article, 'id' | 'timestamp' | 'likes' | 'viewCount'>) => void;
  isWriteModalOpen: boolean;
  onOpenWriteModal: () => void;
  onCloseWriteModal: () => void;
  initialPostData?: { title: string; content: string; category: ArticleCategory };
}

const CommunityFeed: React.FC<CommunityFeedProps> = ({ 
  articles, 
  loading, 
  isSpicyMode,
  currentEmergency,
  onSelectArticle, 
  onLoadMore,
  onCreatePost,
  isWriteModalOpen,
  onOpenWriteModal,
  onCloseWriteModal,
  initialPostData
}) => {
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: ArticleCategory.GOSSIP,
    displayAuthor: '익명'
  });

  useEffect(() => {
    if (articles.length === 0 && !loading) {
      onLoadMore();
    }
  }, []);

  useEffect(() => {
      if (isWriteModalOpen) {
          if (initialPostData) {
              setNewPost(prev => ({
                  ...prev,
                  title: initialPostData.title,
                  content: initialPostData.content,
                  category: initialPostData.category
              }));
          } else {
              setNewPost({
                title: '',
                content: '',
                category: ArticleCategory.GOSSIP,
                displayAuthor: '익명'
              });
          }
      }
  }, [isWriteModalOpen, initialPostData]);

  const getCategoryColor = (cat: ArticleCategory) => {
      switch(cat) {
          case ArticleCategory.GOSSIP: return 'bg-purple-900 text-purple-200 border-purple-700';
          case ArticleCategory.FIGHT: return 'bg-red-900 text-red-200 border-red-700';
          case ArticleCategory.SECRET: return 'bg-slate-700 text-slate-200 border-slate-500';
          case ArticleCategory.CONFESSION: return 'bg-pink-900 text-pink-200 border-pink-700';
          case ArticleCategory.TEACHERS: return 'bg-amber-900 text-amber-200 border-amber-700';
          default: return 'bg-slate-800 text-slate-300 border-slate-700';
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newPost.title || !newPost.content) return;
      
      onCreatePost({
          title: newPost.title,
          content: newPost.content,
          category: newPost.category,
          displayAuthor: newPost.displayAuthor,
          realName: '관리자(본인)',
          studentGrade: 0,
          studentClass: 0,
          isUserCreated: true
      });
      
      onCloseWriteModal();
  };

  return (
    <div className="max-w-2xl mx-auto relative">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className={`text-2xl font-bold tracking-wider flex items-center gap-2 ${isSpicyMode ? 'text-red-100' : 'text-white'}`}>
                <span className={`w-3 h-3 rounded-full animate-pulse ${isSpicyMode ? 'bg-red-500' : 'bg-green-500'}`}></span>
                실시간 타임라인
            </h2>
            <p className={`text-sm mt-1 ${isSpicyMode ? 'text-red-400/70' : 'text-slate-400'}`}>
                {loading ? '데이터 수신 중...' : `감지된 게시글: ${articles.length}건`}
            </p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={onOpenWriteModal}
                className={`px-4 py-2 rounded-lg font-mono font-bold text-sm text-white transition-all shadow-lg flex items-center gap-2 ${isSpicyMode ? 'bg-red-700 hover:bg-red-600 hover:shadow-red-500/30' : 'bg-green-600 hover:bg-green-500 hover:shadow-green-500/30'}`}
            >
                <span>✎</span> 글쓰기
            </button>
            <button 
                onClick={onLoadMore}
                disabled={loading}
                className={`
                    px-4 py-2 rounded-lg font-mono font-bold text-sm transition-all border
                    ${loading 
                        ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-wait' 
                        : (isSpicyMode 
                             ? 'bg-red-950/50 text-red-200 border-red-800 hover:bg-red-900/80' 
                             : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700')
                    }
                `}
            >
                {loading ? '...' : '더보기 ↻'}
            </button>
        </div>
      </div>

      <div className="space-y-4 pb-20">
          {articles.map((article) => (
              <div 
                key={article.id}
                onClick={() => onSelectArticle(article)}
                className={`
                    group relative backdrop-blur-sm p-5 rounded-xl border transition-all cursor-pointer shadow-lg overflow-hidden
                    ${article.isShadowBanned ? 'opacity-50 grayscale' : ''}
                    ${article.isUserCreated 
                        ? (isSpicyMode ? 'bg-red-950/40 border-red-500/50 hover:border-red-400' : 'bg-slate-800/90 border-green-600/50 hover:border-green-400')
                        : (isSpicyMode 
                            ? 'bg-[#2a0a0a]/80 border-red-900/50 hover:border-red-500/50 hover:bg-[#3a0f0f]' 
                            : 'bg-slate-800/80 border-slate-700 hover:border-green-500/50 hover:bg-slate-800')
                    }
                `}
              >
                  {/* Shadow Ban Indicator */}
                  {article.isShadowBanned && (
                      <div className="absolute top-2 right-2 z-10 text-xs font-bold bg-black text-slate-400 px-2 py-1 rounded border border-slate-700">
                          🚫 SHADOW BANNED
                      </div>
                  )}

                  {/* Hover Effect Line */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-200 ${article.isUserCreated ? 'bg-white' : (isSpicyMode ? 'bg-red-500' : 'bg-green-500')}`}></div>

                  <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2 items-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${getCategoryColor(article.category)}`}>
                              {article.category}
                          </span>
                          {article.isUserCreated && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${isSpicyMode ? 'bg-red-900 text-red-200 border-red-700' : 'bg-green-900 text-green-200 border-green-700'}`}>
                                  내가 쓴 글
                              </span>
                          )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                          {new Date(article.timestamp).toLocaleTimeString()}
                      </span>
                  </div>
                  
                  <h3 className={`text-lg font-bold mb-2 transition-colors ${isSpicyMode ? 'text-red-100 group-hover:text-red-400' : 'text-slate-100 group-hover:text-green-400'}`}>
                      {article.title}
                  </h3>
                  <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                      {article.content}
                  </p>

                  <div className={`flex justify-between items-center border-t pt-3 ${isSpicyMode ? 'border-red-900/50' : 'border-slate-700'}`}>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                         <span className="font-bold text-slate-300">{article.displayAuthor}</span>
                         <span>• 조회 {article.viewCount}</span>
                      </div>
                      <div className="text-xs font-mono text-slate-600 group-hover:text-red-400 transition-colors">
                         [ANALYZE]
                      </div>
                  </div>
              </div>
          ))}
          {loading && (
             <div className="text-center py-8">
                 <div className={`inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${isSpicyMode ? 'border-red-500' : 'border-green-500'}`}></div>
             </div>
          )}
      </div>

      {isWriteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className={`border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden ${isSpicyMode ? 'bg-[#1a0505] border-red-900' : 'bg-slate-900 border-slate-600'}`}>
                  <div className={`p-4 border-b flex justify-between items-center ${isSpicyMode ? 'bg-[#2a0a0a] border-red-900' : 'bg-slate-800 border-slate-700'}`}>
                      <h3 className="font-bold text-white flex items-center gap-2">
                          <span className={isSpicyMode ? 'text-red-500' : 'text-green-500'}>✍</span> 게시글 작성
                      </h3>
                      <button onClick={onCloseWriteModal} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs text-slate-400 mb-1">카테고리</label>
                          <select 
                            value={newPost.category}
                            onChange={(e) => setNewPost({...newPost, category: e.target.value as ArticleCategory})}
                            className={`w-full border rounded p-2 text-sm text-white outline-none ${isSpicyMode ? 'bg-[#2a0a0a] border-red-900 focus:border-red-500' : 'bg-slate-800 border-slate-600 focus:border-green-500'}`}
                          >
                              {Object.values(ArticleCategory).map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                              ))}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs text-slate-400 mb-1">제목</label>
                          <input 
                              type="text"
                              value={newPost.title}
                              onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                              className={`w-full border rounded p-2 text-sm text-white outline-none ${isSpicyMode ? 'bg-[#2a0a0a] border-red-900 focus:border-red-500' : 'bg-slate-800 border-slate-600 focus:border-green-500'}`}
                              placeholder="제목을 입력하세요"
                              required
                          />
                      </div>
                      <div>
                          <label className="block text-xs text-slate-400 mb-1">내용</label>
                          <textarea 
                              value={newPost.content}
                              onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                              className={`w-full border rounded p-2 text-sm text-white outline-none h-32 resize-none ${isSpicyMode ? 'bg-[#2a0a0a] border-red-900 focus:border-red-500' : 'bg-slate-800 border-slate-600 focus:border-green-500'}`}
                              placeholder="내용을 입력하세요..."
                              required
                          />
                      </div>
                      <div>
                          <label className="block text-xs text-slate-400 mb-1">표시할 이름 (익명)</label>
                          <input 
                              type="text"
                              value={newPost.displayAuthor}
                              onChange={(e) => setNewPost({...newPost, displayAuthor: e.target.value})}
                              className={`w-full border rounded p-2 text-sm text-white outline-none ${isSpicyMode ? 'bg-[#2a0a0a] border-red-900 focus:border-red-500' : 'bg-slate-800 border-slate-600 focus:border-green-500'}`}
                              placeholder="예: 익명, ㅇㅇ"
                          />
                      </div>
                      <div className="pt-2 flex justify-end gap-2">
                          <button type="button" onClick={onCloseWriteModal} className="px-4 py-2 rounded text-sm text-slate-400 hover:text-white">취소</button>
                          <button type="submit" className={`px-6 py-2 rounded text-white text-sm font-bold shadow-lg ${isSpicyMode ? 'bg-red-700 hover:bg-red-600' : 'bg-green-600 hover:bg-green-500'}`}>등록</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default CommunityFeed;