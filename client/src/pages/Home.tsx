import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Schedule } from '@/types';
import { Calendar, BookOpen, MessageSquare, Bell, Settings, LogOut, Plus, ChevronRight, Clock, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';

// Sample schedules for demo mode
const DEMO_SCHEDULES: Schedule[] = [
  {
    id: 'demo-1',
    title: 'Día 6 - PILONES',
    description: 'Descida de Pilones em Jerte com picnic na montanha',
    date: new Date().toISOString().split('T')[0],
    created_by: 'demo-director',
    time_slots: [
      { id: 's1', schedule_id: 'demo-1', time: '07:50', title: 'Despertador', description: 'Acordar os acampados', notes: [], assignees: [], completed: true, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's2', schedule_id: 'demo-1', time: '08:20', title: 'Desayuno', description: 'Pequeno-almoço coletivo', notes: ['Aron, Gil e Sergio ficam na instalação'], assignees: ['Nuria', 'Paula', 'Ainara'], completed: true, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's3', schedule_id: 'demo-1', time: '08:45', title: 'Salida en bus', description: 'Saída em autocarro para Jerte', notes: ['Garrafas de água 6/8 (Luis e Ainara)'], assignees: ['Luis', 'Ainara'], completed: false, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's4', schedule_id: 'demo-1', time: '09:30', title: 'Llegada a Jerte - Inicio Ruta', description: 'Chegada e início da rota de Pilones', notes: ['Briefing Pilones - Nuria', 'Monitores cada 10/12 miúdos'], assignees: ['Nuria', 'Luis', 'Paula'], completed: false, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's5', schedule_id: 'demo-1', time: '14:30', title: 'Piquenique', description: 'Piquenique no refúgio do Escribano', notes: ['Máxima coordenação'], assignees: ['Clara', 'Sere'], completed: false, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's6', schedule_id: 'demo-1', time: '18:30', title: 'Vuelta al campamento', description: 'Regresso ao acampamento', notes: [], assignees: [], completed: false, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's7', schedule_id: 'demo-1', time: '20:30', title: 'Cena', description: 'Jantar', notes: [], assignees: [], completed: false, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's8', schedule_id: 'demo-1', time: '22:00', title: 'Velada', description: 'Histórias das estrelas / Relaxamento', notes: ['Cuentos de las estrellas'], assignees: [], completed: false, notification_sent: false, created_at: '', updated_at: '' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Día 7 - OLIMPIADAS',
    description: 'Jogos olímpicos inter-equipas no campo',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_by: 'demo-director',
    time_slots: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function Home() {
  const { user, signOut, isDirector } = useAuth();
  const [, setLocation] = useLocation();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const hasSupabase = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (hasSupabase) {
        const { data, error } = await supabase
          .from('schedules')
          .select('*, time_slots(*)')
          .order('date', { ascending: false })
          .limit(5);
        if (!error && data) setSchedules(data);
      } else {
        setSchedules(DEMO_SCHEDULES);
      }
    } catch {
      setSchedules(DEMO_SCHEDULES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Sessão terminada');
    setLocation('/login');
  };

  const todaySchedule = schedules.find(s => s.date === new Date().toISOString().split('T')[0]);
  const totalSlots = todaySchedule?.time_slots?.length || 0;
  const completedSlots = todaySchedule?.time_slots?.filter(s => s.completed).length || 0;
  const progressPct = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

  const quickActions = [
    { label: 'Cronogramas', icon: Calendar, href: '/schedules', color: 'text-primary bg-primary/10 border-primary/30', desc: `${schedules.length} cronogramas` },
    { label: 'Atividades', icon: BookOpen, href: '/activities', color: 'text-accent bg-accent/10 border-accent/30', desc: 'Biblioteca' },
    { label: 'Chat', icon: MessageSquare, href: '/chat', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30', desc: 'Em breve' },
    { label: 'Notificações', icon: Bell, href: '/notifications', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', desc: 'Em breve' },
  ];

  const roleLabel = {
    director: '🎯 Director',
    monitor: '👤 Monitor',
    admin: '⚙️ Admin',
  }[user?.role || 'monitor'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦎</span>
            <span className="font-bold text-primary text-lg hidden sm:block">Campamento Gecko</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLocation('/settings')} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={handleSignOut} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Welcome */}
        <div className="animate-slide-up">
          <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            Olá, {user?.name?.split(' ')[0] || 'Gecko'} 👋
          </h1>
          <span className="gecko-badge bg-primary/15 text-primary border border-primary/30 mt-2">
            {roleLabel}
          </span>
        </div>

        {/* Today's progress */}
        {todaySchedule && (
          <div className="animate-slide-up gecko-card border-primary/30" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Hoje</p>
                <h2 className="font-bold text-foreground">{todaySchedule.title}</h2>
              </div>
              <button onClick={() => setLocation('/schedules')} className="text-primary text-sm flex items-center gap-1 hover:underline">
                Ver <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-primary">{progressPct}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {completedSlots}/{totalSlots} atividades concluídas
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ animationDelay: '100ms' }} className="animate-slide-up">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, icon: Icon, href, color, desc }) => (
              <button
                key={label}
                onClick={() => setLocation(href)}
                className={`gecko-card border flex flex-col items-start gap-2 p-4 hover:scale-[1.02] transition-all ${color}`}
              >
                <div className={`p-2 rounded-lg border ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Schedules */}
        <div style={{ animationDelay: '150ms' }} className="animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cronogramas Recentes</h2>
            {isDirector() && (
              <button
                onClick={() => setLocation('/schedules')}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Novo
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : schedules.length === 0 ? (
            <div className="gecko-card text-center py-8">
              <p className="text-muted-foreground text-sm">Nenhum cronograma ainda</p>
              {isDirector() && (
                <button onClick={() => setLocation('/schedules')} className="gecko-btn-primary mt-3 text-sm">
                  Criar primeiro cronograma
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {schedules.slice(0, 4).map((s, i) => {
                const slots = s.time_slots || [];
                const done = slots.filter(x => x.completed).length;
                const isToday = s.date === new Date().toISOString().split('T')[0];
                return (
                  <button
                    key={s.id}
                    onClick={() => setLocation('/schedules')}
                    className="w-full gecko-card flex items-center gap-4 hover:border-primary/50 transition-all text-left"
                    style={{ animationDelay: `${200 + i * 50}ms` }}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground text-sm truncate">{s.title}</p>
                        {isToday && <span className="gecko-badge bg-primary/15 text-primary text-[10px] border border-primary/30 flex-shrink-0">Hoje</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(s.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                        </span>
                        {slots.length > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {done}/{slots.length}
                          </span>
                        )}
                        {slots.some(x => x.assignees?.length > 0) && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Monitores
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ animationDelay: '250ms' }} className="animate-slide-up grid grid-cols-3 gap-3">
          {[
            { label: 'Cronogramas', value: schedules.length, icon: '📋' },
            { label: 'Hoje', value: `${completedSlots}/${totalSlots}`, icon: '✅' },
            { label: 'Equipa', value: isDirector() ? 'Director' : user?.role || '-', icon: '👥' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="gecko-card text-center">
              <p className="text-2xl mb-1">{icon}</p>
              <p className="font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
