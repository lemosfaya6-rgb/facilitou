import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase'; // Mantido para eventos de auth se necessário

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const mapProfileToUser = (profile: any): User => ({
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    province: profile.province,
    municipality: profile.municipality,
    gender: profile.gender,
    description: profile.description,
    type: profile.type || 'CLIENT',
    foto: profile.avatar_url,
  });
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const res = await fetch(`/api/profiles/${session.user.id}`);
          if (res.ok) {
            const data = await res.json();
            setUser(mapProfileToUser(data));
          } else {
            setUser({ id: session.user.id, email: session.user.email, name: 'Usuário', type: 'CLIENT' } as User);
          }
        }
      } catch (err) {
        console.error('Erro na inicialização:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Falha no login');
    }

    const data = await res.json();
    
    // Atualiza a sessão local no Supabase Client para manter persistência
    if (data.session) {
      await supabase.auth.setSession(data.session);
    }

    if (data.profile) {
      setUser(mapProfileToUser(data.profile));
    } else {
      setUser({ id: data.user.id, email: data.user.email, name: 'Usuário', type: 'CLIENT' } as User);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Falha no registo');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    const res = await fetch(`/api/profiles/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: data.name,
        phone: data.phone,
        province: data.province,
        municipality: data.municipality,
        avatar_url: data.foto
      })
    });
    if (!res.ok) throw new Error('Erro ao atualizar perfil');
    const updated = await res.json();
    setUser(mapProfileToUser(updated));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, updateProfile, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
