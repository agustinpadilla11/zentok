
export interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  likes: number;
}

export interface VideoPost {
  id: string;
  url: string;
  username: string;
  userAvatar: string;
  userDisplayName: string;
  caption: string;
  views: number;
  likes: number;
  shares: number;
  saves: number;
  comments: Comment[];
  timestamp: number;
}

export interface AppNotification {
  id: string;
  user: string;
  type: 'like' | 'comment' | 'follow';
  text: string;
  timestamp: number;
}

export interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number;
  totalLikes: number;
}

export interface VideoAnalysis {
  fillerWords: { word: string; count: number; timestamp?: string }[];
  toneOfVoice: string;
  naturalness: string;
  messageClarity: string;
  audienceRetention: string;
  advice: string[];
  score: number;
}