
import React, { useState, useEffect } from 'react';
import { Comment } from '../types';
import { HeartIcon } from './Icons';

interface CommentSectionProps {
  comments: Comment[];
  isOpen: boolean;
  onClose: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ comments, isOpen, onClose }) => {
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 h-[70%] bg-zinc-900/90 backdrop-blur-2xl rounded-t-[2.5rem] z-50 flex flex-col animate-slide-up shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
      <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-1" />
      
      <div className="flex justify-between items-center p-4 border-b border-white/5">
        <h3 className="font-bold text-sm mx-auto">{comments.length} comentarios amables</h3>
        <button onClick={onClose} className="absolute right-6 text-zinc-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
        {isTyping && (
          <div className="flex items-center space-x-2 text-zinc-500 text-xs px-2 animate-pulse">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
            <span>Alguien está escribiendo algo lindo...</span>
          </div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-3 group transition-all">
            <img 
              src={`https://picsum.photos/seed/${comment.user}/80/80`} 
              className="w-10 h-10 rounded-full object-cover border border-white/10" 
              alt={comment.user} 
            />
            <div className="flex-1">
              <p className="text-[11px] font-bold text-zinc-500 mb-0.5">@{comment.user}</p>
              <p className="text-[13px] leading-relaxed text-zinc-100">{comment.text}</p>
              <div className="flex space-x-4 mt-2 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                <span className="hover:text-zinc-400 cursor-pointer">Ahora</span>
                <span className="hover:text-zinc-400 cursor-pointer">Responder</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-start pt-1">
              <HeartIcon className="w-4 h-4 text-zinc-600 hover:text-red-500 transition-colors cursor-pointer" />
              <span className="text-[10px] text-zinc-600 mt-1">{comment.likes}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-zinc-800/50 border-t border-white/5 flex items-center space-x-4">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center font-bold text-xs uppercase">TÚ</div>
        <div className="flex-1 bg-zinc-700/50 rounded-full px-5 py-3 text-zinc-400 text-xs font-medium border border-white/5">
          Escribe algo positivo para ti...
        </div>
        <div className="flex space-x-3 text-2xl filter grayscale opacity-50">
          <span>❤️</span>
          <span>🔥</span>
        </div>
      </div>
    </div>
  );
};
