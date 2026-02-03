
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

            {isOwnProfile && (
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
            )}
          </div>
        )}
      </div>

      {isOwnProfile && (
        <div className="px-8 mt-2 mb-10 flex justify-center">
          <div className="w-full max-w-xs bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[3rem] p-6 text-center shadow-2xl">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${isInstagramUnlocked ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Zen Guard Status</span>
            </div>

            <h3 className="text-xl font-black uppercase mb-3 tracking-tighter italic">Instagram Gateway</h3>

            {!isInstagramUnlocked ? (
              <div className="space-y-4">
                <p className="text-zinc-500 text-[11px] font-medium leading-loose">
                  BLOQUEADO. Debes subir un video hoy para poder usar Instagram las próximas 24 horas.
                </p>
                <div className="relative group grayscale">
                  <div className="absolute inset-0 bg-red-500/10 blur-xl opacity-50" />
                  <button
                    disabled
                    className="relative w-full py-4 bg-zinc-800/80 text-zinc-600 rounded-2xl font-black text-xs uppercase flex items-center justify-center space-x-3 border border-white/5 cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Puerta Cerrada</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-green-400 text-[11px] font-black uppercase italic animate-bounce">
                  ¡ACCESO DESBLOQUEADO!
                </p>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] opacity-30 blur-2xl group-hover:opacity-60 transition-all rounded-full" />
                  <button className="relative w-full py-5 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white rounded-2xl font-black text-sm uppercase flex items-center justify-center space-x-3 shadow-[0_15px_30px_rgba(188,24,136,0.3)] active:scale-95 transition-all">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069v.001zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    <span>Abrir Instagram</span>
                  </button>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

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
