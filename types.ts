
export interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  likes: number;
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

export interface VideoPost {
  id: string;
  url: string;
  username: string;
  userAvatar?: string;
  userDisplayName?: string;
  views: number;
  likes: number;
  comments: Comment[];
  shares: number;
  saves: number;
  timestamp: number;
  // Added optional caption and overlayText to fix interface mismatch errors
  caption?: string;
  overlayText?: string;
}

export interface VideoAnalysis {
  fillerWords: { word: string; count: number; timestamp: string }[];
  toneOfVoice: string;
  naturalness: string;
  messageClarity: string;
  audienceRetention: string;
  advice: string[];
  score: number;
}