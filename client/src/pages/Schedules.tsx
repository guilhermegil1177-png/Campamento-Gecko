import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Schedule, TimeSlot } from '@/types';
import { ArrowLeft, Plus, Trash2, Check, ChevronDown, ChevronUp, X, Save, Clock, Users, FileText, Bell, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

const DEMO_MONITORS = [
  { id: 'demo-1', name: 'Maria Monitor', role: 'monitor' },
  { id: 'demo-2', name: 'Pedro Monitor', role: 'monitor' },
  { id: 'demo-3', name: 'Sofia Monitor', role: 'monitor' },
  { id: 'demo-director', name: 'João Director', role: 'director' },
];

const DEMO_SCHEDULES: Schedule[] = [
  {
    id: 'demo-1',
    title: 'Día 6 - PILONES',
    description: 'Descida de Pilones em Jerte com picnic na montanha',
    date: new Date().toISOString().split('T')[0],
    created_by: 'demo-director',
    time_slots: [
      { id: 's1', schedule_id: 'demo-1', time: '07:50', title: 'Despertador', description: 'Acordar os acampados', notes: [], assignees: [], completed: true, notification_sent: false, created_at: '', updated_at: '' },
      { id: 's2', schedule_id: 'demo-1', time: '08:20', title: 'Desayuno', description: 'Pequeno-almoço coletivo', notes: ['Aron, Gil e Sergio ficam na instalação'], assignees: ['Maria Monitor', 'Pedro Monitor'], completed: true, notification_sent: false, created_at: '', updated_at: '' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function Schedules() {
  const { user, isDirector } = useAuth();
  const [, setLocation] = useLocation();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showNewSlotForm, setShowNewSlotForm] = useState(false);
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
  const [monitors, setMonitors] = useState<{ id: string; name: string; role: string }[]>([]);
  const [showMonitorDropdown, setShowMonitorDropdown] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; read: boolean }[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const [slotTime, setSlotTime] = useState('');
  const [slotTitle, setSlotTitle] = useState('');
  const [slotDesc, setSlotDesc] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [slotNote, setSlotNote] = useState('');

  const isDemo = !import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    loadSchedules();
    loadMonitors();
  }, []);

  const loadMonitors = async () => {
    if (isDemo) {
      setMonitors(DEMO_MONITORS);
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('id, name, role')
      .in('role', ['monitor', 'director'])
      .order('role', { ascending: false });
    if (data) setMonitors(data);
  };

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      if (isDemo) {
        const stored = localStorage.getItem('gecko_schedules');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSchedules(parsed);
          if (parsed.length > 0) setSelected(parsed[0]);
        } else {
          setSchedules(DEMO_SCHEDULES);
          setSelected(DEMO_SCHEDULES[0]);
          localStorage.setItem('gecko_schedules', JSON.stringify(DEMO_SCHEDULES));
        }
      } else {
        const { data } = await supabase.from('schedules').select('*, time_slots(*)').order('date', { ascending: false });
        if (data) { setSchedules(data); if (data.length > 0) setSelected(data[0]); }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveToStorage = (updated: Schedule[]) => {
    if (isDemo) localStorage.setItem('gecko_schedules', JSON.stringify(updated));
  };

  const toggleAssignee = (name: string) => {
    setSelectedAssignees(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const createSchedule = async () => {
    if (!newTitle.trim()) return toast.error('Título obrigatório');
    const newS: Schedule = {
      id: nanoid(), title: newTitle, description: newDesc, date: newDate,
      created_by: user?.id || 'demo', time_slots: [],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    if (!isDemo) {
      const { data, error } = await supabase.from('schedules').insert({ title: newTitle, description: newDesc, date: newDate, created_by: user?.id }).select().single();
      if (error) return toast.error(error.message);
      const full = { ...data, time_slots: [] };
      const updated = [full, ...schedules];
      setSchedules(updated); setSelected(full);
    } else {
      const updated = [newS, ...schedules];
      setSchedules(updated); setSelected(newS); saveToStorage(updated);
    }
    setNewTitle(''); setNewDesc(''); setNewDate(new Date().toISOString().split('T')[0]);
    setShowNewForm(false);
    toast.success('Cronograma criado! 🎉');
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Apagar este cronograma?')) return;
    if (!isDemo) {
      await supabase.from('time_slots').delete().eq('schedule_id', id);
      await supabase.from('schedules').delete().eq('id', id);
    }
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated); saveToStorage(updated);
    setSelected(updated[0] || null);
    toast.success('Cronograma apagado');
  };

  const toggleSlot = async (slotId: string) => {
    if (!selected) return;
    const updatedSlots = (selected.time_slots || []).map(s =>
      s.id === slotId ? { ...s, completed: !s.completed } : s
    );
    const updatedSched = { ...selected, time_slots: updatedSlots };
    setSelected(updatedSched);
    const updatedAll = schedules.map(s => s.id === selected.id ? updatedSched : s);
    setSchedules(updatedAll); saveToStorage(updatedAll);
    if (!isDemo) {
      const slot = updatedSlots.find(s => s.id === slotId);
      await supabase.from('time_slots').update({ completed: slot?.completed }).eq('id', slotId);
    }
  };

  const addSlot = async () => {
    if (!selected || !slotTime || !slotTitle.trim()) return toast.error('Hora e título obrigatórios');
    const newSlot: TimeSlot = {
      id: nanoid(), schedule_id: selected.id, time: slotTime, title: slotTitle,
      description: slotDesc,
      notes: slotNote ? slotNote.split('\n').filter(Boolean) : [],
      assignees: selectedAssignees,
      completed: false, notification_sent: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    if (!isDemo) {
      const { data, error } = await supabase.from('time_slots').insert({ ...newSlot }).select().single();
      if (error) return toast.error(error.message);
      newSlot.id = data.id;
    }
    const updatedSlots = [...(selected.time_slots || []), newSlot].sort((a, b) => a.time.localeCompare(b.time));
    const updatedSched = { ...selected, time_slots: updatedSlots };
    setSelected(updatedSched);
    const updatedAll = schedules.map(s => s.id === selected.id ? updatedSched : s);
    setSchedules(updatedAll); saveToStorage(updatedAll);
    setSlotTime(''); setSlotTitle(''); setSlotDesc(''); setSelectedAssignees([]); setSlotNote('');
    setShowNewSlotForm(false);
    toast.success('Atividade adicionada!');
  };

  const deleteSlot = async (slotId: string) => {
    if (!selected) return;
    if (!isDemo) await supabase.from('time_slots').delete().eq('id', slotId);
    const updatedSlots = (selected.time_slots || []).filter(s => s.id !== slotId);
    const updatedSched = { ...selected, time_slots: updatedSlots };
    setSelected(updatedSched);
    const updatedAll = schedules.map(s => s.id === selected.id ? updatedSched : s);
    setSchedules(updatedAll); saveToStorage(updatedAll);
    toast.success('Atividade removida');
  };

  const toggleExpand = (id: string) => {
    setExpandedSlots(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const slots = (selected?.time_slots || []).sort((a, b) => a.time.localeCompare(b.time));
  const done = slots.filter(s => s.completed).length;
  const pct = slots.length > 0 ? Math.round((done / slots.length) * 100) : 0;
  const unreadNotifs = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setLocation('/')} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-foreground text-lg flex-1">📋 Cronogramas</h1>

          {/* 🔔 Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground relative"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifs}
                </span>
              )}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 top-10 w-72 bg-card border border-border rounded-xl shadow-xl z-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-foreground text-sm">Notificações</p>
                  <button onClick={() => setShowNotifPanel(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground text-xs text-center py-4">Sem notificações</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div key={n.id} className={`text-xs p-2 rounded-lg ${n.read ? 'text-muted-foreground' : 'text-foreground bg-primary/10'}`}>
                        {n.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {isDirector() && (
            <button onClick={() => setShowNewForm(true)} className="gecko-btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Novo
            </button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
        {/* New Schedule Form */}
        {showNewForm && (
          <div className="gecko-card border-primary/40 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground">Novo Cronograma</h2>
              <button onClick={() => setShowNewForm(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título (ex: Día 6 - PILONES)" className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrição (opcional)" rows={2} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="flex gap-2">
                <button onClick={createSchedule} className="gecko-btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"><Save className="w-4 h-4" /> Criar</button>
                <button onClick={() => setShowNewForm(false)} className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted transition-colors">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Schedules List */}
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : schedules.length === 0 ? (
          <div className="gecko-card text-center py-10">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-muted-foreground">Nenhum cronograma ainda.</p>
            {isDirector() && <button onClick={() => setShowNewForm(true)} className="gecko-btn-primary mt-3 text-sm">Criar primeiro</button>}
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map(s => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`w-full gecko-card text-left flex items-center gap-3 transition-all ${selected?.id === s.id ? 'border-primary bg-primary/5' : 'hover:border-border/80'}`}
              >
                <div className={`w-2 h-12 rounded-full flex-shrink-0 ${selected?.id === s.id ? 'bg-primary' : 'bg-border'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}</p>
                </div>
                {isDirector() && (
                  <button onClick={e => { e.stopPropagation(); deleteSchedule(s.id); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Selected Schedule Detail */}
        {selected && (
          <div className="space-y-4 animate-slide-up">
            <div className="gecko-card border-primary/20">
              <h2 className="font-bold text-foreground text-xl">{selected.title}</h2>
              {selected.description && <p className="text-muted-foreground text-sm mt-1">{selected.description}</p>}
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(selected.date + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {slots.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{done}/{slots.length} concluídas</span>
                    <span className="text-primary font-semibold">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Atividades</h3>
                {isDirector() && (
                  <button onClick={() => setShowNewSlotForm(!showNewSlotForm)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                )}
              </div>

              {/* New Slot Form */}
              {showNewSlotForm && isDirector() && (
                <div className="gecko-card border-accent/30 mb-4 animate-slide-up">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground text-sm">Nova Atividade</h3>
                    <button onClick={() => setShowNewSlotForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="time" value={slotTime} onChange={e => setSlotTime(e.target.value)} className="px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      <input value={slotTitle} onChange={e => setSlotTitle(e.target.value)} placeholder="Título" className="px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <input value={slotDesc} onChange={e => setSlotDesc(e.target.value)} placeholder="Descrição" className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />

                    {/* 👥 Monitor Multi-Select Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowMonitorDropdown(!showMonitorDropdown)}
                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-left text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <span className={selectedAssignees.length === 0 ? 'text-muted-foreground' : 'text-foreground'}>
                          {selectedAssignees.length === 0 ? 'Selecionar responsáveis...' : `${selectedAssignees.length} selecionado(s)`}
                        </span>
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </button>

                      {/* Selected badges */}
                      {selectedAssignees.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedAssignees.map(name => (
                            <span key={name} className="gecko-badge bg-accent/10 text-accent border border-accent/20 flex items-center gap-1 text-xs">
                              {name}
                              <button onClick={() => toggleAssignee(name)} className="hover:text-destructive">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Dropdown list */}
                      {showMonitorDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                          {monitors.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { toggleAssignee(m.name); }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted flex items-center justify-between transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${m.role === 'director' ? 'bg-primary' : 'bg-accent'}`} />
                                <span className="text-foreground">{m.name}</span>
                                <span className="text-[10px] text-muted-foreground capitalize">{m.role}</span>
                              </div>
                              {selectedAssignees.includes(m.name) && (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              )}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setShowMonitorDropdown(false)}
                            className="w-full px-3 py-2 text-xs text-center text-muted-foreground hover:bg-muted border-t border-border"
                          >
                            Fechar
                          </button>
                        </div>
                      )}
                    </div>

                    <textarea value={slotNote} onChange={e => setSlotNote(e.target.value)} placeholder="Notas (uma por linha)" rows={2} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={addSlot} className="gecko-btn-primary flex-1 text-sm">Guardar</button>
                      <button onClick={() => setShowNewSlotForm(false)} className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted">Cancelar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Slots Timeline */}
              <div className="relative">
                {slots.length > 0 && <div className="absolute left-[3.25rem] top-4 bottom-4 w-0.5 bg-border" />}
                <div className="space-y-3">
                  {slots.map((slot) => {
                    const expanded = expandedSlots.has(slot.id);
                    return (
                      <div key={slot.id} className="relative flex gap-3 items-start group">
                        <div className={`flex-shrink-0 w-[4.5rem] text-center py-1.5 rounded-lg text-xs font-bold z-10 border transition-colors ${slot.completed ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'}`}>
                          {slot.time}
                        </div>
                        <div className={`flex-1 gecko-card transition-all ${slot.completed ? 'opacity-70' : ''}`}>
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleSlot(slot.id)}
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${slot.completed ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'}`}
                            >
                              {slot.completed && <Check className="w-3 h-3 text-primary-foreground" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm ${slot.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{slot.title}</p>
                              {slot.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{slot.description}</p>}
                              {slot.assignees?.length > 0 && (
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  <Users className="w-3 h-3 text-accent flex-shrink-0" />
                                  {slot.assignees.slice(0, 3).map((a, i) => (
                                    <span key={i} className="gecko-badge bg-accent/10 text-accent border border-accent/20 text-[10px]">{a}</span>
                                  ))}
                                  {slot.assignees.length > 3 && <span className="text-[10px] text-muted-foreground">+{slot.assignees.length - 3}</span>}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {(slot.notes?.length > 0 || slot.description) && (
                                <button onClick={() => toggleExpand(slot.id)} className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                              {isDirector() && (
                                <button onClick={() => deleteSlot(slot.id)} className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          {expanded && (
                            <div className="mt-3 pt-3 border-t border-border space-y-2 animate-slide-up">
                              {slot.description && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                                  <p className="text-sm text-foreground">{slot.description}</p>
                                </div>
                              )}
                              {slot.notes?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Notas</p>
                                  <ul className="space-y-1">
                                    {slot.notes.map((note, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                        {note}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {slot.assignees?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Responsáveis</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {slot.assignees.map((a, i) => (
                                      <span key={i} className="gecko-badge bg-accent/10 text-accent border border-accent/20">{a}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {slots.length === 0 && (
                <div className="gecko-card text-center py-8">
                  <p className="text-muted-foreground text-sm">Nenhuma atividade neste cronograma.</p>
                  {isDirector() && <button onClick={() => setShowNewSlotForm(true)} className="gecko-btn-primary mt-3 text-sm">Adicionar atividade</button>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
