
import React, { useState, useRef, useEffect } from 'react';
import { VideoPost } from '../types';
import { EngagementOverlay } from './EngagementOverlay';
import { CommentSection } from './CommentSection';

interface VideoFeedProps {
  posts: VideoPost[];
  onLike?: () => void;
  onViewProfile: (username: string) => void;
}

export const VideoItem: React.FC<{
  post: VideoPost;
  onLike?: () => void;
  isActive: boolean;
  onViewProfile: (username: string) => void;
}> = ({ post, onLike, isActive, onViewProfile }) => {
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [heartAnims, setHeartAnims] = useState<{ id: number; x: number; y: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<number>(0);

  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.log("Esperando interacción para audio");
        });
      }
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTouch = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      if (tapTimer.current) clearTimeout(tapTimer.current);

      const id = Date.now();
      setHeartAnims(prev => [...prev, { id, x: clientX, y: clientY }]);
      onLike?.();

      setTimeout(() => {
        setHeartAnims(prev => prev.filter(h => h.id !== id));
      }, 1000);
    } else {
      tapTimer.current = setTimeout(() => {
        togglePlay();
      }, DOUBLE_PRESS_DELAY);
    }
    lastTap.current = now;
  };

  return (
    <div
      className="relative w-full h-[100dvh] snap-start bg-black flex items-center justify-center overflow-hidden"
      onClick={handleTouch}
    >
      <video
        ref={videoRef}
        src={post.url}
        loop
        playsInline
        className="h-full w-full object-cover"
      />

      {!isPlaying && isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/20 backdrop-blur-sm p-6 rounded-full animate-in zoom-in duration-200">
            <svg className="w-16 h-16 text-white/80" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {heartAnims.map(h => (
        <div
          key={h.id}
          className="absolute z-50 pointer-events-none animate-heart-burst"
          style={{ left: h.x - 50, top: h.y - 50 }}
        >
          <svg className="w-24 h-24 text-red-500 drop-shadow-2xl" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      ))}

      <EngagementOverlay
        likes={post.likes}
        comments={post.comments.length}
        shares={post.shares}
        saves={post.saves}
        username={post.username}
        userAvatar={post.userAvatar}
        userDisplayName={post.userDisplayName}
        caption={post.caption || ""}
        onShowComments={() => setShowComments(true)}
        onViewProfile={() => onViewProfile(post.username)}
      />

      <CommentSection
        isOpen={showComments}
        comments={post.comments}
        onClose={() => setShowComments(false)}
      />
    </div>
  );
};

export const VideoFeed: React.FC<VideoFeedProps> = ({ posts, onLike, onViewProfile }) => {
  const [activeId, setActiveId] = useState<string | null>(posts[0]?.id || null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = {
      root: containerRef.current,
      threshold: 0.8,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('data-post-id');
          if (id) setActiveId(id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    const currentContainer = containerRef.current;
    if (currentContainer) {
      const children = currentContainer.querySelectorAll('[data-post-id]');
      children.forEach((child) => observer.observe(child));
    }

    return () => {
      if (currentContainer) {
        const children = currentContainer.querySelectorAll('[data-post-id]');
        children.forEach((child) => observer.unobserve(child));
      }
    };
  }, [posts]);

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar bg-zinc-950"
    >
      {posts.length > 0 ? (
        posts.map((post) => (
          <div key={post.id} data-post-id={post.id} className="snap-start">
            <VideoItem
              post={post}
              onLike={onLike}
              isActive={activeId === post.id}
              onViewProfile={onViewProfile}
            />
          </div>
        ))
      ) : (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-32 h-32 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 animate-pulse">
            <svg className="w-16 h-16 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Tu Feed está listo</h2>
            <p className="text-zinc-500 max-w-xs mx-auto leading-relaxed">Publica tu primer video para empezar a recibir buenas vibras.</p>
          </div>
        </div>
      )}
    </div>
  );
};
