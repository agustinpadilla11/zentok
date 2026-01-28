
import React, { useState, useRef } from 'react';
import { UserProfile, VideoPost } from '../types';

interface ProfileViewProps {
  user: UserProfile;
  posts: VideoPost[];
  onSelectPost: (index: number) => void;
  onUpdateUser: (updatedUser: Partial<UserProfile>, pfpFile?: File) => void | Promise<void>;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, posts, onSelectPost, onUpdateUser, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUser, setTempUser] = useState(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdateUser({ displayName: tempUser.displayName, bio: tempUser.bio });
    setIsEditing(false);
  };

  const formatViews = (views: number, timestamp: number) => {
    const elapsedMins = (Date.now() - timestamp) / (1000 * 60);
    // Si tiene menos de 2 minutos, mostrar "Procesando" o un número muy bajo
    if (elapsedMins < 2 && views < 5) return "0";
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'k';
    return views.toString();
  };

  return (
    <div className="h-full w-full bg-black overflow-y-auto hide-scrollbar pb-32">
      <div className="pt-16 pb-10 px-8 flex flex-col items-center">
        <div className="relative mb-6 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-32 h-32 rounded-full border-4 border-zinc-900 overflow-hidden relative">
            <img src={user.avatar} className="w-full h-full object-cover" alt="pfp" />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                onUpdateUser({ ...user, avatar: URL.createObjectURL(file) }, file);
              }
            }}
          />
        </div>

        {isEditing ? (
          <div className="w-full max-w-xs space-y-4">
            <input className="w-full bg-zinc-900 border-none rounded-xl p-3 text-center font-bold text-white focus:ring-1 focus:ring-white/20 transition-all" value={tempUser.displayName} onChange={e => setTempUser({ ...tempUser, displayName: e.target.value })} />
            <textarea className="w-full bg-zinc-900 border-none rounded-xl p-3 text-center text-sm h-20 resize-none text-white focus:ring-1 focus:ring-white/20 transition-all" value={tempUser.bio} onChange={e => setTempUser({ ...tempUser, bio: e.target.value })} />
            <div className="flex space-x-2">
              <button onClick={handleSave} className="flex-1 py-3 bg-white text-black rounded-xl font-black text-sm uppercase active:scale-95 transition-transform">Listo</button>
            </div>
          </div>
        ) : (
          <div className="text-center flex flex-col items-center">
            <h2 className="text-2xl font-black mb-1">{user.displayName}</h2>
            <p className="text-zinc-500 text-sm mb-2 font-medium italic">@{user.username}</p>
            <p className="text-zinc-300 text-sm max-w-[280px] mb-8 leading-relaxed">
              {user.bio}
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsEditing(true)}
                className="px-8 py-2.5 bg-zinc-900 rounded-full text-xs font-black uppercase tracking-widest border border-white/5 hover:bg-zinc-800 active:scale-95 transition-all"
              >
                Editar Perfil
              </button>
              <button
                onClick={onLogout}
                className="px-8 py-2.5 bg-red-500/10 text-red-500 rounded-full text-xs font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all"
              >
                Salir
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-0.5 px-0.5">
        {posts.length > 0 ? (
          posts.map((post, idx) => (
            <div key={post.id} onClick={() => onSelectPost(idx)} className="aspect-[3/4] bg-zinc-900 relative group cursor-pointer overflow-hidden">
              <video src={post.url} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" muted />
              <div className="absolute bottom-2 left-2 flex items-center space-x-1 text-white text-[10px] font-black bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                <span>{formatViews(post.views, post.timestamp)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-20 text-center">
            <div className="text-zinc-700 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Aún no hay videos</p>
          </div>
        )}
      </div>
    </div>
  );
};
