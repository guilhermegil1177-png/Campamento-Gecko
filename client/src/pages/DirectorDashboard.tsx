import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Schedule } from '@/types';
import { Settings, LogOut, Plus, ChevronRight, CheckCircle2, Eye, Megaphone, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import { toast } from 'sonner';

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
      { id: 's3', schedule_id: 'demo-1', time: '08:45', title: 'Salida en bus', description: 'Saída em autocarro para Jerte', notes: [], assignees: ['Luis', 'Ainara'], completed: false, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's4', schedule_id: 'demo-1', time: '09:30', title: 'Llegada a Jerte', description: 'Chegada e início da rota de Pilones', notes: [], assignees: ['Nuria', 'Luis', 'Paula'], completed: false, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's5', schedule_id: 'demo-1', time: '14:30', title: 'Piquenique', description: 'Piquenique no refúgio', notes: [], assignees: [], completed: false, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's6', schedule_id: 'demo-1', time: '18:30', title: 'Vuelta al campamento', description: 'Regresso ao acampamento', notes: [], assignees: [], completed: false, notification_sent: false, created_at: '', updated_at: '' },
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

const DEMO_MONITORS = [
  { id: '1', name: 'Maria Monitor', online: true, tasksTotal: 3, tasksDone: 2, color: 'bg-green-500' },
  { id: '2', name: 'Pedro Monitor', online: true, tasksTotal: 2, tasksDone: 0, color: 'bg-blue-500' },
  { id: '3', name: 'Sofia Monitor', online: false, tasksTotal: 3, tasksDone: 3, color: 'bg-purple-500' },
  { id: '4', name: 'João Monitor', online: true, tasksTotal: 2, tasksDone: 1, color: 'bg-yellow-500' },
];

const DEMO_ALERTS = [
  { id: '1', text: 'Sofia concluiu todas as suas tarefas', type: 'success' as const, time: '08:45' },
  { id: '2', text: 'Pedro ainda não marcou nenhuma tarefa', type: 'error' as const, time: '09:15' },
  { id: '3', text: 'Reunião de equipa em 10 min', type: 'warning' as const, time: '09:20' },
];

function MonitorAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
  return (
    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function DirectorDashboard() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'team'>('overview');
  const [alertMsg, setAlertMsg] = useState('');
  const [showAlertInput, setShowAlertInput] = useState(false);

  useEffect(() => { loadSchedules(); }, []);

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
        else setSchedules(DEMO_SCHEDULES);
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

  const sendAlert = () => {
    if (!alertMsg.trim()) return;
    toast.success('Aviso enviado a toda a equipa!');
    setAlertMsg('');
    setShowAlertInput(false);
  };

  const todaySchedule = schedules.find(s => s.date === new Date().toISOString().split('T')[0]);
  const totalSlots = todaySchedule?.time_slots?.length || 0;
  const completedSlots = todaySchedule?.time_slots?.filter(s => s.completed).length || 0;
  const progressPct = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
  const unassigned = todaySchedule?.time_slots?.filter(s => s.assignees.length === 0 && !s.completed) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦎</span>
            <span className="font-bold text-primary text-lg hidden sm:block">Campamento Gecko</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setLocation('/monitor')} title="Vista Monitor" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Eye className="w-5 h-5" />
            </button>
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
        <div className="animate-slide-up">
          <p className="text-muted-foreground text-sm capitalize">
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-bold text-foreground mt-1">Olá, {user?.name?.split(' ')[0] || 'Director'} 👋</h1>
          <span className="gecko-badge bg-primary/15 text-primary border border-primary/30 mt-2 inline-block">🎯 Director</span>
        </div>

        {todaySchedule && (
          <div className="animate-slide-up gecko-card border-primary/30" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Progresso do Dia</p>
                <h2 className="font-bold text-foreground text-lg">{todaySchedule.title}</h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{progressPct}%</p>
                <p className="text-xs text-muted-foreground">{completedSlots}/{totalSlots} ativ.</p>
              </div>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
            {unassigned.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{unassigned.length} atividade{unassigned.length > 1 ? 's' : ''} sem monitor atribuído</span>
              </div>
            )}
          </div>
        )}

        <div className="animate-slide-up gecko-card" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-yellow-400" /> Avisos à Equipa
            </p>
            <button
              onClick={() => setShowAlertInput(v => !v)}
              className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 px-3 py-1 rounded-lg hover:bg-yellow-400/20 transition-colors"
            >
              {showAlertInput ? 'Cancelar' : '+ Novo'}
            </button>
          </div>
          {showAlertInput && (
            <div className="flex gap-2 mb-3">
              <input
                value={alertMsg}
                onChange={e => setAlertMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendAlert()}
                placeholder="Ex: Reunião em 5 minutos no refeitório..."
                className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />
              <button onClick={sendAlert} className="gecko-btn-primary px-4 py-2 rounded-xl text-sm">Enviar</button>
            </div>
          )}
          <div className="space-y-2">
            {DEMO_ALERTS.map(a => (
              <div key={a.id} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
                a.type === 'warning' ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-300' :
                a.type === 'error' ? 'bg-red-400/10 border-red-400/20 text-red-300' :
                'bg-green-400/10 border-green-400/20 text-green-300'
              }`}>
                {a.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> :
                 a.type === 'error' ? <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> :
                 <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                <span className="flex-1">{a.text}</span>
                <span className="text-muted-foreground flex-shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-slide-up flex gap-1 bg-card border border-border rounded-xl p-1" style={{ animationDelay: '100ms' }}>
          {[{ id: 'overview', label: '📋 Cronograma' }, { id: 'team', label: '👥 Equipa' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'team')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-2 animate-slide-up">
            {isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)
            ) : !todaySchedule ? (
              <div className="gecko-card text-center py-8">
                <p className="text-muted-foreground text-sm">Nenhum cronograma para hoje</p>
                <button onClick={() => setLocation('/schedules')} className="gecko-btn-primary mt-3 text-sm">Criar cronograma</button>
              </div>
            ) : (
              <>
                {todaySchedule.time_slots?.map((slot, i) => (
                  <div key={slot.id} className={`gecko-card flex items-center gap-3 ${slot.completed ? 'border-primary/30 opacity-70' : 'border-border'}`} style={{ animationDelay: `${i * 30}ms` }}>
                    <div className={`flex-shrink-0 w-14 text-center py-1 rounded-lg text-xs font-bold border ${slot.completed ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'}`}>
                      {slot.time}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${slot.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{slot.title}</p>
                      {slot.assignees.length > 0 ? (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">👥 {slot.assignees.slice(0, 2).join(', ')}{slot.assignees.length > 2 ? ` +${slot.assignees.length - 2}` : ''}</p>
                      ) : (
                        <p className="text-xs text-yellow-400 mt-0.5">⚠️ Sem monitor atribuído</p>
                      )}
                    </div>
                    {slot.completed ? <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />}
                  </div>
                ))}
                <button onClick={() => setLocation('/schedules')} className="w-full gecko-card flex items-center justify-center gap-2 text-sm text-primary hover:border-primary/50 transition-all">
                  Ver todos os cronogramas <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-3 animate-slide-up">
            {DEMO_MONITORS.map(m => {
              const pct = m.tasksTotal > 0 ? Math.round((m.tasksDone / m.tasksTotal) * 100) : 0;
              const allDone = m.tasksDone === m.tasksTotal;
              const noneDone = m.tasksDone === 0 && m.tasksTotal > 0;
              return (
                <div key={m.id} className="gecko-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <MonitorAvatar name={m.name} color={m.color} />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${m.online ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.online ? 'Online' : 'Offline'}</p>
                    </div>
                    <span className={`gecko-badge border text-xs font-semibold ${allDone ? 'bg-green-500/20 text-green-400 border-green-500/30' : noneDone ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                      {allDone ? '✅ Completo' : noneDone ? '⚠️ Sem progresso' : '🔄 Em curso'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : noneDone ? 'bg-red-500' : 'bg-yellow-400'}`} style={{ width: pct + '%' }} />
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{m.tasksDone}/{m.tasksTotal}</span>
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Online', value: DEMO_MONITORS.filter(m => m.online).length, icon: '🟢' },
                { label: 'Completos', value: DEMO_MONITORS.filter(m => m.tasksDone === m.tasksTotal).length, icon: '✅' },
                { label: 'Sem progresso', value: DEMO_MONITORS.filter(m => m.tasksDone === 0).length, icon: '⚠️' },
              ].map(s => (
                <div key={s.label} className="gecko-card text-center py-3">
                  <p className="text-xl">{s.icon}</p>
                  <p className="font-bold text-foreground text-lg">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="animate-slide-up grid grid-cols-2 gap-3" style={{ animationDelay: '150ms' }}>
          {[
            { label: 'Novo Cronograma', Icon: Plus, href: '/schedules', color: 'text-primary bg-primary/10 border-primary/20' },
            { label: 'Biblioteca', Icon: BookOpen, href: '/activities', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
            { label: 'Vista Monitor', Icon: Eye, href: '/monitor', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
            { label: 'Definições', Icon: Settings, href: '/settings', color: 'text-muted-foreground bg-muted/50 border-border' },
          ].map(({ label, Icon, href, color }) => (
            <button key={label} onClick={() => setLocation(href)} className={`gecko-card border flex items-center gap-3 hover:scale-[1.02] transition-all text-left ${color}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold text-foreground text-sm">{label}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
