
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
DROP POLICY IF EXISTS "Usuarios pueden insertar su propio perfil" ON public.profiles;

CREATE POLICY "Perfiles públicos" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuarios pueden insertar su propio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuarios pueden editar su propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

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

-- 7. Políticas de Almacenamiento (Storage) - Ejecutar si los buckets existen
-- Bucket: videos
-- SELECT: Público
-- INSERT/DELETE: Solo dueño carpte (auth.uid() = foldername)
-- (Nota: Estas se aplican a la tabla storage.objects)

/* 
-- COPIAR Y PEGAR ESTO EN EL SQL EDITOR PARA STORAGE --
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Videos públicos" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Subida de videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars públicos" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Subida de avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
*/
