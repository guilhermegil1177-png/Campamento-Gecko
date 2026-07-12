import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Activity, ActivityCategory, ActivityDifficulty } from '@/types';
import { ArrowLeft, Plus, Search, Trash2, X, Save, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

const DEMO_ACTIVITIES: Activity[] = [
  { id: 'a1', title: 'Descenso de Pilones', description: 'Descida pelas piscinas naturais de Pilones em Jerte. Uma experiência única na natureza.', category: 'outdoor', instructions: '1. Briefing de segurança\n2. Divisão em grupos de 10-12\n3. Descida supervisionada pelos monitores', video_url: '', image_url: '', materials: ['Roupa para molhar', 'Toalha', 'Calçado aquático'], duration_minutes: 180, difficulty: 'medium', created_by: 'demo-director', created_at: '', updated_at: '' },
  { id: 'a2', title: 'Trilha na Natureza', description: 'Percurso pedestre de 8km pela serra com vista panorâmica.', category: 'outdoor', instructions: 'Seguir a trilha marcada. Monitores na frente e na retaguarda.', video_url: '', image_url: '', materials: ['Botas de caminhada', 'Mochila', 'Água (2L)', 'Protetor solar'], duration_minutes: 240, difficulty: 'hard', created_by: 'demo-director', created_at: '', updated_at: '' },
  { id: 'a3', title: 'Olimpíadas do Campo', description: 'Jogos olímpicos inter-equipas com várias provas desportivas.', category: 'sport', instructions: 'Dividir em 4 equipas. Rotação por 6 provas. Pontuação acumulativa.', video_url: '', image_url: '', materials: ['Bolas variadas', 'Cones', 'Fita métrica', 'Quadro de pontuação'], duration_minutes: 120, difficulty: 'easy', created_by: 'demo-director', created_at: '', updated_at: '' },
  { id: 'a4', title: 'Oficina de Artesanato', description: 'Criação de pulseiras, colares e pinturas em pedras.', category: 'craft', instructions: 'Preparar materiais nas mesas. Cada acampado escolhe a sua atividade.', video_url: '', image_url: '', materials: ['Fios coloridos', 'Miçangas', 'Pedras', 'Tintas acrílicas', 'Pincéis'], duration_minutes: 90, difficulty: 'easy', created_by: 'demo-director', created_at: '', updated_at: '' },
  { id: 'a5', title: 'Jogo de Equipa - Capturar a Bandeira', description: 'Clássico jogo de estratégia e trabalho em equipa no campo.', category: 'sport', instructions: '2 equipas. Campo dividido ao meio. Objetivo: capturar a bandeira adversária.', video_url: '', image_url: '', materials: ['2 Bandeiras', 'Cones para delimitar', 'Coletes diferenciadores'], duration_minutes: 60, difficulty: 'medium', created_by: 'demo-director', created_at: '', updated_at: '' },
  { id: 'a6', title: 'Cinema ao Ar Livre', description: 'Sessão de cinema ou documentário projetado no exterior.', category: 'indoor', instructions: 'Preparar projetor e ecrã. Distribuir pipocas. Escolher filme adequado à faixa etária.', video_url: '', image_url: '', materials: ['Projetor', 'Ecrã', 'Pipocas', 'Cobertores'], duration_minutes: 120, difficulty: 'easy', created_by: 'demo-director', created_at: '', updated_at: '' },
];

const CATEGORY_CONFIG: Record<ActivityCategory, { label: string; emoji: string; color: string }> = {
  outdoor: { label: 'Outdoor', emoji: '🏕️', color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  indoor: { label: 'Indoor', emoji: '🏠', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  craft: { label: 'Artesanato', emoji: '🎨', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  sport: { label: 'Desporto', emoji: '⚽', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
};

const DIFFICULTY_CONFIG: Record<ActivityDifficulty, { label: string; color: string }> = {
  easy: { label: 'Fácil', color: 'text-green-400' },
  medium: { label: 'Médio', color: 'text-yellow-400' },
  hard: { label: 'Difícil', color: 'text-red-400' },
};

export default function Activities() {
  const { user, isDirector } = useAuth();
  const [, setLocation] = useLocation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<ActivityCategory | 'all'>('all');
  const [selected, setSelected] = useState<Activity | null>(null);
  const [showForm, setShowForm] = useState(false);

  // New activity form
  const [form, setForm] = useState({ title: '', description: '', category: 'outdoor' as ActivityCategory, instructions: '', materials: '', duration: '60', difficulty: 'medium' as ActivityDifficulty });

  const isDemo = !import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => { loadActivities(); }, []);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      if (isDemo) {
        const stored = localStorage.getItem('gecko_activities');
        setActivities(stored ? JSON.parse(stored) : DEMO_ACTIVITIES);
        if (!stored) localStorage.setItem('gecko_activities', JSON.stringify(DEMO_ACTIVITIES));
      } else {
        const { data } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
        if (data) setActivities(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveToStorage = (updated: Activity[]) => {
    if (isDemo) localStorage.setItem('gecko_activities', JSON.stringify(updated));
  };

  const createActivity = async () => {
    if (!form.title.trim()) return toast.error('Título obrigatório');
    const newA: Activity = {
      id: nanoid(),
      title: form.title,
      description: form.description,
      category: form.category,
      instructions: form.instructions,
      materials: form.materials ? form.materials.split(',').map(m => m.trim()).filter(Boolean) : [],
      duration_minutes: parseInt(form.duration) || 60,
      difficulty: form.difficulty,
      created_by: user?.id || 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!isDemo) {
      const { data, error } = await supabase.from('activities').insert({ ...newA }).select().single();
      if (error) return toast.error(error.message);
      newA.id = data.id;
    }
    const updated = [newA, ...activities];
    setActivities(updated); saveToStorage(updated);
    setForm({ title: '', description: '', category: 'outdoor', instructions: '', materials: '', duration: '60', difficulty: 'medium' });
    setShowForm(false);
    toast.success('Atividade criada! 🎉');
  };

  const deleteActivity = async (id: string) => {
    if (!confirm('Apagar esta atividade?')) return;
    if (!isDemo) await supabase.from('activities').delete().eq('id', id);
    const updated = activities.filter(a => a.id !== id);
    setActivities(updated); saveToStorage(updated);
    if (selected?.id === id) setSelected(null);
    toast.success('Atividade apagada');
  };

  const filtered = activities.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || a.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setLocation('/')} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-foreground text-lg flex-1">📚 Biblioteca de Atividades</h1>
          {isDirector() && (
            <button onClick={() => setShowForm(true)} className="gecko-btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Nova
            </button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
        {/* Search + Filters */}
        <div className="space-y-2 animate-slide-up">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar atividades..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'outdoor', 'indoor', 'craft', 'sport'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  filterCat === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {cat === 'all' ? '🔍 Todas' : `${CATEGORY_CONFIG[cat].emoji} ${CATEGORY_CONFIG[cat].label}`}
              </button>
            ))}
          </div>
        </div>

        {/* New Activity Form */}
        {showForm && isDirector() && (
          <div className="gecko-card border-primary/40 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground">Nova Atividade</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título" className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição" rows={2} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ActivityCategory }))} className="px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="outdoor">🏕️ Outdoor</option>
                  <option value="indoor">🏠 Indoor</option>
                  <option value="craft">🎨 Artesanato</option>
                  <option value="sport">⚽ Desporto</option>
                </select>
                <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as ActivityDifficulty }))} className="px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="easy">✅ Fácil</option>
                  <option value="medium">⚠️ Médio</option>
                  <option value="hard">🔴 Difícil</option>
                </select>
              </div>
              <input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} type="number" placeholder="Duração (minutos)" className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input value={form.materials} onChange={e => setForm(f => ({ ...f, materials: e.target.value }))} placeholder="Materiais (separados por vírgula)" className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Instruções" rows={3} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              <div className="flex gap-2">
                <button onClick={createActivity} className="gecko-btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"><Save className="w-4 h-4" /> Criar</button>
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted transition-colors">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Activity Detail Modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
            <div className="gecko-card w-full max-w-lg max-h-[80vh] overflow-y-auto border-primary/40" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className={`gecko-badge border mb-2 ${CATEGORY_CONFIG[selected.category].color}`}>
                    {CATEGORY_CONFIG[selected.category].emoji} {CATEGORY_CONFIG[selected.category].label}
                  </div>
                  <h2 className="font-bold text-foreground text-xl">{selected.title}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground flex-shrink-0"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">⏱️ <span className="text-foreground font-medium">{selected.duration_minutes}min</span></span>
                  <span className={`font-medium ${DIFFICULTY_CONFIG[selected.difficulty].color}`}>{DIFFICULTY_CONFIG[selected.difficulty].label}</span>
                </div>
                {selected.materials?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Materiais</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.materials.map((m, i) => <span key={i} className="gecko-badge bg-muted text-foreground border border-border">{m}</span>)}
                    </div>
                  </div>
                )}
                {selected.instructions && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Instruções</p>
                    <p className="text-sm text-foreground whitespace-pre-line">{selected.instructions}</p>
                  </div>
                )}
                {isDirector() && (
                  <button onClick={() => { deleteActivity(selected.id); setSelected(null); }} className="w-full py-2 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/10 transition-colors flex items-center justify-center gap-1.5">
                    <Trash2 className="w-4 h-4" /> Apagar Atividade
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Activities Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="gecko-card text-center py-10">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-muted-foreground">Nenhuma atividade encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((a, i) => {
              const cat = CATEGORY_CONFIG[a.category];
              const diff = DIFFICULTY_CONFIG[a.difficulty];
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className="gecko-card text-left hover:border-primary/50 transition-all animate-slide-up group"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`gecko-badge border text-[10px] ${cat.color}`}>{cat.emoji} {cat.label}</span>
                    <span className={`text-[10px] font-semibold ${diff.color}`}>{diff.label}</span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">{a.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">⏱️ {a.duration_minutes}min</p>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">{filtered.length} atividade{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}
