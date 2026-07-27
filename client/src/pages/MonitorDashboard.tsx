// client/src/pages/MonitorDashboard.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, MessageCircle, LogOut, ChevronDown, Users, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import Chat from '@/components/Chat';
import NotificationsPanel from '@/components/NotificationsPanel';
import Protocols from '@/pages/Protocols';
import { useNotificationManager } from '@/hooks/useNotificationManager';
import type { GeckoUser } from '@/types';

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

type Tab = 'schedule' | 'activities' | 'protocols';

export default function MonitorDashboard() {
  const { user, signOut } = useAuth();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);

  // Notification manager — dispara alertas 10min antes, etc.
  const { notifyDirector } = useNotificationManager({
    user: user as GeckoUser,
    onNewNotification: () => setUnreadNotifs((n) => n + 1),
  });

  // ── Load today's schedule ──────────────────────────────
  useEffect(() => {
    if (!user?.camp_id) { setIsLoading(false); return; }
    loadTodaySchedule();

    // Realtime: time_slots atualizados por outros
    const channel = supabase
      .channel('monitor-slots')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'time_slots' },
        (payload) => {
          const updated = payload.new as TimeSlot;
          setSchedule((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              time_slots: prev.time_slots.map((s) =>
                s.id === updated.id ? { ...s, ...updated } : s
              ),
            };
          });
        }
      )
      .subscribe();

    // Realtime: novas mensagens → badge chat
    const chatChannel = supabase
      .channel('monitor-chat-badge')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `camp_id=eq.${user.camp_id}`,
        },
        (payload: any) => {
          if (payload.new.sender_id !== user.id && !showChat) {
            setUnreadChat((n) => n + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(chatChannel);
    };
  }, [user]);

  const loadTodaySchedule = async () => {
    if (!user?.camp_id) return;
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('schedules')
        .select('id, title, date, time_slots(*)')
        .eq('camp_id', user.camp_id)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        // Ordenar time_slots por hora
        const sorted = {
          ...data,
          time_slots: [...(data.time_slots || [])].sort((a: TimeSlot, b: TimeSlot) =>
            a.time.localeCompare(b.time)
          ),
        };
        setSchedule(sorted as Schedule);
      }
    } catch {
      toast.error('Erro ao carregar cronograma');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Toggle complete ────────────────────────────────────
  const toggleComplete = async (slot: TimeSlot) => {
    if (!user) return;

    const isAssigned =
      slot.assignees.length === 0 ||
      slot.assignees.some(
        (a) =>
          a.toLowerCase() === user.name?.toLowerCase() ||
          a === user.id
      );

    if (!isAssigned) {
      toast.error('🔒 Só podes marcar atividades às quais estás atribuído');
      return;
    }

    const newCompleted = !slot.completed;

    // Optimistic update
    setSchedule((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        time_slots: prev.time_slots.map((s) =>
          s.id === slot.id
            ? {
                ...s,
                completed: newCompleted,
                completed_by: newCompleted ? user.id : undefined,
                completed_at: newCompleted ? new Date().toISOString() : undefined,
              }
            : s
        ),
      };
    });

    const { error } = await supabase
      .from('time_slots')
      .update({
        completed: newCompleted,
        completed_by: newCompleted ? user.id : null,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', slot.id);

    if (error) {
      toast.error('Erro ao atualizar atividade');
      // Rollback
      setSchedule((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          time_slots: prev.time_slots.map((s) =>
            s.id === slot.id ? { ...s, completed: slot.completed } : s
          ),
        };
      });
      return;
    }

    if (newCompleted) {
      toast.success(`✅ "${slot.title}" concluída!`);
      // Notificar director
      await notifyDirector(
        `✅ Atividade concluída`,
        `${user.name} concluiu "${slot.title}"`,
        'success',
        { schedule_id: schedule?.id, time_slot_id: slot.id }
      );
    } else {
      toast.info(`↩️ "${slot.title}" marcada como pendente`);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Até já! 🦎');
  };

  const handleOpenChat = () => {
    setShowChat(true);
    setShowNotifs(false);
    setUnreadChat(0);
  };

  const slots = schedule?.time_slots ?? [];
  const done = slots.filter((s) => s.completed).length;
  const total = slots.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Monitor';

  const isAssignedTo = (slot: TimeSlot) =>
    slot.assignees.length === 0 ||
    slot.assignees.some(
      (a) =>
        a.toLowerCase() === user?.name?.toLowerCase() ||
        a === user?.id
    );

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-2xl">🦎</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm leading-tight">Campamento Gecko</p>
            <p className="text-xs text-muted-foreground">Olá, {firstName} 👋</p>
          </div>
          <div className="flex items-center gap-1">
            {/* Chat */}
            <button
              onClick={handleOpenChat}
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
        <div className="flex gap-2 px-4 pb-3">
          {([
            { key: 'schedule',   label: '📋 Cronograma' },
            { key: 'activities', label: '🏕️ Atividades' },
            { key: 'protocols',  label: '📄 Protocolos' },
          ] as { key: Tab; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
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

      {/* ── Tab: Schedule / Activities ── */}
      {(activeTab === 'schedule' || activeTab === 'activities') && (
        <div className="container mx-auto px-4 py-4 max-w-lg pb-24">

          {isLoading ? (
            <div className="flex justify-center py-20">
              <span className="text-4xl animate-bounce">🦎</span>
            </div>
          ) : !schedule ? (
            <div className="text-center py-20 space-y-2">
              <span className="text-4xl">📋</span>
              <p className="text-muted-foreground text-sm">Sem cronograma para hoje</p>
            </div>
          ) : (
            <>
              {/* Progress card */}
              <div className="gecko-card mb-4 animate-slide-up">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📋</span>
                  <h1 className="font-bold text-foreground text-base">{schedule.title}</h1>
                </div>
                <p className="text-xs text-muted-foreground mb-3 capitalize">
                  {new Date(schedule.date).toLocaleDateString('pt-PT', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{done}/{total} concluídas</span>
                  <span className="text-primary font-semibold">{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: pct + '%' }}
                  />
                </div>
              </div>

              {/* Time slots */}
              <div className="flex flex-col gap-3">
                {slots.map((slot, i) => {
                  const isOpen = expanded === slot.id;
                  const canComplete = isAssignedTo(slot);
                  const isResponsible = canComplete && slot.assignees.length > 0;

                  return (
                    <div
                      key={slot.id}
                      className={`rounded-xl border overflow-hidden transition-all duration-200 animate-slide-up ${
                        slot.completed
                          ? 'border-primary/30 bg-card/60'
                          : 'border-border bg-card'
                      }`}
                      style={{ animationDelay: i * 40 + 'ms' }}
                    >
                      <button
                        onClick={() => setExpanded(isOpen ? null : slot.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      >
                        {/* Time badge */}
                        <div className={`flex-shrink-0 w-14 text-center py-1 rounded-lg text-xs font-bold border transition-colors ${
                          slot.completed
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          {slot.time}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm transition-colors ${
                              slot.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}>
                              {slot.title}
                            </p>
                            {isResponsible && !slot.completed && (
                              <span className="text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                                ⭐ Tu
                              </span>
                            )}
                          </div>
                          {slot.assignees.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              👥 {slot.assignees.slice(0, 2).join(', ')}
                              {slot.assignees.length > 2 ? ` +${slot.assignees.length - 2}` : ''}
                            </p>
                          )}
                        </div>

                        {slot.completed && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Expanded */}
                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                          {slot.description && (
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                              <p className="text-sm text-foreground/90 leading-relaxed">{slot.description}</p>
                            </div>
                          )}

                          {slot.assignees.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Users className="w-3 h-3" /> Responsáveis
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {slot.assignees.map((a, idx) => (
                                  <span
                                    key={idx}
                                    className={`gecko-badge border ${
                                      a.toLowerCase() === user?.name?.toLowerCase() || a === user?.id
                                        ? 'bg-primary/20 text-primary border-primary/40 font-semibold'
                                        : 'bg-primary/10 text-primary border-primary/20'
                                    }`}
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {slot.notes?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Notas
                              </p>
                              <ul className="space-y-1">
                                {slot.notes.map((note, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground/80">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                    {note}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {slot.completed && slot.completed_at && (
                            <p className="text-[10px] text-muted-foreground">
                              ✅ Concluída às {new Date(slot.completed_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}

                          <button
                            onClick={() => toggleComplete(slot)}
                            disabled={!canComplete}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                              !canComplete
                                ? 'bg-muted text-muted-foreground border border-border opacity-50 cursor-not-allowed'
                                : slot.completed
                                  ? 'bg-muted text-muted-foreground border border-border hover:border-primary/40'
                                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                          >
                            {!canComplete
                              ? '🔒 Não és responsável'
                              : slot.completed
                                ? '↩️ Marcar como pendente'
                                : '✅ Marcar como concluída'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat */}
      {showChat && <Chat onClose={() => setShowChat(false)} />}
    </div>
  );
}
