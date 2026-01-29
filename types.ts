
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