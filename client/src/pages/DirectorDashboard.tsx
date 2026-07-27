// client/src/pages/DirectorDashboard.tsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  LogOut, Bell, MessageCircle, Plus, ChevronDown, ChevronRight,
  CheckCircle2, AlertTriangle, Megaphone, Users, BookOpen,
  Eye, Settings, FileText, Send, X
} from 'lucide-react';
import { toast } from 'sonner';
import Chat from '@/components/Chat';
import NotificationsPanel from '@/components/NotificationsPanel';
import Protocols from '@/pages/Protocols';
import type { GeckoUser } from '@/types';

// ── Types ──────────────────────────────────────────────
interface TimeSlot {
  id: string;
  time: string;
  title: string;
  description: string;
  assignees: string[];
  notes: string[];
  completed: boolean;
  completed_by?: string;
  completed_at?: string;
}

interface Schedule {
  id: string;
  title: string;
  date: string;
  time_slots: TimeSlot[];
}

interface MonitorStat {
  id: string;
  name: string;
  email: string;
  online: boolean;
  tasksTotal: number;
  tasksDone: number;
}

type Tab = 'overview' | 'team' | 'protocols' | 'schedules';

// ── Avatar helper ──────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-primary', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-pink-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function DirectorDashboard() {
  const { user, signOut } = useAuth();

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showChat, setShowChat] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Data state
  const [todaySchedule, setTodaySchedule] = useState<Schedule | null>(null);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [monitors, setMonitors] = useState<MonitorStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Alert state
  const [alertMsg, setAlertMsg] = useState('');
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);

  // New schedule modal
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [newScheduleDate, setNewScheduleDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Load data ────────────────────────────────────────
  useEffect(() => {
    if (!user?.camp_id) { setIsLoading(false); return; }
    loadAll();

    // Realtime: time_slots updates
    const slotsChannel = supabase
      .channel('director-slots')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'time_slots' }, (payload) => {
        const updated = payload.new as TimeSlot;
        setTodaySchedule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            time_slots: prev.time_slots.map((s) => s.id === updated.id ? { ...s, ...updated } : s),
          };
        });
      })
      .subscribe();

    // Realtime: chat badge
    const chatChannel = supabase
      .channel('director-chat-badge')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `camp_id=eq.${user.camp_id}`,
      }, (payload: any) => {
        if (payload.new.sender_id !== user.id && !showChat) {
          setUnreadChat((n) => n + 1);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(slotsChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [user]);

  const loadAll = async () => {
    if (!user?.camp_id) return;
    setIsLoading(true);
    try {
      await Promise.all([loadSchedules(), loadMonitors()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!user?.camp_id) return;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('schedules')
      .select('id, title, date, time_slots(*)')
      .eq('camp_id', user.camp_id)
      .order('date', { ascending: false })
      .limit(10);

    if (error) { toast.error('Erro ao carregar cronogramas'); return; }
    const sorted = (data || []).map((s: any) => ({
      ...s,
      time_slots: [...(s.time_slots || [])].sort((a: TimeSlot, b: TimeSlot) => a.time.localeCompare(b.time)),
    }));
    setAllSchedules(sorted);
    setTodaySchedule(sorted.find((s: Schedule) => s.date === today) ?? null);
  };

  const loadMonitors = async () => {
    if (!user?.camp_id) return;
    const today = new Date().toISOString().split('T')[0];

    // Get monitors for this camp
    const { data: campUsers, error } = await supabase
      .from('camp_users')
      .select('user_id, profiles(id, name, email)')
      .eq('camp_id', user.camp_id)
      .eq('role', 'monitor');

    if (error || !campUsers) return;

    // Get today's schedule slots
    const { data: slots } = await supabase
      .from('time_slots')
      .select('assignees, completed')
      .eq('schedule_id', todaySchedule?.id ?? '');

    const stats: MonitorStat[] = campUsers.map((cu: any) => {
      const profile = cu.profiles;
      const name = profile?.name || profile?.email || 'Monitor';
      const allSlots = slots || [];
      const mySlots = allSlots.filter((s: any) =>
        s.assignees?.includes(profile?.id) || s.assignees?.includes(name)
      );
      return {
        id: profile?.id,
        name,
        email: profile?.email || '',
        online: false, // presence via Supabase Realtime (future)
        tasksTotal: mySlots.length,
        tasksDone: mySlots.filter((s: any) => s.completed).length,
      };
    });

    setMonitors(stats);
  };

  // ── Send alert to all monitors ───────────────────────
  const sendAlert = async () => {
    if (!alertMsg.trim() || !user?.camp_id) return;
    setSendingAlert(true);
    try {
      // Get all monitor IDs for this camp
      const { data: campUsers } = await supabase
        .from('camp_users')
        .select('user_id')
        .eq('camp_id', user.camp_id)
        .in('role', ['monitor', 'director']);

      if (!campUsers?.length) { toast.error('Sem monitores para notificar'); return; }

      const notifications = campUsers.map((cu: any) => ({
        user_id: cu.user_id,
        camp_id: user.camp_id,
        type: 'director_alert',
        title: '📢 Aviso do Director',
        message: alertMsg.trim(),
        read: false,
        metadata: { sender_id: user.id, sender_name: user.name },
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;

      toast.success(`✅ Aviso enviado a ${campUsers.length} pessoa(s)!`);
      setAlertMsg('');
      setShowAlertInput(false);
    } catch {
      toast.error('Erro ao enviar aviso');
    } finally {
      setSendingAlert(false);
    }
  };

  // ── Create new schedule ──────────────────────────────
  const createSchedule = async () => {
    if (!newScheduleTitle.trim() || !user?.camp_id) return;
    try {
      const { error } = await supabase.from('schedules').insert({
        title: newScheduleTitle.trim(),
        date: newScheduleDate,
        camp_id: user.camp_id,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success('📋 Cronograma criado!');
      setShowNewSchedule(false);
      setNewScheduleTitle('');
      await loadSchedules();
    } catch {
      toast.error('Erro ao criar cronograma');
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Até já! 🦎');
  };

  // ── Derived stats ────────────────────────────────────
  const totalSlots = todaySchedule?.time_slots?.length ?? 0;
  const completedSlots = todaySchedule?.time_slots?.filter((s) => s.completed).length ?? 0;
  const progressPct = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
  const unassigned = todaySchedule?.time_slots?.filter((s) => !s.assignees?.length && !s.completed) ?? [];
  const firstName = user?.name?.split(' ')[0] || 'Director';

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-2xl">🦎</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm leading-tight">Campamento Gecko</p>
            <p className="text-xs text-muted-foreground">Olá, {firstName} 🎯</p>
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
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
          {([
            { key: 'overview',   label: '📋 Hoje' },
            { key: 'team',       label: '👥 Equipa' },
            { key: 'schedules',  label: '🗓️ Cronogramas' },
            { key: 'protocols',  label: '📄 Protocolos' },
          ] as { key: Tab; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
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

      {/* ── Tab: Protocols ── */}
      {activeTab === 'protocols' && <Protocols />}

      {/* ── Tab: Schedules ── */}
      {activeTab === 'schedules' && (
        <div className="container mx-auto px-4 py-4 max-w-lg pb-24 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground">Cronogramas</h2>
            <button
              onClick={() => setShowNewSchedule(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          </div>

          {isLoading ? (
            [1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)
          ) : allSchedules.length === 0 ? (
            <div className="gecko-card text-center py-10">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-muted-foreground text-sm">Sem cronogramas ainda</p>
              <button
                onClick={() => setShowNewSchedule(true)}
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
              >
                Criar primeiro cronograma
              </button>
            </div>
          ) : (
            allSchedules.map((s) => {
              const done = s.time_slots?.filter((t) => t.completed).length ?? 0;
              const total = s.time_slots?.length ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isToday = s.date === new Date().toISOString().split('T')[0];
              return (
                <div key={s.id} className={`gecko-card ${isToday ? 'border-primary/40' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground text-sm truncate">{s.title}</p>
                        {isToday && (
                          <span className="text-[10px] bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                            Hoje
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {total > 0 && ` · ${done}/${total} atividades`}
                      </p>
                    </div>
                    {total > 0 && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-primary">{pct}%</p>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-primary rounded-full" style={{ width: pct + '%' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab: Overview (Hoje) ── */}
      {activeTab === 'overview' && (
        <div className="container mx-auto px-4 py-4 max-w-lg pb-24 space-y-4">

          {/* Progress card */}
          {isLoading ? (
            <div className="h-28 rounded-xl bg-muted animate-pulse" />
          ) : todaySchedule ? (
            <div className="gecko-card border-primary/30 animate-slide-up">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Progresso do Dia</p>
                  <h2 className="font-bold text-foreground">{todaySchedule.title}</h2>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{progressPct}%</p>
                  <p className="text-xs text-muted-foreground">{completedSlots}/{totalSlots}</p>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: progressPct + '%' }}
                />
              </div>
              {unassigned.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {unassigned.length} atividade{unassigned.length > 1 ? 's' : ''} sem monitor atribuído
                </div>
              )}
            </div>
          ) : (
            <div className="gecko-card text-center py-8 animate-slide-up">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-muted-foreground text-sm">Sem cronograma para hoje</p>
              <button
                onClick={() => setActiveTab('schedules')}
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
              >
                Criar cronograma
              </button>
            </div>
          )}

          {/* Alert box */}
          <div className="gecko-card animate-slide-up" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-yellow-400" /> Avisos à Equipa
              </p>
              <button
                onClick={() => setShowAlertInput((v) => !v)}
                className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 px-3 py-1 rounded-lg hover:bg-yellow-400/20 transition-colors"
              >
                {showAlertInput ? 'Cancelar' : '+ Novo'}
              </button>
            </div>
            {showAlertInput && (
              <div className="flex gap-2">
                <input
                  value={alertMsg}
                  onChange={(e) => setAlertMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendAlert()}
                  placeholder="Ex: Reunião em 5 min no refeitório..."
                  className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  autoFocus
                />
                <button
                  onClick={sendAlert}
                  disabled={sendingAlert || !alertMsg.trim()}
                  className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
            {!showAlertInput && (
              <p className="text-xs text-muted-foreground">
                Envia um aviso em tempo real a todos os monitores do acampamento.
              </p>
            )}
          </div>

          {/* Today's time slots */}
          {todaySchedule && (
            <div className="space-y-2 animate-slide-up" style={{ animationDelay: '80ms' }}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Atividades de Hoje</p>
              {todaySchedule.time_slots.map((slot, i) => (
                <div
                  key={slot.id}
                  className={`gecko-card flex items-center gap-3 ${slot.completed ? 'border-primary/30 opacity-70' : 'border-border'}`}
                  style={{ animationDelay: i * 30 + 'ms' }}
                >
                  <div className={`flex-shrink-0 w-14 text-center py-1 rounded-lg text-xs font-bold border ${
                    slot.completed ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {slot.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${slot.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {slot.title}
                    </p>
                    {slot.assignees?.length > 0 ? (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        👥 {slot.assignees.slice(0, 2).join(', ')}{slot.assignees.length > 2 ? ` +${slot.assignees.length - 2}` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-yellow-400 mt-0.5">⚠️ Sem monitor atribuído</p>
                    )}
                  </div>
                  {slot.completed
                    ? <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    : <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Team ── */}
      {activeTab === 'team' && (
        <div className="container mx-auto px-4 py-4 max-w-lg pb-24 space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Monitores', value: monitors.length, icon: '👥' },
              { label: 'Completos', value: monitors.filter((m) => m.tasksDone === m.tasksTotal && m.tasksTotal > 0).length, icon: '✅' },
              { label: 'Sem progresso', value: monitors.filter((m) => m.tasksDone === 0 && m.tasksTotal > 0).length, icon: '⚠️' },
            ].map((s) => (
              <div key={s.label} className="gecko-card text-center py-3">
                <p className="text-xl">{s.icon}</p>
                <p className="font-bold text-foreground text-lg">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {isLoading ? (
            [1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)
          ) : monitors.length === 0 ? (
            <div className="gecko-card text-center py-10">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-muted-foreground text-sm">Sem monitores neste acampamento</p>
            </div>
          ) : (
            monitors.map((m) => {
              const pct = m.tasksTotal > 0 ? Math.round((m.tasksDone / m.tasksTotal) * 100) : 0;
              const allDone = m.tasksTotal > 0 && m.tasksDone === m.tasksTotal;
              const noneDone = m.tasksDone === 0 && m.tasksTotal > 0;
              return (
                <div key={m.id} className="gecko-card">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={m.name} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    <span className={`gecko-badge border text-xs font-semibold flex-shrink-0 ${
                      allDone ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      noneDone ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      m.tasksTotal === 0 ? 'bg-muted text-muted-foreground border-border' :
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {allDone ? '✅ Completo' : noneDone ? '⚠️ Sem progresso' : m.tasksTotal === 0 ? '— Sem tarefas' : '🔄 Em curso'}
                    </span>
                  </div>
                  {m.tasksTotal > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            allDone ? 'bg-green-500' : noneDone ? 'bg-red-500' : 'bg-yellow-400'
                          }`}
                          style={{ width: pct + '%' }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{m.tasksDone}/{m.tasksTotal}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── New Schedule Modal ── */}
      {showNewSchedule && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4" onClick={() => setShowNewSchedule(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Novo Cronograma</h3>
              <button onClick={() => setShowNewSchedule(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</label>
                <input
                  value={newScheduleTitle}
                  onChange={(e) => setNewScheduleTitle(e.target.value)}
                  placeholder="Ex: Día 7 - OLIMPIADAS"
                  className="w-full mt-1.5 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</label>
                <input
                  type="date"
                  value={newScheduleDate}
                  onChange={(e) => setNewScheduleDate(e.target.value)}
                  className="w-full mt-1.5 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <button
              onClick={createSchedule}
              disabled={!newScheduleTitle.trim()}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Criar Cronograma
            </button>
          </div>
        </div>
      )}

      {/* Chat */}
      {showChat && <Chat onClose={() => setShowChat(false)} />}
    </div>
  );
}
