import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LogOut, Settings, Users, ScrollText, SlidersHorizontal, AlertTriangle, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type Role = 'monitor' | 'director' | 'admin';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  pending?: boolean;
  joined?: string;
  last_seen?: string;
}

const DEMO_USERS: AppUser[] = [
  { id: '1', name: 'João Director', email: 'joao@gecko.com', role: 'director', active: true, joined: '2025-06-01', last_seen: 'Hoje' },
  { id: '2', name: 'Maria Monitor', email: 'maria@gecko.com', role: 'monitor', active: true, joined: '2025-06-03', last_seen: 'Hoje' },
  { id: '3', name: 'Pedro Monitor', email: 'pedro@gecko.com', role: 'monitor', active: true, joined: '2025-06-03', last_seen: 'Ontem' },
  { id: '4', name: 'Sofia Monitor', email: 'sofia@gecko.com', role: 'monitor', active: false, joined: '2025-06-05', last_seen: '3 dias' },
  { id: '5', name: 'Carlos Novo', email: 'carlos@gecko.com', role: 'monitor', active: true, joined: '2025-07-20', last_seen: 'Hoje', pending: true },
];

const DEMO_LOGS = [
  { id: 1, user: 'João Director', action: 'Criou cronograma "Día 7 - OLIMPIADAS"', time: '09:32', type: 'create' },
  { id: 2, user: 'Maria Monitor', action: 'Marcou "Despertador" como concluído', time: '07:55', type: 'complete' },
  { id: 3, user: 'Carlos Novo', action: 'Registou-se na plataforma', time: '07:10', type: 'join' },
  { id: 4, user: 'Sofia Monitor', action: 'Conta desativada pelo admin', time: 'Ontem', type: 'warning' },
  { id: 5, user: 'Pedro Monitor', action: 'Entrou na sessão', time: 'Ontem', type: 'info' },
];

const ROLE_COLORS: Record<Role, string> = {
  director: 'bg-green-500/20 text-green-400 border-green-500/30',
  monitor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const ROLE_LABELS: Record<Role, string> = {
  director: '🎯 Director',
  monitor: '👤 Monitor',
  admin: '⚙️ Admin',
};

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const colors = ['bg-green-600', 'bg-blue-600', 'bg-purple-600', 'bg-yellow-600', 'bg-red-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<AppUser[]>(DEMO_USERS);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'config'>('users');
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [campName, setCampName] = useState('Campamento Gecko 2025');
  const [features, setFeatures] = useState({ chat: true, notifications: true, activities: true, pwa: false });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const hasSupabase = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (hasSupabase) {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (!error && data) setUsers(data);
      }
    } catch {
      // fallback to demo
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Sessão terminada');
    setLocation('/login');
  };

  const toggleActive = async (id: string) => {
    const u = users.find(u => u.id === id);
    if (!u) return;
    setUsers(prev => prev.map(x => x.id === id ? { ...x, active: !x.active } : x));
    toast.success(`${u.name} ${u.active ? 'desativado' : 'ativado'} com sucesso`);
    try {
      await supabase.from('users').update({ active: !u.active }).eq('id', id);
    } catch { /* silent */ }
  };

  const changeRole = async (id: string, role: Role) => {
    setUsers(prev => prev.map(x => x.id === id ? { ...x, role } : x));
    setEditingRole(null);
    toast.success('Role atualizado com sucesso');
    try {
      await supabase.from('users').update({ role }).eq('id', id);
    } catch { /* silent */ }
  };

  const approvePending = (id: string) => {
    setUsers(prev => prev.map(x => x.id === id ? { ...x, pending: false } : x));
    toast.success('Utilizador aprovado!');
  };

  const rejectPending = (id: string) => {
    setUsers(prev => prev.filter(x => x.id !== id));
    toast.error('Utilizador rejeitado');
  };

  const pending = users.filter(u => u.pending);
  const stats = [
    { label: 'Utilizadores', value: users.length, icon: '👥', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    { label: 'Directores', value: users.filter(u => u.role === 'director').length, icon: '🎯', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
    { label: 'Monitores', value: users.filter(u => u.role === 'monitor').length, icon: '👤', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
    { label: 'Pendentes', value: pending.length, icon: '⏳', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦎</span>
            <div>
              <p className="font-bold text-foreground text-sm leading-tight">Campamento Gecko</p>
              <p className="text-xs text-muted-foreground leading-tight">Administração</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="gecko-badge bg-purple-500/20 text-purple-400 border border-purple-500/30 mr-1">⚙️ Admin</span>
            <button onClick={() => setLocation('/settings')} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={handleSignOut} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 space-y-4 max-w-2xl pb-24">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá, {user?.name?.split(' ')[0] || 'Admin'} 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">Painel de administração da plataforma</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map(s => (
            <div key={s.label} className={`border rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-xl">{s.icon}</p>
              <p className="font-bold text-foreground text-lg leading-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pending approvals */}
        {pending.length > 0 && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-yellow-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {pending.length} registo{pending.length > 1 ? 's' : ''} pendente{pending.length > 1 ? 's' : ''} de aprovação
            </p>
            {pending.map(u => (
              <div key={u.id} className="flex items-center gap-3 bg-card/60 rounded-xl px-3 py-2.5">
                <Avatar name={u.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <button onClick={() => approvePending(u.id)} className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-lg hover:bg-green-500/30 transition-colors font-semibold">
                  ✅ Aprovar
                </button>
                <button onClick={() => rejectPending(u.id)} className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/30 transition-colors font-semibold">
                  ❌
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
          {[
            { id: 'users', label: '👥 Utilizadores', Icon: Users },
            { id: 'logs', label: '📜 Logs', Icon: ScrollText },
            { id: 'config', label: '⚙️ Config', Icon: SlidersHorizontal },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'users' | 'logs' | 'config')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Utilizadores */}
        {activeTab === 'users' && (
          <div className="space-y-2">
            {users.filter(u => !u.pending).map(u => (
              <div key={u.id} className={`gecko-card transition-all ${!u.active ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar name={u.name} />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${u.active ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.last_seen && <p className="text-xs text-muted-foreground/60 mt-0.5">Último acesso: {u.last_seen}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {editingRole === u.id ? (
                      <div className="flex gap-1 flex-wrap justify-end">
                        {(['monitor', 'director', 'admin'] as Role[]).map(r => (
                          <button key={r} onClick={() => changeRole(u.id, r)} className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition-colors ${ROLE_COLORS[r]}`}>
                            {r}
                          </button>
                        ))}
                        <button onClick={() => setEditingRole(null)} className="text-[10px] px-2 py-0.5 rounded-lg border border-border text-muted-foreground">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingRole(u.id)} className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[u.role]}`} title="Clica para alterar role">
                        {ROLE_LABELS[u.role]}
                      </button>
                    )}
                    <button
                      onClick={() => toggleActive(u.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition-colors ${u.active ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}`}
                    >
                      {u.active ? '🔴 Desativar' : '🟢 Ativar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-2">
            {DEMO_LOGS.map(log => (
              <div key={log.id} className="gecko-card flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  log.type === 'create' ? 'bg-green-500/20 text-green-400' :
                  log.type === 'complete' ? 'bg-blue-500/20 text-blue-400' :
                  log.type === 'join' ? 'bg-purple-500/20 text-purple-400' :
                  log.type === 'warning' ? 'bg-red-500/20 text-red-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {log.type === 'create' ? <CheckCircle className="w-3.5 h-3.5" /> :
                   log.type === 'complete' ? <CheckCircle className="w-3.5 h-3.5" /> :
                   log.type === 'join' ? <ShieldCheck className="w-3.5 h-3.5" /> :
                   log.type === 'warning' ? <XCircle className="w-3.5 h-3.5" /> :
                   <ScrollText className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{log.user}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.action}</p>
                </div>
                <span className="text-xs text-muted-foreground/60 flex-shrink-0">{log.time}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Config */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="gecko-card">
              <p className="text-sm font-semibold text-foreground mb-3">🏕️ Configurações do Campo</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome do Campo</label>
                <div className="flex gap-2">
                  <input
                    value={campName}
                    onChange={e => setCampName(e.target.value)}
                    className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                  />
                  <button onClick={() => toast.success('Nome guardado!')} className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">
                    Guardar
                  </button>
                </div>
              </div>
            </div>

            <div className="gecko-card">
              <p className="text-sm font-semibold text-foreground mb-3">🔧 Funcionalidades</p>
              <div className="space-y-4">
                {[
                  { key: 'chat' as const, label: 'Chat da Equipa', desc: 'Mensagens entre monitores e directores' },
                  { key: 'notifications' as const, label: 'Notificações Push', desc: 'Alertas em tempo real' },
                  { key: 'activities' as const, label: 'Biblioteca de Atividades', desc: 'Acesso à biblioteca de atividades' },
                  { key: 'pwa' as const, label: 'Modo PWA', desc: 'Instalar app no dispositivo' },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-foreground font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        setFeatures(prev => ({ ...prev, [f.key]: !prev[f.key] }));
                        toast.success(`${f.label} ${features[f.key] ? 'desativado' : 'ativado'}`);
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${features[f.key] ? 'bg-purple-600' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${features[f.key] ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
              <p className="text-sm font-semibold text-red-400 mb-3">⚠️ Zona de Perigo</p>
              <div className="space-y-2">
                <button onClick={() => toast.success('Cache limpa com sucesso!')} className="w-full text-left px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:border-red-500/40 transition-colors">
                  🗑️ Limpar cache da aplicação
                </button>
                <button onClick={() => toast.error('Dados de demo removidos!')} className="w-full text-left px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:border-red-500/40 transition-colors">
                  🔄 Remover dados de demonstração
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
