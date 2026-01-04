import React, { useEffect, useState, useRef } from 'react';
import { SimulationResult, Article, Comment, Reply, DMSimulationResult } from '../types';
import { analyzePost, generateReplyReaction, generateReactionToNewComment, generateDMSimulation } from '../services/geminiService';

interface PostDetailProps {
  article: Article;
  isSpicyMode: boolean;
  onBack: () => void;
  onContinue: (article: Article) => void;
}

const PostDetail: React.FC<PostDetailProps> = ({ article, isSpicyMode, onBack, onContinue }) => {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Shadow Ban State
  const [isShadowBanned, setIsShadowBanned] = useState(article.isShadowBanned || false);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);

  // Decryption States
  const [revealed, setRevealed] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptProgress, setDecryptProgress] = useState(0);

  // DM Hack States
  const [dmLogs, setDmLogs] = useState<DMSimulationResult | null>(null);
  const [isHackingDM, setIsHackingDM] = useState(false);
  const [showDMModal, setShowDMModal] = useState(false);

  const [adminMode, setAdminMode] = useState(false); 
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [mainCommentText, setMainCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        // Pass the current shadow ban status to analysis
        const res = await analyzePost({ ...article, isShadowBanned }, isSpicyMode);
        setSimulation(res);
        setLocalComments(res.comments);
        setLoading(false);
    };
    loadData();
  }, [article, isSpicyMode]); // Only on mount or article change. Shadow ban change handled separately.

  // Handle Shadow Ban Toggle
  const toggleShadowBan = async () => {
      const newState = !isShadowBanned;
      setIsShadowBanned(newState);
      setIsReAnalyzing(true);
      // Re-run simulation with new shadow ban state
      const res = await analyzePost({ ...article, isShadowBanned: newState }, isSpicyMode);
      setSimulation(res);
      setLocalComments(res.comments);
      setIsReAnalyzing(false);
  };

  // Handle DM Hacking
  const handleHackDM = async () => {
      setIsHackingDM(true);
      setShowDMModal(true);
      const res = await generateDMSimulation(article);
      setDmLogs(res);
      setIsHackingDM(false);
  };

  useEffect(() => {
      if (localComments.length > 0 && isSubmittingComment) {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [localComments]);

  // ... (Decrypt logic unchanged)
  const handleDecryptClick = () => { setShowWarning(true); };
  const confirmDecrypt = () => {
      setShowWarning(false);
      setIsDecrypting(true);
      setDecryptProgress(0);
      const interval = setInterval(() => {
          setDecryptProgress(prev => {
              const next = prev + Math.random() * 15;
              if (next >= 100) {
                  clearInterval(interval);
                  setIsDecrypting(false);
                  setRevealed(true);
                  return 100;
              }
              return next;
          });
      }, 100);
  };

  const handleReplySubmit = async (commentIndex: number, comment: Comment) => {
      if(!replyText.trim()) return;
      const newReply: Reply = {
          username: adminMode ? "👑운영자" : "익명(나)",
          realIdentity: "관리자(본인)",
          content: replyText,
          likes: 0,
          isOp: false
      };
      const updatedComments = [...localComments];
      updatedComments[commentIndex].replies.push(newReply);
      setLocalComments(updatedComments);
      const currentText = replyText;
      setReplyText("");
      setReplyingTo(null);
      const reactions = await generateReplyReaction(article, comment, currentText, adminMode);
      if(reactions.length > 0) {
          setLocalComments(prev => {
              const next = [...prev];
              next[commentIndex].replies.push(...reactions);
              return next;
          });
      }
  };

  const handleMainCommentSubmit = async () => {
      if(!mainCommentText.trim()) return;
      setIsSubmittingComment(true);
      const newComment: Comment = {
          id: `new-${Date.now()}`,
          username: adminMode ? "👑운영자" : "익명(나)",
          realIdentity: "관리자(본인)",
          content: mainCommentText,
          likes: 0,
          replies: []
      };
      setLocalComments(prev => [...prev, newComment]);
      const currentText = mainCommentText;
      setMainCommentText("");
      const replies = await generateReactionToNewComment(article, newComment, adminMode);
      if (replies.length > 0) {
          setLocalComments(prev => {
              const next = [...prev];
              const target = next.find(c => c.id === newComment.id);
              if (target) { target.replies.push(...replies); }
              return next;
          });
      }
      setIsSubmittingComment(false);
  };

  if (loading) {
      return (
          <div className={`flex flex-col items-center justify-center h-[60vh] space-y-4 ${isSpicyMode ? 'text-red-500' : 'text-green-500'}`}>
              <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin ${isSpicyMode ? 'border-red-500' : 'border-green-500'}`}></div>
              <div className="font-mono animate-pulse">
                  {isSpicyMode ? 'ANALYZING THREAT LEVELS...' : 'DECRYPTING COMMUNITY DATA...'}
              </div>
          </div>
      );
  }

  if (!simulation) return null;

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in relative">
      
      {/* DM Modal */}
      {showDMModal && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#121212] border border-slate-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl h-[600px] flex flex-col">
                {/* Header */}
                <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xl">🕵️‍♂️</div>
                        <div>
                            <h3 className="text-white font-bold">DM 감청: {revealed ? article.realName : article.displayAuthor}</h3>
                            <p className="text-xs text-slate-400">
                                {isHackingDM ? '암호화된 채널 접속 중...' : '연결 성공 (보안 취약점 발견)'}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setShowDMModal(false)} className="text-slate-500 hover:text-white">✕</button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a]">
                    {isHackingDM ? (
                         <div className="flex flex-col items-center justify-center h-full space-y-2">
                             <div className="text-green-500 font-mono text-sm">HACKING PRIVATE KEY...</div>
                             <div className="w-32 h-1 bg-slate-800 rounded overflow-hidden">
                                 <div className="h-full bg-green-500 animate-pulse w-full"></div>
                             </div>
                         </div>
                    ) : dmLogs ? (
                        <>
                            <div className="text-center text-xs text-slate-500 my-4">
                                대화 상대: <span className="text-slate-300 font-bold">{dmLogs.partnerName}</span> ({dmLogs.relationship})
                            </div>
                            
                            {/* Badges for Two-Faced vs Sincere */}
                            {dmLogs.isTwoFaced ? (
                                <div className="mx-auto bg-red-950/40 text-red-400 text-xs px-3 py-1 rounded-full border border-red-900 w-fit mb-4 flex items-center gap-2">
                                    <span>🎭</span> 인격 불일치 감지됨 (이중성 98%)
                                </div>
                            ) : (
                                <div className="mx-auto bg-green-950/40 text-green-400 text-xs px-3 py-1 rounded-full border border-green-900 w-fit mb-4 flex items-center gap-2">
                                    <span>✅</span> 글 내용과 일치함 (진실성 100%)
                                </div>
                            )}

                            {dmLogs.logs.map((log, idx) => {
                                const isMe = log.sender === 'AUTHOR';
                                return (
                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${
                                            isMe 
                                            ? 'bg-blue-600 text-white rounded-br-none' 
                                            : 'bg-slate-800 text-slate-200 rounded-bl-none'
                                        }`}>
                                            <div className="text-[10px] opacity-70 mb-1">{isMe ? '본인' : dmLogs.partnerName}</div>
                                            {log.message}
                                            <div className="text-[9px] text-right mt-1 opacity-50">{log.timestamp}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="text-center text-slate-500">데이터를 불러오지 못했습니다.</div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Decryption & Warning Overlays (Keep existing code) */}
      {showWarning && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-red-950/50 border-2 border-red-600 rounded-lg p-6 max-w-md w-full shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-bounce-in">
                  <h3 className="text-red-500 font-black text-xl mb-4 flex items-center gap-2">⚠️ SYSTEM WARNING</h3>
                  <p className="text-red-200 mb-6 text-sm font-mono leading-relaxed">
                      모든 익명 사용자의 실제 신원(이름, 학번)을 강제로 복호화하시겠습니까?
                  </p>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowWarning(false)} className="px-4 py-2 rounded border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-mono">CANCEL</button>
                      <button onClick={confirmDecrypt} className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-900/50 text-sm font-mono animate-pulse">EXECUTE DECRYPTION</button>
                  </div>
              </div>
          </div>
      )}
      {isDecrypting && (
          <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center font-mono">
              <div className="w-64 mb-4">
                  <div className="flex justify-between text-green-500 text-xs mb-1"><span>BRUTE_FORCING_DB...</span><span>{Math.floor(decryptProgress)}%</span></div>
                  <div className="h-2 bg-slate-900 rounded overflow-hidden border border-green-900"><div className="h-full bg-green-500" style={{ width: `${decryptProgress}%` }}></div></div>
              </div>
          </div>
      )}

      {/* Left Column: Post Content & Admin Panel */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Post Card */}
        <div className={`border transition-colors duration-500 rounded-xl overflow-hidden shadow-2xl relative ${isShadowBanned ? 'opacity-75 grayscale-[50%]' : ''} ${revealed ? 'border-red-500/50 shadow-red-900/20' : (isSpicyMode ? 'bg-[#2a0a0a] border-red-900' : 'bg-slate-800 border-slate-700')}`}>
            {/* Shadow Ban Overlay Text */}
            {isShadowBanned && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-500 to-transparent opacity-50"></div>
            )}

            {/* Header */}
            <div className={`p-4 border-b flex justify-between items-center ${isSpicyMode ? 'bg-red-950/30 border-red-900' : 'bg-slate-900/50 border-slate-700'}`}>
                <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm font-bold transition-colors">
                    ← 목록으로
                </button>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${isSpicyMode ? 'bg-red-900/50 text-red-200' : 'bg-slate-700 text-slate-300'}`}>{article.category}</span>
                    <span className="text-xs text-slate-500 font-mono">{new Date(article.timestamp).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-4 leading-relaxed">{article.title}</h1>
                <div className="text-slate-300 whitespace-pre-wrap leading-relaxed min-h-[100px]">
                    {article.content}
                </div>
            </div>

            {/* Admin Controls Section */}
            <div className={`p-4 border-t flex flex-col gap-4 ${isSpicyMode ? 'bg-[#1a0505] border-red-900' : 'bg-slate-900 border-slate-700'}`}>
                
                {/* Identity Reveal */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 ${revealed ? 'bg-red-600 text-white rotate-[360deg]' : 'bg-slate-700 text-slate-400'}`}>
                            {revealed ? '!' : '?'}
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 font-mono uppercase">Posted By</div>
                            <div className={`font-bold text-lg transition-all ${revealed ? 'text-red-400 hacker-text' : 'text-slate-300'}`}>
                                {revealed ? `${article.studentGrade}학년 ${article.studentClass}반 ${article.realName}` : article.displayAuthor}
                            </div>
                        </div>
                    </div>
                    {!revealed && (
                        <button onClick={handleDecryptClick} className={`px-4 py-2 rounded border shadow-lg font-mono text-xs flex items-center gap-2 transition-all group ${isSpicyMode ? 'bg-red-950 border-red-800 text-red-400 hover:bg-red-900' : 'bg-slate-800 border-red-900/50 text-red-400 hover:bg-slate-700'}`}>
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse group-hover:bg-red-400"></span>
                            신원 확인 (Admin)
                        </button>
                    )}
                </div>

                {/* Dark Tools */}
                <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-800 pt-4">
                    <button 
                        onClick={toggleShadowBan}
                        className={`py-3 px-4 rounded-lg border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            isShadowBanned 
                            ? 'bg-slate-800 border-slate-500 text-slate-400' 
                            : 'bg-black border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                        }`}
                    >
                        {isReAnalyzing ? (
                             <span className="w-4 h-4 border-2 border-t-transparent border-slate-500 rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <span>{isShadowBanned ? '👁️' : '🚫'}</span>
                                {isShadowBanned ? '쉐도우 밴 해제' : '작성자 쉐도우 밴'}
                            </>
                        )}
                    </button>
                    
                    <button 
                        onClick={handleHackDM}
                        className="py-3 px-4 rounded-lg border border-purple-900/50 bg-purple-950/20 text-purple-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-900/40 hover:border-purple-500 transition-all"
                    >
                        <span>🔓</span>
                        DM 감청 (Hack)
                    </button>
                </div>
            </div>
        </div>

        {/* Admin Dashboard / Stats */}
        <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border text-center ${isSpicyMode ? 'bg-[#2a0a0a] border-red-900' : 'bg-slate-800 border-slate-700'}`}>
                <div className="text-xs text-slate-500 mb-1">선생님 의심도</div>
                <div className={`text-2xl font-black ${simulation.indices.teacherSuspicion > 70 ? 'text-red-500' : 'text-green-500'}`}>
                    {simulation.indices.teacherSuspicion}%
                </div>
            </div>
            <div className={`p-4 rounded-lg border text-center ${isSpicyMode ? 'bg-[#2a0a0a] border-red-900' : 'bg-slate-800 border-slate-700'}`}>
                <div className="text-xs text-slate-500 mb-1">교내 분위기</div>
                <div className="text-2xl font-black text-amber-500">{simulation.indices.atmosphere}</div>
            </div>
            <div className={`p-4 rounded-lg border text-center ${isSpicyMode ? 'bg-[#2a0a0a] border-red-900' : 'bg-slate-800 border-slate-700'}`}>
                <div className="text-xs text-slate-500 mb-1">학폭 위험군</div>
                <div className={`text-2xl font-black ${simulation.indices.bullyingRisk > 50 ? 'text-red-600' : 'text-slate-400'}`}>
                    {simulation.indices.bullyingRisk > 50 ? '위험' : '안전'}
                </div>
            </div>
        </div>

        {/* Admin Secret Tip */}
        <div className={`border-l-4 p-4 rounded shadow-lg ${isSpicyMode ? 'bg-[#2a0a0a] border-red-600' : 'bg-slate-900 border-green-600'}`}>
            <h3 className={`font-mono text-xs font-bold mb-1 flex items-center gap-2 ${isSpicyMode ? 'text-red-500' : 'text-green-500'}`}>
                <span className={`w-2 h-2 rounded-full animate-ping ${isSpicyMode ? 'bg-red-500' : 'bg-green-500'}`}></span>
                SYSTEM INTEL
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">"{simulation.adminTip}"</p>
        </div>

        {/* Continue Button */}
        <button
            onClick={() => onContinue(article)}
            className={`w-full py-4 rounded-xl border-2 font-bold text-lg shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 ${
                isSpicyMode 
                ? 'bg-red-950/50 border-red-600 text-red-100 hover:bg-red-900 shadow-red-900/30' 
                : 'bg-green-950/50 border-green-600 text-green-100 hover:bg-green-900 shadow-green-900/30'
            }`}
        >
            <span>📝</span>
            <span>이어하기: 이 사건에 대한 글 작성</span>
        </button>

      </div>

      {/* Right Column: Comments (Using localComments) */}
      <div className={`lg:col-span-1 flex flex-col h-[80vh] rounded-xl border overflow-hidden sticky top-8 ${isSpicyMode ? 'bg-[#1a0505] border-red-900' : 'bg-slate-800 border-slate-700'}`}>
          <div className={`p-4 border-b flex justify-between items-center ${isSpicyMode ? 'bg-[#2a0a0a] border-red-900' : 'bg-slate-900 border-slate-700'}`}>
              <span className="font-bold text-slate-200">실시간 댓글</span>
              <span className={`text-xs px-2 py-0.5 rounded ${isSpicyMode ? 'bg-red-900 text-red-200' : 'bg-slate-700 text-slate-400'}`}>{localComments.length}</span>
          </div>
          
          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* If Shadow Banned, show explicit system message */}
              {isShadowBanned && localComments.length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-sm flex flex-col items-center gap-2">
                      <span className="text-2xl">🚫</span>
                      <p>작성자가 쉐도우 밴 상태입니다.<br/>학생들에게 이 글이 보이지 않습니다.</p>
                  </div>
              )}

              {localComments.map((comment, idx) => (
                  <div key={idx} className={`rounded p-3 border transition-all duration-500 ${revealed ? 'bg-red-950/20 border-red-900/30' : (isSpicyMode ? 'bg-[#2a0a0a] border-red-900/30' : 'bg-slate-700/50 border-slate-600/50')}`}>
                      {/* Comment Header */}
                      <div className="flex justify-between items-start mb-1">
                          {revealed ? (
                             <div className="flex flex-col animate-fade-in">
                                 <span className="font-bold text-sm text-red-400 hacker-text">{comment.realIdentity || '신원미상'}</span>
                                 <span className="text-[10px] text-slate-500 line-through decoration-slate-500">{comment.username}</span>
                             </div>
                          ) : (
                             <span className="font-bold text-sm text-slate-300">{comment.username}</span>
                          )}
                          <span className="text-xs text-slate-500">{comment.likes} 👍</span>
                      </div>
                      <p className="text-sm text-slate-200 mb-2">{comment.content}</p>
                      
                      {/* Nested Replies */}
                      {comment.replies.map((reply, rIdx) => (
                          <div key={rIdx} className={`ml-3 mt-2 pl-3 border-l-2 ${reply.username.includes("운영자") ? (isSpicyMode ? 'border-red-500' : 'border-green-500') : 'border-slate-600'}`}>
                               {revealed ? (
                                    <div className="flex flex-col mb-1 animate-fade-in">
                                        <span className={`text-xs font-bold ${reply.username.includes("운영자") ? (isSpicyMode ? 'text-red-400' : 'text-green-400') : 'text-red-400 hacker-text'}`}>
                                            {reply.username.includes("운영자") ? reply.username : (reply.realIdentity || '신원미상')}
                                        </span>
                                        {!reply.username.includes("운영자") && <span className="text-[9px] text-slate-500 line-through">{reply.username}</span>}
                                    </div>
                                ) : (
                                    <span className={`text-xs font-bold ${reply.username.includes("운영자") ? (isSpicyMode ? 'text-red-400' : 'text-green-400') : 'text-slate-400'}`}>
                                        {reply.username}
                                    </span>
                                )}
                              <p className="text-xs text-slate-300">{reply.content}</p>
                          </div>
                      ))}

                      {/* Reply Form */}
                      {replyingTo === comment.id ? (
                          <div className="mt-3 animate-fade-in">
                              <input 
                                  type="text" 
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className={`w-full border rounded px-2 py-1 text-sm text-white outline-none mb-2 ${isSpicyMode ? 'bg-[#1a0505] border-red-900 focus:border-red-500' : 'bg-slate-900 border-slate-600 focus:border-green-500'}`}
                                  placeholder="내용 입력..."
                                  autoFocus
                                  onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit(idx, comment)}
                              />
                              <div className="flex gap-2">
                                  <button onClick={() => handleReplySubmit(idx, comment)} className={`text-white text-xs px-3 py-1 rounded ${isSpicyMode ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}`}>등록</button>
                                  <button onClick={() => setReplyingTo(null)} className="text-slate-500 text-xs px-2">취소</button>
                              </div>
                          </div>
                      ) : (
                          <button 
                              onClick={() => { setReplyingTo(comment.id); setReplyText(""); }} 
                              className="text-xs text-slate-500 hover:text-slate-300 mt-2 flex items-center gap-1"
                          >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                              답글
                          </button>
                      )}
                  </div>
              ))}
              <div ref={commentsEndRef} />
          </div>

          {/* Main Comment Input */}
          <div className={`p-4 border-t ${isSpicyMode ? 'bg-[#2a0a0a] border-red-900' : 'bg-slate-900 border-slate-700'}`}>
               <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs text-slate-400 flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                        <input type="checkbox" checked={adminMode} onChange={(e) => setAdminMode(e.target.checked)} className={`rounded ${isSpicyMode ? 'bg-[#1a0505] border-red-800' : 'bg-slate-700 border-slate-500'}`} />
                        <span className={adminMode ? (isSpicyMode ? 'text-red-500 font-bold' : 'text-green-500 font-bold') : ''}>
                            {adminMode ? '👑 운영자 모드' : '익명 모드'}
                        </span>
                    </label>
               </div>
               <div className="flex gap-2">
                   <textarea
                       value={mainCommentText}
                       onChange={(e) => setMainCommentText(e.target.value)}
                       onKeyDown={(e) => {
                           if(e.key === 'Enter' && !e.shiftKey) {
                               e.preventDefault();
                               handleMainCommentSubmit();
                           }
                       }}
                       placeholder={adminMode ? "운영자 권한으로 댓글..." : "익명으로 댓글..."}
                       className={`flex-1 border rounded p-2 text-sm text-white outline-none h-10 min-h-[40px] max-h-[100px] resize-y overflow-hidden transition-all focus:h-20 ${isSpicyMode ? 'bg-[#1a0505] border-red-900 focus:border-red-500 placeholder-red-900/50' : 'bg-slate-800 border-slate-600 focus:border-green-500 placeholder-slate-600'}`}
                   />
                   <button 
                       onClick={handleMainCommentSubmit}
                       disabled={isSubmittingComment || !mainCommentText.trim()}
                       className={`px-4 py-2 rounded text-sm font-bold shadow-lg transition-all whitespace-nowrap flex items-center justify-center min-w-[60px]
                           ${isSubmittingComment 
                               ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                               : (isSpicyMode 
                                   ? 'bg-red-700 hover:bg-red-600 text-white shadow-red-900/50' 
                                   : 'bg-green-700 hover:bg-green-600 text-white shadow-green-900/50')
                           }
                       `}
                   >
                       {isSubmittingComment ? (
                           <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"></span>
                       ) : '등록'}
                   </button>
               </div>
          </div>
      </div>
    </div>
  );
};

export default PostDetail;