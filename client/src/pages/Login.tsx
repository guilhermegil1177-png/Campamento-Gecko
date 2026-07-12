import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

export default function Login() {
  const { signIn } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setLocation('/');
    }
  };

  const fillDemo = (role: string) => {
    const emails: Record<string, string> = {
      director: 'director@campgecko.com',
      monitor: 'monitor1@campgecko.com',
      admin: 'admin@campgecko.com',
    };
    setEmail(emails[role] || emails.director);
    setPassword('gecko123');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Glow background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">🦎</div>
          <h1 className="text-4xl font-bold text-primary mb-1">Campamento Gecko</h1>
          <p className="text-muted-foreground text-sm">Plataforma de gestão de acampamentos</p>
        </div>

        {/* Login Card */}
        <div className="gecko-card border-primary/30 backdrop-blur-sm bg-card/80 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="director@campgecko.com"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full gecko-btn-primary py-3 text-base flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  A entrar...
                </>
              ) : (
                '🔐 Entrar'
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">
              🧪 Modo Demo — Acesso sem Supabase configurado
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'director', label: '🎯 Director', color: 'border-primary/50 text-primary' },
                { role: 'monitor', label: '👤 Monitor', color: 'border-accent/50 text-accent' },
                { role: 'admin', label: '⚙️ Admin', color: 'border-muted-foreground/50 text-muted-foreground' },
              ].map(({ role, label, color }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(role)}
                  className={`text-xs py-2 px-2 rounded-lg border ${color} hover:bg-muted transition-colors font-medium`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Campamento Gecko v2.0 • Powered by Supabase
        </p>
      </div>
    </div>
  );
}
