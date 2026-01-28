
import React, { useState, useEffect, useCallback } from 'react';
import { VideoPost, Comment, Notification, UserProfile } from './types';
import { VideoFeed, VideoItem } from './components/VideoFeed';
import { UploadModal } from './components/UploadModal';
import { NotificationCenter } from './components/NotificationCenter';
import { ProfileView } from './components/ProfileView';
import { Auth } from './components/Auth';
import { generateSupportiveComments } from './services/geminiService';
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
  const [activeTab, setActiveTab] = useState<'feed' | 'profile'>('feed');
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [posts, setPosts] = useState<PostGrowthConfig[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
        .eq('user_id', session.user.id) // Only see own videos
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

          // Sophisticated stats randomization
          const roll = Math.random();
          let baseViews, viewsTarget, likesTarget;

          if (roll > 0.95) { // 5% Viral
            baseViews = Math.floor(Math.random() * 5000) + 2000;
            viewsTarget = baseViews + Math.floor(Math.random() * 50000) + 10000;
          } else if (roll > 0.7) { // 25% Popular
            baseViews = Math.floor(Math.random() * 500) + 100;
            viewsTarget = baseViews + Math.floor(Math.random() * 2000) + 500;
          } else { // 70% Normal/Low
            baseViews = Math.floor(Math.random() * 50);
            viewsTarget = baseViews + Math.floor(Math.random() * 200) + 10;
          }

          likesTarget = Math.floor(viewsTarget * (Math.random() * 0.15 + 0.05));
          const sharesTarget = Math.floor(likesTarget * (Math.random() * 0.2));
          const savesTarget = Math.floor(likesTarget * (Math.random() * 0.3));

          return {
            id: v.id,
            url: v.video_url,
            username: v.profiles?.username || 'usuario',
            caption: v.caption || "",
            views: baseViews,
            likes: Math.floor(baseViews * 0.1),
            shares: 0,
            saves: 0,
            comments: [],
            timestamp: new Date(v.created_at).getTime(),
            targetViews: viewsTarget,
            targetLikes: likesTarget,
            targetShares: sharesTarget,
            targetSaves: savesTarget,
            aiCommentsPool,
            growthExponent: 0.6 + Math.random() * 0.4,
            lastCommentIndex: 0,
            liveViewers: Math.floor(Math.random() * 50)
          };
        }));
        setPosts(formattedPosts);
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

          if (elapsedMins > totalWindowMins && post.views >= post.targetViews) {
            return post;
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
    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      user,
      type,
      text,
      timestamp: Date.now()
    };
    setNotifications(prev => [...prev, newNotif]);
  }, []);

  const handleUpload = async (videoFile: File) => {
    setIsLoading(true);
    setIsUploadOpen(false);

    try {
      const fileName = `${Date.now()}-${videoFile.name}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('videos')
        .upload(`${session.user.id}/${fileName}`, videoFile);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(`${session.user.id}/${fileName}`);

      const { data: vData, error: dbError } = await supabase.from('videos').insert({
        user_id: session.user.id,
        video_url: publicUrl,
        caption: ""
      }).select().single();

      if (dbError) throw dbError;

      // Reload all posts to include the new one
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
        .update({
          display_name: updatedData.displayName,
          bio: updatedData.bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

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

  const closeSingleView = () => setSelectedPostIndex(null);

  if (!session) {
    return <Auth onLogin={(u) => setSession({ user: u })} />;
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden select-none">
      <NotificationCenter notifications={notifications} />

      {showOnboarding && activeTab === 'feed' && (
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
            ENTRAR AL FEED
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
              onLike={() => addNotification('Tú', 'like', '¡Te ha gustado tu propio video!')}
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
          activeTab === 'feed' ? (
            <VideoFeed posts={posts} onLike={() => addNotification('Tú', 'like', '¡Te ha gustado tu propio video!')} />
          ) : (
            <ProfileView user={user} posts={posts} onSelectPost={(idx) => setSelectedPostIndex(idx)} onUpdateUser={(u, file) => handleUpdateProfile(u, file)} />
          )
        )}
      </div>

      {selectedPostIndex === null && (
        <nav className="fixed bottom-0 inset-x-0 h-20 bg-black/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-around z-[80] pb-6">
          <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center space-y-1 ${activeTab === 'feed' ? 'text-white' : 'text-zinc-600'}`}>
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Feed</span>
          </button>

          <button onClick={() => setIsUploadOpen(true)} className="relative -top-3">
            <div className="bg-white p-1 rounded-2xl shadow-xl">
              <div className="bg-black text-white px-5 py-2 rounded-[14px]">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
              </div>
            </div>
          </button>

          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center space-y-1 ${activeTab === 'profile' ? 'text-white' : 'text-zinc-600'}`}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Perfil</span>
          </button>
        </nav>
      )}

      {isUploadOpen && <UploadModal onUpload={handleUpload} onClose={() => setIsUploadOpen(false)} />}
    </div>
  );
};

export default App;
