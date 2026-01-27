
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) onLogin(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.toLowerCase().replace(/\s/g, '_'),
              avatar_url: `https://picsum.photos/seed/${username}/200/200`,
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          alert("Cuenta creada. Ya puedes iniciar sesión.");
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "Error en la autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-[0_0_40px_rgba(255,255,255,0.2)]">
          <span className="text-black text-4xl font-black italic">Z</span>
        </div>
        <h1 className="text-5xl font-black tracking-tighter uppercase mb-2">ZenTok</h1>
        <p className="text-zinc-500 font-medium">Tu espacio libre de juicios.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl text-sm font-bold text-center">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {!isLogin && (
            <input
              type="text"
              placeholder="Nombre de usuario"
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-white/20 transition-all outline-none font-medium"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-white/20 transition-all outline-none font-medium"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-white/20 transition-all outline-none font-medium"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-white text-black font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-lg shadow-xl uppercase tracking-tight disabled:opacity-50"
        >
          {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
        </button>

        <p className="text-center text-zinc-500 text-sm mt-6">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya eres parte?'}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-white font-bold hover:underline"
          >
            {isLogin ? 'Regístrate' : 'Entra aquí'}
          </button>
        </p>
      </form>
    </div>
  );
};
