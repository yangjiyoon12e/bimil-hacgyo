export enum ArticleCategory {
  GOSSIP = '뒷담화',
  CONFESSION = '고백/짝사랑',
  ACADEMIC = '시험/성적',
  TEACHERS = '선생님',
  LUNCH = '급식/매점',
  LOST_FOUND = '분실물',
  FIGHT = '저격/싸움',
  SECRET = '비밀'
}

export enum EmergencyType {
  NONE = 'NONE',
  TEACHER_RAID = 'TEACHER_RAID', // 선생님이 감시 중
  POLICE_ALERT = 'POLICE_ALERT' // 경찰 수사 착수
}

export interface Article {
  id: string;
  title: string;
  category: ArticleCategory;
  content: string;
  
  // Display Author (What regular users see)
  displayAuthor: string; 
  
  // Real Identity (Only Admin sees)
  realName: string; 
  studentGrade: number;
  studentClass: number;
  
  timestamp: string;
  
  likes: number;
  viewCount: number;
  
  isUserCreated?: boolean; // Flag to identify user written posts
  isShadowBanned?: boolean; // New: Is this user shadow banned?
}

export interface Reply {
  username: string;
  realIdentity?: string; // New: Real identity of the replier
  content: string;
  likes: number;
  isOp?: boolean; // Is original poster?
}

export interface Comment {
  id: string;
  username: string; // e.g., "익명1", "ㅇㅇ"
  realIdentity: string;
  content: string;
  likes: number;
  replies: Reply[];
}

export interface SimulationResult {
  comments: Comment[];
  indices: {
    teacherSuspicion: number;
    atmosphere: number;
    bullyingRisk: number;
  };
  adminTip: string;
}

export interface DMChat {
  sender: 'AUTHOR' | 'TARGET';
  senderName: string; // "나" or Friend's name
  message: string;
  timestamp: string;
}

export interface DMSimulationResult {
  partnerName: string; // Who they are chatting with
  relationship: string; // e.g. "Best Friend", "Ex-boyfriend"
  isTwoFaced: boolean; // Did they reveal a different side?
  logs: DMChat[];
}