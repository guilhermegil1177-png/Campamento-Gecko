import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Wifi, WifiOff, Bell, Trash2, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { user, signOut, isDirector, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swStatus, setSwStatus] = useState('Verificando...');
  const [cacheSize, setCacheSize] = useState('0 MB');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        setSwStatus(regs.length > 0 ? '✅ Ativo' : '⚠️ Não registrado');
      }).catch(() => setSwStatus('❌ Erro'));
    } else {
      setSwStatus('❌ Não suportado');
    }

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(est => {
        setCacheSize(`${((est.usage || 0) / 1024 / 1024).toFixed(2)} MB`);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Sessão terminada');
    setLocation('/login');
  };

  const handleClearData = () => {
    if (!confirm('Apagar todos os dados locais? Esta ação é irreversível.')) return;
    ['gecko_schedules', 'gecko_activities', 'gecko_demo_user'].forEach(k => localStorage.removeItem(k));
    toast.success('Dados locais apagados');
    window.location.reload();
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      for (const name of names) await caches.delete(name);
      setCacheSize('0 MB');
      toast.success('Cache limpo');
    }
  };

  const handleNotifications = async () => {
    if (!('Notification' in window)) return toast.error('Notificações não suportadas');
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification('🦎 Campamento Gecko', { body: 'Notificações ativadas!' });
      toast.success('Notificações ativadas!');
    } else {
      toast.error('Permissão recusada');
    }
  };

  const roleConfig = {
    director: { label: 'Director', emoji: '🎯', color: 'text-primary bg-primary/15 border-primary/30' },
    monitor: { label: 'Monitor', emoji: '👤', color: 'text-accent bg-accent/15 border-accent/30' },
    admin: { label: 'Admin', emoji: '⚙️', color: 'text-purple-400 bg-purple-400/15 border-purple-400/30' },
  };
  const role = roleConfig[user?.role || 'monitor'];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setLocation('/')} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-foreground text-lg">⚙️ Configurações</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-md space-y-4">
        {/* User Profile */}
        <div className="gecko-card border-primary/20 animate-slide-up">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-2xl">
              🦎
            </div>
            <div>
              <p className="font-bold text-foreground">{user?.name || 'Utilizador'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className={`gecko-badge border mt-1 text-xs ${role.color}`}>{role.emoji} {role.label}</span>
            </div>
          </div>
          {(isDirector() || isAdmin()) && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
              <Shield className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                {isDirector() ? 'Podes criar, editar e apagar cronogramas e atividades.' : 'Tens acesso total à plataforma.'}
              </p>
            </div>
          )}
        </div>

        {/* App Status */}
        <div className="gecko-card animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" /> Status da Aplicação
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Conexão', value: isOnline ? 'Online' : 'Offline', icon: isOnline ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />, valueColor: isOnline ? 'text-green-400' : 'text-red-400' },
              { label: 'Service Worker', value: swStatus, icon: null, valueColor: 'text-foreground' },
              { label: 'Cache', value: cacheSize, icon: null, valueColor: 'text-foreground' },
              { label: 'Supabase', value: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurado ✅' : 'Modo Demo 🧪', icon: null, valueColor: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'text-green-400' : 'text-yellow-400' },
            ].map(({ label, value, icon, valueColor }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="gecko-card animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Notificações
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Recebe alertas 10 minutos antes de cada atividade.</p>
          <button onClick={handleNotifications} className="w-full gecko-btn-primary text-sm">
            🔔 Ativar Notificações
          </button>
        </div>

        {/* Data */}
        <div className="gecko-card animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-destructive" /> Dados Locais
          </h2>
          <div className="space-y-2">
            <button onClick={handleClearCache} className="w-full py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted transition-colors">
              Limpar Cache
            </button>
            <button onClick={handleClearData} className="w-full py-2 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/10 transition-colors">
              Apagar Todos os Dados Locais
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-medium animate-slide-up"
          style={{ animationDelay: '200ms' }}
        >
          🚪 Terminar Sessão
        </button>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Campamento Gecko v2.0.0 • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
