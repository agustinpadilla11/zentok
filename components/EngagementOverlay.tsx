
import React from 'react';
import { HeartIcon, CommentIcon, ShareIcon, BookmarkIcon } from './Icons';

interface EngagementOverlayProps {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  username: string;
  userAvatar?: string;
  userDisplayName?: string;
  caption: string;
  onShowComments: () => void;
  onViewProfile: () => void;
}

export const EngagementOverlay: React.FC<EngagementOverlayProps> = ({
  likes,
  comments,
  shares,
  saves,
  username,
  userAvatar,
  userDisplayName,
  caption,
  onShowComments,
  onViewProfile
}) => {
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none">
      <div className="flex justify-between items-end">
        <div className="mb-8 pointer-events-auto max-w-[75%]">
          <div
            className="flex items-center space-x-3 mb-2 cursor-pointer group/user bg-black/10 backdrop-blur-sm p-1 pr-4 rounded-full w-fit border border-white/5 active:scale-95 transition-all"
            onClick={onViewProfile}
          >
            <div className="w-11 h-11 rounded-full border-2 border-white/40 overflow-hidden shadow-xl">
              <img src={userAvatar || `https://picsum.photos/seed/${username}/100/100`} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm text-white drop-shadow-lg">{userDisplayName || username}</span>
              <span className="text-[10px] font-bold text-white/70">@{username}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-7 pointer-events-auto pb-4">
          <div className="flex flex-col items-center group cursor-pointer">
            <div className="p-2.5 bg-black/20 backdrop-blur-md rounded-full group-active:scale-150 transition-all duration-300">
              <HeartIcon className="w-8 h-8 text-white group-active:text-red-500" />
            </div>
            <span className="text-[11px] font-black mt-1 drop-shadow-md">{likes >= 1000 ? (likes / 1000).toFixed(1) + 'k' : likes}</span>
          </div>

          <div className="flex flex-col items-center group cursor-pointer" onClick={onShowComments}>
            <div className="p-2.5 bg-black/20 backdrop-blur-md rounded-full">
              <CommentIcon className="w-8 h-8 text-white" />
            </div>
            <span className="text-[11px] font-black mt-1 drop-shadow-md">{comments >= 1000 ? (comments / 1000).toFixed(1) + 'k' : comments}</span>
          </div>

          <div className="flex flex-col items-center group cursor-pointer">
            <div className="p-2.5 bg-black/20 backdrop-blur-md rounded-full">
              <BookmarkIcon className="w-8 h-8 text-white" />
            </div>
            <span className="text-[11px] font-black mt-1 drop-shadow-md">{saves >= 1000 ? (saves / 1000).toFixed(1) + 'k' : saves}</span>
          </div>

          <div className="flex flex-col items-center group cursor-pointer">
            <div className="p-2.5 bg-black/20 backdrop-blur-md rounded-full">
              <ShareIcon className="w-8 h-8 text-white" />
            </div>
            <span className="text-[11px] font-black mt-1 drop-shadow-md">{shares >= 1000 ? (shares / 1000).toFixed(1) + 'k' : shares}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
