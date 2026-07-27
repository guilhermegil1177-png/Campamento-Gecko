// client/src/pages/Protocols.tsx
import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Shield, AlertTriangle, BookOpen, Trash2, Edit3, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Protocol } from '@/types';

type Category = 'all' | 'safety' | 'emergency' | 'routine' | 'general';

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string; border: string }> = {
  safety:    { label: 'Segurança',   icon: <Shield className="w-3.5 h-3.5" />,        color: 'bg-blue-500/10 text-blue-400',    border: 'border-blue-500/30' },
  emergency: { label: 'Emergência',  icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'bg-red-500/10 text-red-400',      border: 'border-red-500/30' },
  routine:   { label: 'Rotina',      icon: <BookOpen className="w-3.5 h-3.5" />,      color: 'bg-green-500/10 text-green-400',  border: 'border-green-500/30' },
  general:   { label: 'Geral',       icon: <FileText className="w-3.5 h-3.5" />,      color: 'bg-muted text-muted-foreground',  border: 'border-border' },
};

interface ProtocolFormData {
  title: string;
  content: string;
  category: 'safety' | 'emergency' | 'routine' | 'general';
}

const EMPTY_FORM: ProtocolFormData = { title: '', content: '', category: 'general' };

export default function Protocols() {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProtocolFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'director';

  useEffect(() => {
    loadProtocols();
  }, [user]);

  const loadProtocols = async () => {
    if (!user?.camp_id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('protocols')
        .select('*, created_by_user:created_by(name)')
        .eq('camp_id', user.camp_id)
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProtocols(data || []);
    } catch {
      toast.error('Erro ao carregar protocolos');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p: Protocol) => {
    setForm({ title: p.title, content: p.content, category: p.category });
    setEditingId(p.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const saveProtocol = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }
    if (!user?.camp_id) return;
    setIsSaving(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('protocols')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
        setProtocols((prev) =>
          prev.map((p) => (p.id === editingId ? { ...p, ...form } : p))
        );
        toast.success('Protocolo atualizado ✅');
      } else {
        const { data, error } = await supabase
          .from('protocols')
          .insert({
            ...form,
            camp_id: user.camp_id,
            created_by: user.id,
          })
          .select('*, created_by_user:created_by(name)')
          .single();
        if (error) throw error;
        setProtocols((prev) => [data, ...prev]);
        toast.success('Protocolo criado ✅');
      }
      closeForm();
    } catch {
      toast.error('Erro ao guardar protocolo');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProtocol = async (id: string) => {
    if (!confirm('Tens a certeza que queres apagar este protocolo?')) return;
    const { error } = await supabase.from('protocols').delete().eq('id', id);
    if (error) { toast.error('Erro ao apagar'); return; }
    setProtocols((prev) => prev.filter((p) => p.id !== id));
    toast.success('Protocolo apagado');
  };

  // Filtros
  const filtered = protocols.filter((p) => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const counts: Record<string, number> = { all: protocols.length };
  protocols.forEach((p) => { counts[p.category] = (counts[p.category] ?? 0) + 1; });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              📋 Protocolos
            </h1>
            <p className="text-xs text-muted-foreground">{protocols.length} protocolo{protocols.length !== 1 ? 's' : ''}</p>
          </div>
          {canEdit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Novo
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar protocolos..."
            className="w-full bg-muted rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'safety', 'emergency', 'routine', 'general'] as Category[]).map((cat) => {
            const meta = cat === 'all' ? null : CATEGORY_META[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {meta?.icon}
                {cat === 'all' ? 'Todos' : meta?.label}
                <span className={`text-[10px] px-1 rounded-full ${isActive ? 'bg-white/20' : 'bg-background'}`}>
                  {counts[cat] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <span className="text-4xl animate-bounce">🦎</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <span className="text-4xl">📋</span>
            <p className="text-muted-foreground text-sm">
              {search ? 'Nenhum protocolo encontrado' : 'Ainda não há protocolos'}
            </p>
            {canEdit && !search && (
              <button onClick={openCreate} className="text-primary text-sm font-semibold hover:underline">
                Criar o primeiro protocolo
              </button>
            )}
          </div>
        ) : (
          filtered.map((p) => {
            const meta = CATEGORY_META[p.category];
            const isExpanded = expandedId === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border bg-card transition-all ${meta.border}`}
              >
                {/* Protocol header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-xl ${meta.color} flex-shrink-0`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm leading-tight">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${meta.color} ${meta.border}`}>
                          {meta.label}
                        </span>
                        {(p as any).created_by_user?.name && (
                          <span className="text-[10px] text-muted-foreground">
                            por {(p as any).created_by_user.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canEdit && (
                      <>
                        <span
                          onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </span>
                        <span
                          onClick={(e) => { e.stopPropagation(); deleteProtocol(p.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                      </>
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {p.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-3">
                      Atualizado: {new Date(p.updated_at).toLocaleDateString('pt-PT', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm">
          <div className="bg-card border-t border-border rounded-t-2xl w-full max-h-[90vh] flex flex-col">
            {/* Form header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <h2 className="font-bold text-foreground">
                {editingId ? '✏️ Editar Protocolo' : '➕ Novo Protocolo'}
              </h2>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Título *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Protocolo de Emergência Médica"
                  className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Categoria *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['safety', 'emergency', 'routine', 'general'] as const).map((cat) => {
                    const meta = CATEGORY_META[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setForm((f) => ({ ...f, category: cat }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          form.category === cat
                            ? `${meta.color} ${meta.border}`
                            : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'
                        }`}
                      >
                        {meta.icon} {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Conteúdo *
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Descreve o protocolo em detalhe..."
                  rows={8}
                  className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Form footer */}
            <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
              <button
                onClick={closeForm}
                className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveProtocol}
                disabled={isSaving || !form.title.trim() || !form.content.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <span className="animate-spin">🦎</span>
                ) : (
                  <><Save className="w-4 h-4" /> Guardar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
