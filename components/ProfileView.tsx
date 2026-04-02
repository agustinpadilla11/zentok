
import React, { useState, useRef } from 'react';
import { UserProfile, VideoPost } from '../types';

interface ProfileViewProps {
  user: UserProfile;
  posts: VideoPost[];
  isOwnProfile: boolean;
  onSelectPost: (index: number) => void;
  onUpdateUser: (updatedUser: Partial<UserProfile>, pfpFile?: File) => void | Promise<void>;
  onRemoveVideo?: (videoId: string, videoUrl: string) => void | Promise<void>;
  onLogout: () => void;
  onBack?: () => void;
  isInstagramUnlocked?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  posts,
  isOwnProfile,
  onSelectPost,
  onUpdateUser,
  onRemoveVideo,
  onLogout,
  onBack,
  isInstagramUnlocked = false
}) => {
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
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-12 left-6 z-[100] p-2 bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-all border border-white/10"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div className="pt-16 pb-10 px-8 flex flex-col items-center">
        <div
          className={`relative mb-6 group ${isOwnProfile ? 'cursor-pointer' : ''}`}
          onClick={() => isOwnProfile && fileInputRef.current?.click()}
        >
          <div className="w-32 h-32 rounded-full border-4 border-zinc-900 overflow-hidden relative shadow-2xl transition-all group-hover:border-white/20">
            <img src={user.avatar} className="w-full h-full object-cover" alt="pfp" />
            
            {isOwnProfile && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            )}
          </div>
          
          {isOwnProfile && (
            <div className="absolute -bottom-1 -right-1 bg-white text-black p-2 rounded-full shadow-lg border-2 border-black active:scale-90 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          )}

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
          <div className="w-full max-w-xs space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Nombre para mostrar</label>
              <input 
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center font-bold text-white focus:ring-2 focus:ring-white/10 transition-all outline-none" 
                placeholder="Tu nombre"
                value={tempUser.displayName} 
                onChange={e => setTempUser({ ...tempUser, displayName: e.target.value })} 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Descripción (Bio)</label>
              <textarea 
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center text-sm h-32 resize-none text-white focus:ring-2 focus:ring-white/10 transition-all outline-none leading-relaxed" 
                placeholder="Cuenta algo sobre ti..."
                value={tempUser.bio} 
                onChange={e => setTempUser({ ...tempUser, bio: e.target.value })} 
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setIsEditing(false)} 
                className="flex-1 py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all border border-white/5"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                className="flex-[2] py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center flex flex-col items-center animate-in fade-in duration-300">
            <h2 className="text-3xl font-black mb-1.5 tracking-tight">{user.displayName}</h2>
            <p className="text-zinc-500 text-sm mb-4 font-bold tracking-tight">@{user.username}</p>
            <p className="text-zinc-300 text-base max-w-[300px] mb-8 leading-relaxed font-medium">
              {user.bio || "Sin descripción todavía."}
            </p>

            {isOwnProfile && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-10 py-3.5 bg-zinc-900 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] border border-white/10 hover:bg-zinc-800 active:scale-95 transition-all"
                >
                  Editar Perfil
                </button>
                <button
                  onClick={onLogout}
                  className="p-3.5 bg-red-500/10 text-red-500 rounded-2xl text-[11px] font-black uppercase border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>



      <div className="grid grid-cols-3 gap-0.5 px-0.5">
        {posts.length > 0 ? (
          posts.map((post, idx) => (
            <div key={post.id} className="aspect-[3/4] bg-zinc-900 relative group cursor-pointer overflow-hidden">
              <div onClick={() => onSelectPost(idx)} className="absolute inset-0 z-0">
                <video src={post.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" muted />
              </div>
              <div className="absolute bottom-2 left-2 flex items-center space-x-1 text-white text-[10px] font-black bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm z-10 pointer-events-none">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                <span>{formatViews(post.views, post.timestamp)}</span>
              </div>
              {isOwnProfile && onRemoveVideo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveVideo(post.id, post.url);
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all z-20 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
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
