import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { GeckoUser, UserRole } from '@/types';

interface AuthContextType {
  user: GeckoUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isDirector: () => boolean;
  isAdmin: () => boolean;
  isMonitor: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo offline user (when Supabase is not configured)
const DEMO_USER: GeckoUser = {
  id: 'demo-director',
  email: 'director@campgecko.com',
  name: 'Director Demo',
  role: 'director',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GeckoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hasSupabase = !!import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!hasSupabase) {
      // Demo mode: check localStorage
      const stored = localStorage.getItem('gecko_demo_user');
      if (stored) {
        try { setUser(JSON.parse(stored)); } catch {}
      }
      setIsLoading(false);
      return;
    }

    // Real Supabase auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      setUser(data || null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const hasSupabase = !!import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!hasSupabase) {
      // Demo mode login
      const demoUsers: Record<string, GeckoUser> = {
        'director@campgecko.com': { ...DEMO_USER, email, name: 'Director Gecko', role: 'director' },
        'monitor1@campgecko.com': { ...DEMO_USER, id: 'demo-m1', email, name: 'Monitor 1', role: 'monitor' },
        'monitor2@campgecko.com': { ...DEMO_USER, id: 'demo-m2', email, name: 'Monitor 2', role: 'monitor' },
        'monitor3@campgecko.com': { ...DEMO_USER, id: 'demo-m3', email, name: 'Monitor 3', role: 'monitor' },
        'admin@campgecko.com': { ...DEMO_USER, id: 'demo-admin', email, name: 'Admin Gecko', role: 'admin' },
      };
      const demoUser = demoUsers[email.toLowerCase()];
      if (demoUser && password.length >= 6) {
        localStorage.setItem('gecko_demo_user', JSON.stringify(demoUser));
        setUser(demoUser);
        return { error: null };
      }
      return { error: 'Email ou password incorretos. Use os emails de demo com qualquer password (6+ chars).' };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    localStorage.removeItem('gecko_demo_user');
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const isDirector = () => user?.role === 'director';
  const isAdmin = () => user?.role === 'admin';
  const isMonitor = () => user?.role === 'monitor';

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signOut,
      isDirector,
      isAdmin,
      isMonitor,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
