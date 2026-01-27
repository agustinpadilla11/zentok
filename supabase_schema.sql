
-- 1. Tabla de Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Tabla de Videos
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  caption TEXT,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- 4. Limpiar y recrear políticas para Profiles
DROP POLICY IF EXISTS "Perfiles públicos" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden editar su propio perfil" ON public.profiles;

CREATE POLICY "Perfiles públicos" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuarios pueden editar su propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. Limpiar y recrear políticas para Videos
DROP POLICY IF EXISTS "Videos públicos" ON public.videos;
DROP POLICY IF EXISTS "Usuarios pueden subir sus videos" ON public.videos;
DROP POLICY IF EXISTS "Usuarios pueden borrar sus videos" ON public.videos;

CREATE POLICY "Videos públicos" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Usuarios pueden subir sus videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden borrar sus videos" ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- 6. Trigger para crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', 'usuario_' || substring(new.id::text, 1, 5)),
    COALESCE(new.raw_user_meta_data->>'username', 'usuario_' || substring(new.id::text, 1, 5)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://picsum.photos/seed/' || new.id || '/200/200')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
