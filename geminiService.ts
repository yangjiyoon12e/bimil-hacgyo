import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Article, SimulationResult, Comment, Reply, ArticleCategory, EmergencyType, DMChat, DMSimulationResult } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to handle 429 errors
async function retryRequest<T>(requestFn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await requestFn();
  } catch (error: any) {
    const errorMessage = typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error);
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    const errorStatus = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;

    if (retries > 0 && (errorStatus === 429 || errorCode === 429 || errorMessage?.includes('429') || errorMessage?.includes('RESOURCE_EXHAUSTED'))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(requestFn, retries - 1, delay * 2);
    }
    // Re-throw the original error, but ensure it has a consistent structure if possible
    throw {
      code: errorCode,
      status: errorStatus,
      message: errorMessage,
      originalError: error
    };
  }
}

// Generate a batch of posts (Feed)
export const generateStudentFeed = async (
  count: number = 4, 
  isSpicy: boolean = false, 
  emergency: EmergencyType = EmergencyType.NONE
): Promise<Article[]> => {
  const modelId = "gemini-3-flash-preview";
  
  const basePrompt = `
    당신은 한국 고등학교(17~19세)의 익명 커뮤니티(대나무숲) 엔진입니다.
    현재 학교에서 일어날 법한 **${count}개의 다양한 익명 게시글**을 생성하세요.
    
    [필수 말투/어조]
    - 100% 리얼한 한국 고등학생 말투 사용 (07년생~09년생).
    - "~~함", "~~임", "~~냐", "ㄹㅇ", "개웃기네", "ㅁㅊ", "솔직히" 등 자연스러운 구어체와 초성 사용.
    - 너무 어른스럽거나 문어체(~~하였습니다) 절대 금지.
    
    [주제 범위]
    - 내신, 모의고사(모고), 수행평가 망함, 야자 도망, 급식 메뉴, 매점 빵.
    - 짝사랑, 전남친/전여친, 고백, 썸.
    - 담임쌤 뒷담, 체육대회, 축제, 친구 관계, 저격.

    [절대 규칙]
    - 대학교 관련 용어(학번, 학과, 동아리 등)는 절대 사용 금지. 오직 고등학생 배경만 생각하세요.
  `;

  let situationPrompt = "";

  // Emergency Scenario Logic
  switch (emergency) {
    case EmergencyType.TEACHER_RAID:
      situationPrompt = `
        [🚨 긴급상황: 교무실의 감시 (학생부 쌤들 떴다)]
        선생님들이 이 커뮤니티 보고 있다는 소문이 돌고 있음.
        - "야 쌤들이 이거 본대?", "망했네 글 지워라", "학주가 IP 딴다는데 ㄹㅇ임?" 같은 쫄린 반응.
        - 일부러 "선생님 사랑해요^^", "저희는 공부를 열심히 합니다" 같은 가식적인 글.
        - 눈치 없이 "근데 오늘 급식 뭐냐?" 하는 글 섞기.
      `;
      break;
    case EmergencyType.POLICE_ALERT:
      situationPrompt = `
        [🚨 긴급상황: 경찰 수사 (학교 뒤집어짐)]
        저번 저격글 때문에 진짜 경찰차 학교에 왔다는 소문.
        - "야 아까 경찰차 본 사람?", "사이버수사대 접수됐대", "고소장 날아오냐?" 같은 불안함.
        - 서로 범인 추측하고 마피아 게임 분위기.
      `;
      break;
    default:
      // Normal Modes
      if (isSpicy) {
        situationPrompt = `
          [분위기: 🔥매운맛/막장 (시험기간 스트레스 폭발)]
          1. 주제: 적나라한 저격(초성), 일진 놀이, 심각한 싸움, 선생님랑 싸운 썰.
          2. 말투: 매우 공격적이고 비꼬는 말투. "꼽냐?", "ㅋㅋ 수준 봐라"
        `;
      } else {
        situationPrompt = `
          [분위기: 평범한 야자시간/쉬는시간]
          1. 주제: "아 배고파", "집 가고 싶다", "오늘 수행평가 답 뭐냐?", "짝남이 스토리 읽음".
          2. 수위: 귀엽고 공감 가는 고딩들의 일상.
        `;
      }
      break;
  }

  const commonRequirements = `
    [데이터 생성 규칙]
    1. **익명성 뒤의 실체**: 데이터에는 반드시 '실제 학생 정보(학년, 반, 이름)'가 포함되어야 합니다. (이름은 한국어 랜덤)
    2. 학년: 1~3, 반: 1~12.
    3. 카테고리: 뒷담화, 고백/짝사랑, 시험/성적, 선생님, 급식/매점, 분실물, 저격/싸움, 비밀 중 선택.
    
    JSON 포맷으로 출력하세요.
  `;

  const prompt = `${basePrompt}\n${situationPrompt}\n${commonRequirements}`;

  try {
    const response = await retryRequest<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              category: { type: Type.STRING },
              displayAuthor: { type: Type.STRING, description: "보통 '익명', 'ㅇㅇ', 또는 닉네임" },
              realName: { type: Type.STRING, description: "실제 작성자 이름" },
              studentGrade: { type: Type.INTEGER },
              studentClass: { type: Type.INTEGER },
              likes: { type: Type.INTEGER, description: "초기 좋아요 수 (0~50)" },
            },
            required: ["title", "content", "category", "displayAuthor", "realName", "studentGrade", "studentClass", "likes"],
          },
        },
      },
    }));

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.map((item: any, index: number) => ({
        ...item,
        id: `post-${Date.now()}-${index}`,
        timestamp: new Date().toISOString(),
        viewCount: Math.floor(Math.random() * 500) + 10,
        isShadowBanned: false
      }));
    }
    return [];
  } catch (e: any) {
    console.error("Feed generation failed", e.message || e);
    throw e; // Re-throw to App.tsx for global error handling
  }
};

// Analyze a specific post and generate comments
export const analyzePost = async (article: Article, isSpicy: boolean = false): Promise<SimulationResult> => {
  const modelId = "gemini-3-flash-preview";
  
  const authorDesc = article.isUserCreated 
    ? "운영자(관리자)가 익명으로 작성함." 
    : `${article.studentGrade}학년 ${article.studentClass}반 ${article.realName}`;

  let instruction = isSpicy 
    ? "학생들은 예민하고 공격적임. 서로 물어뜯거나 비꼼. 욕설 필터링 없이 리얼하게." 
    : "학생들은 장난스럽고 친구 같은 분위기. 'ㅋㅋㅋ' 남발.";

  // Shadow Ban Logic: Force isolation
  if (article.isShadowBanned) {
    instruction = `
      [⛔️ 중요: 쉐도우 밴(Shadow Ban) 적용됨]
      이 게시글은 작성자(${article.realName}, 표시명: ${article.displayAuthor})를 제외한 **그 어떤 다른 학생에게도 절대 보이지 않습니다.**
      
      [필수 행동 수칙]
      1. **다른 학생의 댓글은 0개여야 합니다. 단 1개도 허용하지 않습니다.**
      2. 오직 작성자 본인(${article.displayAuthor})만이 댓글을 1~3개 답니다.
      3. 작성자는 자신의 글에 아무도 댓글을 달지 않는 상황에 대해 혼란스러움, 짜증, 의아함을 표현해야 합니다.
         예: "아니 왜 아무도 안 봄?", "서버 터짐?", "댓글 좀 달아줘..", "??", "내 글만 렉걸림?", "ㅁㅊ 글삭튀 각인가"
      4. 생성되는 모든 댓글의 username은 "${article.displayAuthor}" 여야 하며, realIdentity는 "${article.realName}"이어야 합니다.
    `;
  }

  const prompt = `
    당신은 고등학교 익명 커뮤니티 댓글 시뮬레이터입니다.
    
    [상황/분위기] 
    ${instruction}
    
    [게시글 정보]
    제목: ${article.title}
    내용: ${article.content}
    작성자(실체): ${authorDesc}
    
    [절대 규칙]
    1. 모든 댓글은 위 **게시글의 내용과 100% 일치**해야 합니다. 엉뚱한 소리 금지.
    2. 말투는 07~09년생 고등학생 말투(급식체, 초성) 필수.
    3. isShadowBanned가 true라면, **작성자 외에는 아무도 댓글을 달지 못합니다.** (다른 학생 댓글 0개)
    4. 대학교 관련 용어(학번, 학과 등)는 절대 사용 금지.
    5. 생성되는 댓글의 realIdentity는 원글 작성자의 realName과 일치시키세요.

    JSON 포맷으로 출력하세요.
  `;

  try {
    const response = await retryRequest<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            indices: {
                type: Type.OBJECT,
                properties: {
                    teacherSuspicion: { type: Type.NUMBER },
                    atmosphere: { type: Type.NUMBER },
                    bullyingRisk: { type: Type.NUMBER },
                },
                required: ["teacherSuspicion", "atmosphere", "bullyingRisk"]
            },
            adminTip: { type: Type.STRING },
            comments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  username: { type: Type.STRING },
                  realIdentity: { type: Type.STRING },
                  content: { type: Type.STRING },
                  likes: { type: Type.INTEGER },
                  replies: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                         username: { type: Type.STRING },
                         realIdentity: { type: Type.STRING },
                         content: { type: Type.STRING },
                         likes: { type: Type.INTEGER },
                      },
                      required: ["username", "realIdentity", "content", "likes"]
                    }
                  }
                },
                required: ["username", "realIdentity", "content", "likes", "replies"],
              },
            },
          },
          required: ["comments", "indices", "adminTip"],
        },
      },
    }));

    if (response.text) {
        const parsed = JSON.parse(response.text);
        let comments = parsed.comments.map((c: any, i: number) => ({
            ...c,
            id: `cmt-${Date.now()}-${i}`
        }));

        // Client-side safeguard for shadow-banned posts: ensure only author comments
        if (article.isShadowBanned) {
            comments = comments.filter((c: Comment) => 
                c.realIdentity === article.realName || c.username.includes("운영자") // Admin comments are allowed
            );
            // Ensure any filtered comments from the AI are replaced with the expected "confused author" comments
            if (comments.length === 0) {
              comments.push({
                id: `cmt-${Date.now()}-0`,
                username: article.displayAuthor,
                realIdentity: article.realName,
                content: "아니 왜 아무도 안 보냐 진짜... 내 글만 렉 걸림?",
                likes: 0,
                replies: []
              });
            }
        }
        parsed.comments = comments;
        return parsed as SimulationResult;
    }
    throw new Error("No response");
  } catch (error: any) {
    console.error("Analyze post failed", error.message || error);
    throw error; // Re-throw to App.tsx for global error handling
  }
};

export const generateDMSimulation = async (article: Article): Promise<DMSimulationResult> => {
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    당신은 학생의 개인 톡(카톡, 페메, 인스타DM)을 해킹한 로그를 생성합니다.
    
    [타겟 게시글]
    제목: "${article.title}"
    내용: "${article.content}"
    작성자: ${article.studentGrade}학년 ${article.studentClass}반 ${article.realName}

    [시나리오 (확률 50:50)]
    랜덤하게 아래 두 가지 중 하나를 선택하세요.
    
    Case A (이중인격/가식): 글에서는 착한 척/피해자인 척 하지만, 친구와의 톡에서는 본색을 드러냄. 뒷담화하거나 계획적인 모습.
    Case B (진심/일치): 글 내용이 100% 진심임. 친구에게 고민을 털어놓거나, 너무 힘들다고 하소연함.
    
    [말투]
    - 현실 고등학생 1:1 대화.
    - 욕설, 비속어, "존나", "시발", "개웃겨", "ㅇㅈ", "ㄴㄴ" 등 필터링 없이 리얼하게.
    - 맞춤법 파괴 허용.

    [절대 규칙]
    - 대학교 관련 용어(학번, 학과 등)는 절대 사용 금지.
    - DM 내용은 위 [타겟 게시글]의 내용과 반드시 관련 있어야 합니다.

    [출력 요구사항]
    1. partnerName: 대화 상대 이름.
    2. relationship: 관계 (절친, 전남친, 썸남 등).
    3. isTwoFaced: Case A면 true, Case B면 false.
    4. logs: 대화 내용 (최소 5티키타카).
  `;

  try {
    const response = await retryRequest<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            partnerName: { type: Type.STRING },
            relationship: { type: Type.STRING },
            isTwoFaced: { type: Type.BOOLEAN },
            logs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sender: { type: Type.STRING, enum: ["AUTHOR", "TARGET"] },
                  senderName: { type: Type.STRING },
                  message: { type: Type.STRING },
                  timestamp: { type: Type.STRING, description: "예: '오후 2:31'" },
                },
                required: ["sender", "senderName", "message", "timestamp"]
              }
            }
          },
          required: ["partnerName", "relationship", "isTwoFaced", "logs"]
        },
      },
    }));

    if (response.text) {
      return JSON.parse(response.text) as DMSimulationResult;
    }
    throw new Error("DM Gen Failed");
  } catch (e: any) {
    console.error("DM generation failed", e.message || e);
    throw e; // Re-throw to App.tsx for global error handling
  }
};

// Generate a reply from a specific user when the admin (or someone else) replies to them
export const generateReplyReaction = async (
  article: Article, 
  originalComment: Comment, // This is the comment the admin is replying TO
  adminReply: string,
  isAdminIdRevealed: boolean
): Promise<Reply[]> => {
  const modelId = "gemini-3-flash-preview";

  let specificInstruction = "";
  
  if (article.isShadowBanned) {
    // If originalComment is from the author, then only the author replies.
    // Otherwise, if admin replied to a general comment from a shadow-banned post (which shouldn't happen with strict filtering, but for safety),
    // still assume the interaction is between Admin and the Article Author.
    const reactingUserRealIdentity = originalComment.realIdentity;
    const reactingUserDisplayName = originalComment.username;

    specificInstruction = `
      [⚠️ 특수 상황: 쉐도우 밴 상태]
      게시글 작성자(${article.realName}, 표시명: ${article.displayAuthor})는 자신의 게시글이 쉐도우 밴 상태라서 아무도 못 본다고 생각하고 있었습니다.
      그런데 갑자기 관리자(댓글: "${adminReply}")가 자신이 쓴 댓글("${originalComment.content}")에 대댓글을 달았습니다.
      
      반응 패턴:
      1. **깜짝 놀람/당황**: "어? 내 글 보여요?", "뭐야 알림 떴는데?", "누구세요?"
      2. **의심/질문**: "님 뭐임?", "운영자임?", "왜 님만 보임?", "설마 쌤..?"
      3. 관리자가 신원 공개함: ${isAdminIdRevealed ? '네' : '아니오'}
      
      [필수: 대댓글은 **${article.realName} 본인만** 작성해야 합니다.]
    `;
  } else {
    specificInstruction = `
      [상황]
      '${originalComment.username}'(${originalComment.realIdentity})이 쓴 댓글("${originalComment.content}")에 누군가(관리자, 댓글: "${adminReply}") 답글을 달았습니다.
      이에 대한 자연스러운 대댓글(반응)을 1개 작성하세요.
      글 내용과 이전 대화 맥락을 고려하세요.
      고등학생 말투 필수.
      관리자가 신원 공개함: ${isAdminIdRevealed ? '네' : '아니오'}
    `;
  }

  const prompt = `
    당신은 ${article.isShadowBanned ? `${article.studentGrade}학년 ${article.studentClass}반 ${article.realName}` : originalComment.realIdentity} 입니다.
    
    [게시글] 제목: "${article.title}" / 내용: "${article.content}"
    [내가 쓴 댓글] "${originalComment.content}"
    [상대방(관리자)의 답글] "${adminReply}"
    
    ${specificInstruction}

    [절대 규칙]
    1. 대댓글은 위 **게시글과 이전 대화 맥락에 100% 일치**해야 합니다. 엉뚱한 소리 금지.
    2. 말투는 07~09년생 고등학생 말투(급식체, 초성) 필수.
    3. isShadowBanned가 true일 경우, 생성되는 대댓글의 username은 "${article.displayAuthor}" 여야 하며, realIdentity는 "${article.realName}"이어야 합니다.
    4. 대학교 관련 용어(학번, 학과 등)는 절대 사용 금지.

    JSON 포맷으로 1개의 대댓글 객체를 반환하세요.
  `;

  try {
    const response = await retryRequest<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
               username: { type: Type.STRING, description: "원래 댓글 작성자의 닉네임" },
               realIdentity: { type: Type.STRING },
               content: { type: Type.STRING },
               likes: { type: Type.INTEGER },
            },
            required: ["username", "realIdentity", "content", "likes"]
          }
        },
      },
    }));

    if (response.text) {
        // Ensure the returned reply adheres to shadow ban rules (username/realIdentity)
        let replies = JSON.parse(response.text) as Reply[];
        if (article.isShadowBanned && replies.length > 0) {
          replies[0].username = article.displayAuthor;
          replies[0].realIdentity = article.realName;
        }
        return replies;
    }
    return [];
  } catch (e: any) {
      console.error("Reply reaction failed", e.message || e);
      throw e; // Re-throw to App.tsx for global error handling
  }
};

// Generate reactions when a NEW comment is posted by the Admin
export const generateReactionToNewComment = async (
  article: Article, 
  newComment: Comment, // This is the new top-level comment posted by admin
  isAdminIdRevealed: boolean
): Promise<Reply[]> => {
  const modelId = "gemini-3-flash-preview";
  
  let instruction = "";
  if (article.isShadowBanned) {
      instruction = `
        [상황: 쉐도우 밴]
        게시글 작성자(${article.realName}, 표시명: ${article.displayAuthor})는 아무도 댓글을 안 달아서 우울해하고 있었습니다.
        그런데 갑자기 관리자(댓글: "${newComment.content}")가 자신의 게시글에 새로운 댓글을 달았습니다.
        
        작성자의 반응을 생성하세요.
        "헐 드디어 사람 옴", "와 깜짝아", "님 제 글 보임??" 같은 반응.
        **오직 작성자 본인(${article.realName})만 반응해야 합니다.**
        관리자가 신원 공개함: ${isAdminIdRevealed ? '네' : '아니오'}
      `;
  } else {
      instruction = `
        [상황: 일반]
        게시글에 새로운 댓글(내용: "${newComment.content}", 작성자: ${newComment.username})이 달렸습니다.
        이에 대한 다른 학생들(랜덤 익명)의 대댓글 반응 1~2개를 생성하세요.
        게시글 내용과 새 댓글 내용에 맞춰 티키타카 하세요.
        관리자가 신원 공개함: ${isAdminIdRevealed ? '네' : '아니오'}
      `;
  }

  const prompt = `
    당신은 고등학생 커뮤니티 사용자(쉐도우 밴일 경우: ${article.realName}) 입니다.
    
    [게시글] 제목: "${article.title}" / 내용: "${article.content}"
    [새로 달린 댓글] "${newComment.content}" (작성자: ${newComment.username})
    
    ${instruction}
    
    [절대 규칙]
    1. 대댓글은 위 **게시글과 새 댓글 내용에 100% 일치**해야 합니다. 엉뚱한 소리 금지.
    2. 말투는 07~09년생 고등학생 말투(급식체, 초성) 필수.
    3. isShadowBanned가 true일 경우, 생성되는 대댓글의 username은 "${article.displayAuthor}" 여야 하며, realIdentity는 "${article.realName}"이어야 합니다.
    4. 대학교 관련 용어(학번, 학과 등)는 절대 사용 금지.

    JSON 포맷으로 대댓글 배열을 반환하세요.
  `;

  try {
    const response = await retryRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                 username: { type: Type.STRING },
                 realIdentity: { type: Type.STRING },
                 content: { type: Type.STRING },
                 likes: { type: Type.INTEGER },
              },
              required: ["username", "realIdentity", "content", "likes"]
            }
          },
        },
      }));
  
      if (response.text) {
          let replies = JSON.parse(response.text) as Reply[];
          // Client-side safeguard for shadow-banned posts: ensure only author replies
          if (article.isShadowBanned) {
            replies = replies.filter(r => 
              r.realIdentity === article.realName || r.username.includes("운영자") // Admin replies are allowed.
            );
            if (replies.length > 0) {
              // Ensure the first reply from author matches identity
              replies[0].username = article.displayAuthor;
              replies[0].realIdentity = article.realName;
            }
          }
          return replies;
      }
      return [];
  } catch (e: any) {
    console.error("New comment reaction failed", e.message || e);
    throw e; // Re-throw to App.tsx for global error handling
  }
};
