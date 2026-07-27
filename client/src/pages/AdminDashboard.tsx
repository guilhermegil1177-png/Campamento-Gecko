// client/src/pages/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  LogOut, Bell, MessageCircle, Users, ScrollText, SlidersHorizontal,
  AlertTriangle, CheckCircle, XCircle, ShieldCheck, Plus, X,
  Building2, Send, Trash2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import Chat from '@/components/Chat';
import NotificationsPanel from '@/components/NotificationsPanel';

// ── Types ──────────────────────────────────────────────
type Role = 'monitor' | 'director' | 'admin';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  camp_id?: string;
  camp_name?: string;
  created_at?: string;
}

interface Camp {
  id: string;
  name: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  active: boolean;
  member_count?: number;
}

interface MonitorLog {
  id: string;
  monitor_id: string;
  monitor_name: string;
  action: string;
  type: 'complete' | 'create' | 'join' | 'warning' | 'info' | 'delete';
  camp_id: string;
  created_at: string;
}

type Tab = 'users' | 'camps' | 'logs' | 'config';

// ── Helpers ────────────────────────────────────────────
const ROLE_COLORS: Record<Role, string> = {
  director: 'bg-green-500/20 text-green-400 border-green-500/30',
  monitor:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  admin:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
};
const ROLE_LABELS: Record<Role, string> = {
  director: '🎯 Director',
  monitor:  '👤 Monitor',
  admin:    '⚙️ Admin',
};

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-green-600', 'bg-blue-600', 'bg-purple-600', 'bg-yellow-600', 'bg-red-600', 'bg-pink-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [showChat, setShowChat] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Data state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [logs, setLogs] = useState<MonitorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editing state
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [filterCamp, setFilterCamp] = useState<string>('all');

  // New camp modal
  const [showNewCamp, setShowNewCamp] = useState(false);
  const [newCamp, setNewCamp] = useState({ name: '', location: '', start_date: '', end_date: '' });
  const [savingCamp, setSavingCamp] = useState(false);

  // Config state
  const [campName, setCampName] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Load data ────────────────────────────────────────
  useEffect(() => {
    loadAll();

    // Realtime: chat badge
    const chatChannel = supabase
      .channel('admin-chat-badge')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, (payload: any) => {
        if (payload.new.sender_id !== user?.id && !showChat) {
          setUnreadChat((n) => n + 1);
        }
      })
      .subscribe();

    // Realtime: new logs
    const logsChannel = supabase
      .channel('admin-logs')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'monitor_logs',
      }, (payload: any) => {
        setLogs((prev) => [payload.new as MonitorLog, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [user]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadUsers(), loadCamps(), loadLogs()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    // Join profiles + camp_users to get role per camp
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, name, email, role, created_at,
        camp_users(camp_id, role, camps(name))
      `)
      .order('created_at', { ascending: false });

    if (error) { toast.error('Erro ao carregar utilizadores'); return; }

    const mapped: AppUser[] = (data || []).map((u: any) => {
      const campUser = u.camp_users?.[0];
      return {
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        role: campUser?.role || u.role || 'monitor',
        camp_id: campUser?.camp_id,
        camp_name: campUser?.camps?.name,
        created_at: u.created_at,
      };
    });
    setUsers(mapped);
  };

  const loadCamps = async () => {
    const { data, error } = await supabase
      .from('camps')
      .select('id, name, location, start_date, end_date, active')
      .order('created_at', { ascending: false });

    if (error) { toast.error('Erro ao carregar acampamentos'); return; }

    // Count members per camp
    const campsWithCount = await Promise.all(
      (data || []).map(async (camp: any) => {
        const { count } = await supabase
          .from('camp_users')
          .select('*', { count: 'exact', head: true })
          .eq('camp_id', camp.id);
        return { ...camp, member_count: count ?? 0 };
      })
    );
    setCamps(campsWithCount);
    if (campsWithCount.length > 0) setCampName(campsWithCount[0].name);
  };

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from('monitor_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return;
    setLogs(data || []);
  };

  // ── Change role ──────────────────────────────────────
  const changeRole = async (userId: string, role: Role) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;

    // Update in profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    // Update in camp_users if exists
    if (u.camp_id) {
      await supabase
        .from('camp_users')
        .update({ role })
        .eq('user_id', userId)
        .eq('camp_id', u.camp_id);
    }

    if (profileError) { toast.error('Erro ao atualizar role'); return; }

    setUsers((prev) => prev.map((x) => x.id === userId ? { ...x, role } : x));
    setEditingRole(null);
    toast.success(`✅ Role de ${u.name} atualizado para ${ROLE_LABELS[role]}`);

    // Log action
    await supabase.from('monitor_logs').insert({
      monitor_id: userId,
      monitor_name: u.name,
      action: `Role alterado para ${role} pelo admin`,
      type: 'info',
      camp_id: u.camp_id || user?.camp_id,
    });
  };

  // ── Remove user from camp ────────────────────────────
  const removeFromCamp = async (userId: string, campId: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    if (!confirm(`Remover ${u.name} do acampamento?`)) return;

    const { error } = await supabase
      .from('camp_users')
      .delete()
      .eq('user_id', userId)
      .eq('camp_id', campId);

    if (error) { toast.error('Erro ao remover utilizador'); return; }

    setUsers((prev) => prev.map((x) => x.id === userId ? { ...x, camp_id: undefined, camp_name: undefined } : x));
    toast.success(`${u.name} removido do acampamento`);
  };

  // ── Create camp ──────────────────────────────────────
  const createCamp = async () => {
    if (!newCamp.name.trim()) return;
    setSavingCamp(true);
    try {
      const { data, error } = await supabase
        .from('camps')
        .insert({
          name: newCamp.name.trim(),
          location: newCamp.location.trim() || null,
          start_date: newCamp.start_date || null,
          end_date: newCamp.end_date || null,
          active: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      setCamps((prev) => [{ ...data, member_count: 0 }, ...prev]);
      toast.success(`🏕️ "${newCamp.name}" criado com sucesso!`);
      setShowNewCamp(false);
      setNewCamp({ name: '', location: '', start_date: '', end_date: '' });
    } catch {
      toast.error('Erro ao criar acampamento');
    } finally {
      setSavingCamp(false);
    }
  };

  // ── Toggle camp active ───────────────────────────────
  const toggleCampActive = async (campId: string) => {
    const camp = camps.find((c) => c.id === campId);
    if (!camp) return;
    const { error } = await supabase
      .from('camps')
      .update({ active: !camp.active })
      .eq('id', campId);

    if (error) { toast.error('Erro ao atualizar acampamento'); return; }
    setCamps((prev) => prev.map((c) => c.id === campId ? { ...c, active: !c.active } : c));
    toast.success(`Acampamento ${camp.active ? 'desativado' : 'ativado'}`);
  };

  // ── Delete camp ──────────────────────────────────────
  const deleteCamp = async (campId: string) => {
    const camp = camps.find((c) => c.id === campId);
    if (!camp) return;
    if (!confirm(`Apagar "${camp.name}"? Esta ação é irreversível.`)) return;

    const { error } = await supabase.from('camps').delete().eq('id', campId);
    if (error) { toast.error('Erro ao apagar acampamento'); return; }
    setCamps((prev) => prev.filter((c) => c.id !== campId));
    toast.success(`"${camp.name}" apagado`);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Até já! 🦎');
  };

  // ── Derived ──────────────────────────────────────────
  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const filteredUsers = filterCamp === 'all'
    ? users
    : users.filter((u) => u.camp_id === filterCamp);

  const stats = [
    { label: 'Utilizadores', value: users.length, icon: '👥', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    { label: 'Acampamentos', value: camps.length, icon: '🏕️', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
    { label: 'Directores', value: users.filter((u) => u.role === 'director').length, icon: '🎯', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    { label: 'Monitores', value: users.filter((u) => u.role === 'monitor').length, icon: '👤', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-2xl">🦎</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm leading-tight">Campamento Gecko</p>
            <p className="text-xs text-muted-foreground">Olá, {firstName} ⚙️</p>
          </div>
          <div className="flex items-center gap-1">
            {/* Chat */}
            <button
              onClick={() => { setShowChat(true); setShowNotifs(false); setUnreadChat(0); }}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="w-5 h-5" />
              {unreadChat > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
            {/* Notificações */}
            <button
              onClick={() => { setShowNotifs((p) => !p); setShowChat(false); }}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </button>
            {/* Badge */}
            <span className="gecko-badge bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold px-2 py-1 rounded-full">
              ⚙️ Admin
            </span>
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold transition-colors border border-destructive/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          {([
            { key: 'users',  label: '👥 Utilizadores' },
            { key: 'camps',  label: '🏕️ Acampamentos' },
            { key: 'logs',   label: '📜 Logs' },
            { key: 'config', label: '⚙️ Config' },
          ] as { key: Tab; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Notifications Panel */}
      {showNotifs && (
        <NotificationsPanel
          onClose={() => setShowNotifs(false)}
          onUnreadChange={setUnreadNotifs}
        />
      )}

      {/* ── Tab: Users ── */}
      {activeTab === 'users' && (
        <div className="container mx-auto px-4 py-4 max-w-lg pb-24 space-y-3">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.label} className={`border rounded-xl p-2.5 text-center ${s.color}`}>
                <p className="text-lg">{s.icon}</p>
                <p className="font-bold text-foreground text-base leading-tight">{s.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter by camp */}
          {camps.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              <button
                onClick={() => setFilterCamp('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterCamp === 'all' ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                Todos
              </button>
              {camps.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilterCamp(c.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    filterCamp === c.id ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* User list */}
          {isLoading ? (
            [1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)
          ) : filteredUsers.length === 0 ? (
            <div className="gecko-card text-center py-10">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-muted-foreground text-sm">Sem utilizadores</p>
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.id} className="gecko-card">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.camp_name && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                        <Building2 className="w-2.5 h-2.5" /> {u.camp_name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {editingRole === u.id ? (
                      <div className="flex gap-1 flex-wrap justify-end">
                        {(['monitor', 'director', 'admin'] as Role[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => changeRole(u.id, r)}
                            className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition-colors ${ROLE_COLORS[r]}`}
                          >
                            {r}
                          </button>
                        ))}
                        <button
                          onClick={() => setEditingRole(null)}
                          className="text-[10px] px-2 py-0.5 rounded-lg border border-border text-muted-foreground"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingRole(u.id)}
                        className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[u.role]}`}
                        title="Clica para alterar role"
                      >
                        {ROLE_LABELS[u.role]}
                      </button>
                    )}
                    {u.camp_id && (
                      <button
                        onClick={() => removeFromCamp(u.id, u.camp_id!)}
                        className="text-[10px] px-2 py-0.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-semibold"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Camps ── */}
      {activeTab === 'camps' && (
        <div className="container mx-auto px-4 py-4 max-w-lg pb-24 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground">Acampamentos</h2>
            <button
              onClick={() => setShowNewCamp(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          </div>

          {isLoading ? (
            [1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)
          ) : camps.length === 0 ? (
            <div className="gecko-card text-center py-10">
              <p className="text-3xl mb-2">🏕️</p>
              <p className="text-muted-foreground text-sm">Sem acampamentos ainda</p>
              <button
                onClick={() => setShowNewCamp(true)}
                className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold"
              >
                Criar primeiro acampamento
              </button>
            </div>
          ) : (
            camps.map((camp) => (
              <div key={camp.id} className={`gecko-card ${!camp.active ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm">{camp.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${
                        camp.active
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {camp.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {camp.location && (
                      <p className="text-xs text-muted-foreground mt-0.5">📍 {camp.location}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {camp.start_date && (
                        <p className="text-[10px] text-muted-foreground/70">
                          📅 {new Date(camp.start_date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                          {camp.end_date && ` → ${new Date(camp.end_date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}`}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70">
                        👥 {camp.member_count} membro{camp.member_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => toggleCampActive(camp.id)}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors ${
                        camp.active
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                          : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                      }`}
                    >
                      {camp.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => deleteCamp(camp.id)}
                      className="text-[10px] px-2 py-1 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-semibold"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Logs ── */}
      {activeTab === 'logs' && (
        <div className="container mx-auto px-4 py-4 max-w-lg pb-24 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-foreground">Logs de Atividade</h2>
            <button
              onClick={loadLogs}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            [1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)
          ) : logs.length === 0 ? (
            <div className="gecko-card text-center py-10">
              <p className="text-3xl mb-2">📜</p>
              <p className="text-muted-foreground text-sm">Sem logs ainda</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="gecko-card flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  log.type === 'create'   ? 'bg-green-500/20 text-green-400' :
                  log.type === 'complete' ? 'bg-blue-500/20 text-blue-400' :
                  log.type === 'join'     ? 'bg-purple-500/20 text-purple-400' :
                  log.type === 'warning'  ? 'bg-red-500/20 text-red-400' :
                  log.type === 'delete'   ? 'bg-orange-500/20 text-orange-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {log.type === 'create'   ? <CheckCircle className="w-3.5 h-3.5" /> :
                   log.type === 'complete' ? <CheckCircle className="w-3.5 h-3.5" /> :
                   log.type === 'join'     ? <ShieldCheck className="w-3.5 h-3.5" /> :
                   log.type === 'warning'  ? <AlertTriangle className="w-3.5 h-3.5" /> :
                   log.type === 'delete'   ? <Trash2 className="w-3.5 h-3.5" /> :
                   <ScrollText className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{log.monitor_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.action}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                  {new Date(log.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Config ── */}
      {activeTab === 'config' && (
        <div className="container mx-auto px-4 py-4 max-w-lg pb-24 space-y-4">

          {/* Camp name */}
          <div className="gecko-card">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" /> Acampamento Principal
            </p>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Nome</label>
              <div className="flex gap-2">
                <input
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={async () => {
                    if (!camps[0]) return;
                    setSavingConfig(true);
                    const { error } = await supabase
                      .from('camps')
                      .update({ name: campName })
                      .eq('id', camps[0].id);
                    setSavingConfig(false);
                    if (error) { toast.error('Erro ao guardar'); return; }
                    toast.success('✅ Nome guardado!');
                    loadCamps();
                  }}
                  disabled={savingConfig}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {savingConfig ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
            <p className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Zona de Perigo
            </p>
            <div className="space-y-2">
              <button
                onClick={() => toast.success('Cache limpa!')}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:border-red-500/40 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                Limpar cache da aplicação
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Apagar TODOS os logs? Esta ação é irreversível.')) return;
                  const { error } = await supabase.from('monitor_logs').delete().neq('id', '');
                  if (error) { toast.error('Erro ao apagar logs'); return; }
                  setLogs([]);
                  toast.success('Logs apagados');
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:border-red-500/40 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
                Apagar todos os logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Camp Modal ── */}
      {showNewCamp && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4"
          onClick={() => setShowNewCamp(false)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Novo Acampamento</h3>
              <button onClick={() => setShowNewCamp(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome *</label>
                <input
                  value={newCamp.name}
                  onChange={(e) => setNewCamp((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Campamento Gecko 2025"
                  className="w-full mt-1.5 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Localização</label>
                <input
                  value={newCamp.location}
                  onChange={(e) => setNewCamp((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Ex: Jerte, Cáceres"
                  className="w-full mt-1.5 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Início</label>
                  <input
                    type="date"
                    value={newCamp.start_date}
                    onChange={(e) => setNewCamp((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full mt-1.5 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fim</label>
                  <input
                    type="date"
                    value={newCamp.end_date}
                    onChange={(e) => setNewCamp((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full mt-1.5 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={createCamp}
              disabled={!newCamp.name.trim() || savingCamp}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {savingCamp ? '⏳ A criar...' : '🏕️ Criar Acampamento'}
            </button>
          </div>
        </div>
      )}

      {/* Chat */}
      {showChat && <Chat onClose={() => setShowChat(false)} />}
    </div>
  );
}
