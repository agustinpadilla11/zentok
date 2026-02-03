
import React, { useState, useEffect, useCallback } from 'react';
import { VideoPost, Comment, AppNotification, UserProfile } from './types';
import { VideoFeed, VideoItem } from './components/VideoFeed';
import { UploadModal } from './components/UploadModal';
import { NotificationCenter } from './components/NotificationCenter';
import { ProfileView } from './components/ProfileView';
import { Auth } from './components/Auth';
import { generateSupportiveComments, evaluateViralPotential } from './services/geminiService';
import { supabase } from './services/supabase';

interface PostGrowthConfig extends VideoPost {
  targetViews: number;
  targetLikes: number;
  targetShares: number;
  targetSaves: number;
  aiCommentsPool: Comment[];
  growthExponent: number;
  lastCommentIndex: number;
  liveViewers: number;
}

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'view_profile'>('home');
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostGrowthConfig[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const [user, setUser] = useState<UserProfile>({
    username: 'nuevo_usuario',
    displayName: 'Usuario Zen',
    bio: 'Soltando el miedo un video a la vez.',
    avatar: 'https://picsum.photos/seed/user123/200/200',
    followers: 0,
    following: 0,
    totalLikes: 0
  });

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        syncUserProfile(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        syncUserProfile(session.user);
      } else {
        setPosts([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Request Notification Permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const syncUserProfile = (authUser: any) => {
    const meta = authUser.user_metadata || {};
    const emailPrefix = authUser.email ? authUser.email.split('@')[0] : 'usuario';

    setUser({
      username: meta.username || emailPrefix,
      displayName: meta.display_name || meta.username || emailPrefix,
      bio: meta.bio || 'Soltando el miedo un video a la vez.',
      avatar: meta.avatar_url || `https://picsum.photos/seed/${authUser.id}/200/200`,
      followers: 0,
      following: 0,
      totalLikes: 0
    });
  };

  // Fetch posts from Supabase
  useEffect(() => {
    if (!session) return;
    loadPosts();
  }, [session]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      // Fetch videos join profiles
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles(username, avatar_url, display_name, bio)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Map DB data to our App's Growth format
        const formattedPosts: PostGrowthConfig[] = await Promise.all(data.map(async (v: any) => {
          const aiCommentsData = await generateSupportiveComments(v.caption || "un video auténtico");
          const aiCommentsPool = aiCommentsData.map((c, idx) => ({
            id: `c-${v.id}-${idx}`,
            user: c.user || 'usuario_anon',
            avatar: `https://picsum.photos/seed/${v.id}-${idx}/100/100`,
            text: c.text || '¡Muy buen video!',
            likes: Math.floor(Math.random() * 50)
          }));

          // Use real DB counts as base
          const baseViews = v.views_count || 0;
          const baseLikes = v.likes_count || 0;
          const baseShares = v.shares_count || 0;
          const baseSaves = v.saves_count || 0;

          // Parse potential score if exists in caption (hidden tag [VP:xx])
          const vpMatch = v.caption?.match(/\[VP:(\d+)\]/);
          const potentialScore = vpMatch ? parseInt(vpMatch[1]) : 50;

          // Simulation targets based on AI Potential or Random for old videos
          const roll = Math.random();
          let viewsTargetOffset;

          if (potentialScore >= 80 || (roll > 0.98 && !vpMatch)) { // Viral Potential or 2% Lucky
            viewsTargetOffset = Math.floor(Math.random() * 50000) + 20000;
          } else if (potentialScore >= 50 || (roll > 0.8 && !vpMatch)) { // 20% Popular
            viewsTargetOffset = Math.floor(Math.random() * 5000) + 1000;
          } else { // 78% Normal or low potential
            viewsTargetOffset = Math.floor(Math.random() * 300) + 20;
          }

          const viewsTarget = baseViews + viewsTargetOffset;
          const likesTarget = baseLikes + Math.floor(viewsTargetOffset * (Math.random() * 0.15 + 0.05));
          const sharesTarget = baseShares + Math.floor((likesTarget - baseLikes) * (Math.random() * 0.2));
          const savesTarget = baseSaves + Math.floor((likesTarget - baseLikes) * (Math.random() * 0.3));

          const growthExponent = 0.6 + Math.random() * 0.4;
          const timestamp = new Date(v.created_at).getTime();

          const elapsedMs = Date.now() - timestamp;
          const elapsedMins = elapsedMs / (1000 * 60);
          const totalWindowMins = 1440;

          // Progress is 0 if it's very fresh, otherwise proportional to time
          const progress = Math.min(1, Math.pow(Math.max(0, elapsedMins) / totalWindowMins, growthExponent));

          return {
            id: v.id,
            url: v.video_url,
            username: v.profiles?.username || 'usuario',
            userAvatar: v.profiles?.avatar_url || `https://picsum.photos/seed/${v.profiles?.username || v.id}/100/100`,
            userDisplayName: v.profiles?.display_name || v.profiles?.username || 'Usuario Zen',
            caption: v.caption || "",
            views: baseViews + Math.floor(viewsTargetOffset * progress),
            likes: baseLikes + Math.floor((likesTarget - baseLikes) * progress),
            shares: baseShares + Math.floor((sharesTarget - baseShares) * progress),
            saves: baseSaves + Math.floor((savesTarget - baseSaves) * progress),
            comments: aiCommentsPool.slice(0, Math.floor(aiCommentsPool.length * progress)),
            timestamp,
            targetViews: viewsTarget,
            targetLikes: likesTarget,
            targetShares: sharesTarget,
            targetSaves: savesTarget,
            aiCommentsPool,
            growthExponent,
            lastCommentIndex: Math.floor(aiCommentsPool.length * progress),
            liveViewers: elapsedMins < totalWindowMins ? Math.floor(Math.random() * 50) : 0
          };
        }));
        setPosts(formattedPosts);
        checkDailyUploadReminder(formattedPosts);
      }
    } catch (err: any) {
      console.error("Error loading posts:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Growth Simulation Logic
  useEffect(() => {
    if (!session || posts.length === 0) return;

    const growthInterval = setInterval(() => {
      setPosts(currentPosts => {
        const now = Date.now();
        let changed = false;

        const newPosts = currentPosts.map(post => {
          const elapsedMs = now - post.timestamp;
          const elapsedMins = elapsedMs / (1000 * 60);
          const totalWindowMins = 1440;

          if (elapsedMins >= totalWindowMins) {
            // Ensure stats are exactly at target if 24h passed
            if (post.views === post.targetViews && post.lastCommentIndex === post.aiCommentsPool.length) {
              return post;
            }
            changed = true;
            return {
              ...post,
              views: post.targetViews,
              likes: post.targetLikes,
              shares: post.targetShares,
              saves: post.targetSaves,
              comments: post.aiCommentsPool,
              lastCommentIndex: post.aiCommentsPool.length,
              liveViewers: 0
            };
          }

          changed = true;
          let progress = Math.min(1, Math.pow(elapsedMins / totalWindowMins, post.growthExponent));
          const expectedViews = Math.floor(post.targetViews * progress);
          const noise = Math.floor(Math.random() * 3);
          const newViews = Math.max(post.views, Math.min(post.targetViews, expectedViews + noise));
          const interactionProgress = newViews / post.targetViews;

          const newLikes = Math.floor(post.targetLikes * interactionProgress);
          const newShares = Math.floor(post.targetShares * interactionProgress);
          const newSaves = Math.floor(post.targetSaves * interactionProgress);

          let newComments = [...post.comments];
          let newLastIndex = post.lastCommentIndex;

          const commentThreshold = (newLastIndex + 1) / (post.aiCommentsPool.length + 1);
          if (interactionProgress >= commentThreshold && newLastIndex < post.aiCommentsPool.length) {
            const comment = post.aiCommentsPool[newLastIndex];
            newComments = [...newComments, comment];
            newLastIndex++;
            if (post.username === user.username) {
              addNotification(comment.user, 'comment', 'ha comentado tu video');
            }
          }

          return {
            ...post,
            views: newViews,
            likes: newLikes,
            shares: newShares,
            saves: newSaves,
            comments: newComments,
            lastCommentIndex: newLastIndex
          };
        });

        return changed ? newPosts : currentPosts;
      });
    }, 5000);

    return () => clearInterval(growthInterval);
  }, [session, posts.length, user.username]);

  const addNotification = useCallback((user: string, type: 'like' | 'comment' | 'follow', text: string) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      user,
      type,
      text,
      timestamp: Date.now()
    };
    setNotifications(prev => [...prev, newNotif]);
  }, []);

  const checkDailyUploadReminder = useCallback((currentPosts: VideoPost[]) => {
    if (!session?.user) return;

    const today = new Date().setHours(0, 0, 0, 0);
    const hasUploadedToday = currentPosts.some(p => {
      return p.username === user.username && new Date(p.timestamp).setHours(0, 0, 0, 0) === today;
    });

    if (!hasUploadedToday) {
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new window.Notification("¡Hora de ZenTok!", {
          body: "No has subido tu video hoy. ¡Suelta el miedo!",
        });
      }
      // Internal notification
      addNotification('Sistema', 'follow', '¡Aún no has subido tu video diario! Toca el + para compartir hoy.');
    }
  }, [session, user.username, addNotification]);

  const handleUpload = async (videoFile: File, caption: string) => {
    setIsLoading(true);
    setIsUploadOpen(false);

    try {
      console.log("Iniciando subida para usuario:", session.user.id);

      // 1. Garantizar perfil
      const finalUsername = user.username || `user_${session.user.id.substring(0, 5)}`;
      const finalDisplayName = user.displayName || 'Usuario Zen';

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: session.user.id,
        username: finalUsername,
        display_name: finalDisplayName,
        avatar_url: user.avatar,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (profileError) {
        console.error("Error al crear/actualizar perfil:", profileError);
        throw new Error(`Error de perfil: ${profileError.message}`);
      }

      // 2. Subir archivo
      const fileName = `${Date.now()}-${videoFile.name.replace(/\s/g, '_')}`;
      const filePath = `${session.user.id}/${fileName}`;

      console.log("Subiendo archivo a storage:", filePath);
      const { data: storageData, error: storageError } = await supabase.storage
        .from('videos')
        .upload(filePath, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) {
        console.error("Error de Storage:", storageError);
        throw new Error(`Error de Storage: ${storageError.message}`);
      }

      // 3. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      console.log("URL pública generada:", publicUrl);

      // 4. Analizar potencial viral con IA (Silenciosamente)
      console.log("Evaluando potencial viral con IA...");
      const potential = await evaluateViralPotential(videoFile, caption);
      const finalCaption = `${caption} [VP:${potential}]`;

      // 5. Insertar registro de video
      const { error: dbError } = await supabase.from('videos').insert({
        user_id: session.user.id,
        video_url: publicUrl,
        caption: finalCaption,
        created_at: new Date().toISOString()
      });

      if (dbError) {
        console.error("Error al insertar video en DB:", dbError);
        throw new Error(`Error de Base de Datos: ${dbError.message}`);
      }

      // 5. Recargar y notificar
      await loadPosts();
      addNotification('Sistema', 'follow', 'Tu video se ha subido correctamente.');

    } catch (err: any) {
      console.error("Upload error:", err);
      let msg = err.message;
      if (msg.includes("bucket")) {
        msg = "El bucket 'videos' no existe en Supabase Storage. Por favor, créalo y ponlo como público.";
      }
      alert("Error al subir: " + msg);
    } finally {
      setIsLoading(false);
      setActiveTab('profile');
    }
  };

  const handleRemoveVideo = async (videoId: string, videoUrl: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar este video?")) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('videos').delete().eq('id', videoId);
      if (error) throw error;

      await loadPosts();
      addNotification('Sistema', 'follow', 'Video eliminado correctamente.');
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<UserProfile>, pfpFile?: File) => {
    if (!session?.user) return;
    setIsLoading(true);

    try {
      let avatarUrl = updatedData.avatar;

      if (pfpFile) {
        const fileExt = pfpFile.name.split('.').pop();
        const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, pfpFile, { upsert: true });

        if (uploadError) {
          if (uploadError.message.includes('bucket')) {
            throw new Error("El bucket 'avatars' no existe. Créalo en Supabase Storage (Público).");
          }
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          username: user.username, // Requerido para crear el registro si no existe
          display_name: updatedData.displayName || user.displayName,
          bio: updatedData.bio || user.bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      setUser(prev => ({
        ...prev,
        displayName: updatedData.displayName || prev.displayName,
        bio: updatedData.bio || prev.bio,
        avatar: avatarUrl || prev.avatar
      }));

      addNotification('Sistema', 'follow', 'Perfil actualizado correctamente.');
    } catch (err: any) {
      alert("Error al actualizar perfil: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Error al cerrar sesión: " + error.message);
    } else {
      setSession(null);
      setPosts([]);
      setActiveTab('home');
      setSelectedPostIndex(null);
    }
  };

  const handleViewProfile = async (username: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error) throw error;

      if (data) {
        setViewingUser({
          username: data.username,
          displayName: data.display_name || data.username,
          bio: data.bio || '',
          avatar: data.avatar_url || `https://picsum.photos/seed/${data.username}/200/200`,
          followers: data.followers_count || 0,
          following: data.following_count || 0,
          totalLikes: data.total_likes || 0
        });
        setActiveTab('view_profile');
        setSelectedPostIndex(null);
      }
    } catch (err) {
      console.error("Error loading viewing profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const closeSingleView = () => setSelectedPostIndex(null);

  if (!session) {
    return <Auth onLogin={(u) => setSession({ user: u })} />;
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden select-none">
      <NotificationCenter notifications={notifications} />

      {showOnboarding && activeTab === 'home' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-12 text-center animate-fade-in">
          <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl">
            <span className="text-black text-4xl font-black italic">Z</span>
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tighter uppercase">ZenTok</h1>
          <p className="text-zinc-500 mb-12 max-w-xs leading-relaxed font-medium">
            Hola @{user.username}. Tu contenido se distribuirá orgánicamente en un entorno seguro y positivo.
          </p>
          <button
            onClick={() => setShowOnboarding(false)}
            className="w-full max-w-xs py-5 bg-white text-black font-black rounded-2xl hover:scale-105 transition-transform text-lg"
          >
            ENTRAR
          </button>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white font-bold tracking-widest uppercase text-xs">Cargando ZenTok...</p>
        </div>
      )}

      <div className="h-full w-full">
        {selectedPostIndex !== null ? (
          <div className="relative h-full w-full animate-in slide-in-from-right duration-300">
            <VideoItem
              post={posts[selectedPostIndex]}
              isActive={true}
              onLike={() => addNotification('Tú', 'like', '¡Has reaccionado a este video!')}
              onViewProfile={handleViewProfile}
            />
            <button
              onClick={closeSingleView}
              className="absolute top-12 left-6 z-[100] p-2 bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-all border border-white/10"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
          activeTab === 'home' ? (
            <VideoFeed
              posts={posts}
              onLike={() => addNotification('Tú', 'like', '¡Has reaccionado a este video!')}
              onViewProfile={handleViewProfile}
            />
          ) : activeTab === 'profile' ? (
            <ProfileView
              user={user}
              isOwnProfile={true}
              posts={posts.filter(p => {
                return p.username === user.username;
              })}
              onSelectPost={(idx) => {
                const profilePosts = posts.filter(p => p.username === user.username);
                const realIdx = posts.findIndex(p => p.id === profilePosts[idx].id);
                setSelectedPostIndex(realIdx);
              }}
              onUpdateUser={(u, file) => handleUpdateProfile(u, file)}
              onRemoveVideo={handleRemoveVideo}
              onLogout={handleLogout}
            />
          ) : (
            <ProfileView
              user={viewingUser!}
              isOwnProfile={false}
              posts={posts.filter(p => p.username === viewingUser?.username)}
              onSelectPost={(idx) => {
                const profilePosts = posts.filter(p => p.username === viewingUser?.username);
                const realIdx = posts.findIndex(p => p.id === profilePosts[idx].id);
                setSelectedPostIndex(realIdx);
              }}
              onUpdateUser={() => { }}
              onLogout={() => { }}
              onBack={() => setActiveTab('home')}
            />
          )
        )}
      </div>

      {selectedPostIndex === null && (
        <nav className="fixed bottom-0 inset-x-0 h-16 bg-black/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-around z-[80] pb-2">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center space-y-0.5 ${activeTab === 'home' ? 'text-white' : 'text-zinc-600'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
          </button>

          <button onClick={() => setIsUploadOpen(true)} className="relative -top-2 scale-90">
            <div className="bg-white p-1 rounded-2xl shadow-xl">
              <div className="bg-black text-white px-4 py-1.5 rounded-[12px]">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path d="M12 4v16m8-8H4" /></svg>
              </div>
            </div>
          </button>

          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center space-y-0.5 ${activeTab === 'profile' ? 'text-white' : 'text-zinc-600'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Perfil</span>
          </button>
        </nav>
      )}

      {isUploadOpen && <UploadModal onUpload={handleUpload} onClose={() => setIsUploadOpen(false)} />}
    </div>
  );
};

export default App;
