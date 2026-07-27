// client/src/components/Chat.tsx
import { useState, useEffect, useRef } from 'react';
import { X, Send, Lock, Users, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Message, GeckoUser } from '@/types';

interface Props {
  onClose: () => void;
}

type ChatTab = 'global' | 'private';

export default function Chat({ onClose }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<ChatTab>('global');
  const [messages, setMessages] = useState<Message[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [directors, setDirectors] = useState<GeckoUser[]>([]);
  const [admins, setAdmins] = useState<GeckoUser[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canSeePrivate = user?.role === 'admin' || user?.role === 'director';
  const canDelete = user?.role === 'admin' || user?.role === 'director';

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, privateMessages]);

  // Load messages + subscribe to realtime
  useEffect(() => {
    if (!user) return;
    loadMessages();
    loadPrivatePartners();

    // Realtime subscription
    const channel = supabase
      .channel('chat-global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `camp_id=eq.${user.camp_id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (!newMsg.is_private) {
            setMessages((prev) => [...prev, newMsg]);
          } else if (
            newMsg.sender_id === user.id ||
            newMsg.receiver_id === user.id
          ) {
            setPrivateMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const id = payload.old.id;
          setMessages((prev) => prev.filter((m) => m.id !== id));
          setPrivateMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadMessages = async () => {
    if (!user?.camp_id) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      // Global messages
      const { data: global } = await supabase
        .from('messages')
        .select('*, sender:sender_id(id, name, role, avatar_url)')
        .eq('camp_id', user.camp_id)
        .eq('is_private', false)
        .order('created_at', { ascending: true })
        .limit(100);

      setMessages(global || []);

      // Private messages (admin↔director only)
      if (canSeePrivate) {
        const { data: priv } = await supabase
          .from('messages')
          .select('*, sender:sender_id(id, name, role, avatar_url)')
          .eq('is_private', true)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: true })
          .limit(100);

        setPrivateMessages(priv || []);
      }
    } catch {
      toast.error('Erro ao carregar mensagens');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPrivatePartners = async () => {
    if (!canSeePrivate || !user?.camp_id) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, role, avatar_url')
        .eq('camp_id', user.camp_id)
        .in('role', ['admin', 'director'])
        .neq('id', user.id);

      if (data) {
        setDirectors(data.filter((u) => u.role === 'director') as GeckoUser[]);
        setAdmins(data.filter((u) => u.role === 'admin') as GeckoUser[]);
      }
    } catch {}
  };

  const sendMessage = async () => {
    if (!msg.trim() || !user?.camp_id) return;

    const isPrivate = tab === 'private';

    // For private, find the other party
    let receiverId: string | undefined;
    if (isPrivate) {
      const partners = [...directors, ...admins];
      if (partners.length === 0) {
        toast.error('Nenhum director/admin disponível para chat privado');
        return;
      }
      receiverId = partners[0].id; // first available partner
    }

    const optimistic: Message = {
      id: crypto.randomUUID(),
      camp_id: user.camp_id,
      sender_id: user.id,
      sender: user as GeckoUser,
      receiver_id: receiverId,
      content: msg.trim(),
      is_private: isPrivate,
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    if (isPrivate) {
      setPrivateMessages((prev) => [...prev, optimistic]);
    } else {
      setMessages((prev) => [...prev, optimistic]);
    }
    setMsg('');

    const { error } = await supabase.from('messages').insert({
      camp_id: user.camp_id,
      sender_id: user.id,
      receiver_id: receiverId ?? null,
      content: optimistic.content,
      is_private: isPrivate,
    });

    if (error) {
      toast.error('Erro ao enviar mensagem');
      // Rollback optimistic
      if (isPrivate) {
        setPrivateMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    }
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) toast.error('Erro ao apagar mensagem');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeMessages = tab === 'global' ? messages : privateMessages;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const avatarColor = (name: string) => {
    const colors = ['bg-green-600', 'bg-blue-600', 'bg-purple-600', 'bg-yellow-600', 'bg-red-600', 'bg-pink-600'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-card border-t border-border rounded-t-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            💬 Chat da Equipa
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs (só para admin/director) */}
        {canSeePrivate && (
          <div className="flex gap-1 px-4 pt-3 pb-1 flex-shrink-0">
            <button
              onClick={() => setTab('global')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'global'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Equipa
            </button>
            <button
              onClick={() => setTab('private')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'private'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Privado
            </button>
          </div>
        )}

        {/* Private tab info */}
        {tab === 'private' && canSeePrivate && (
          <div className="mx-4 mt-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex-shrink-0">
            <p className="text-xs text-yellow-400 font-medium">
              🔒 Chat privado entre Admin e Director — apenas visível para vocês
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-2xl animate-bounce">🦎</span>
            </div>
          ) : activeMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <span className="text-3xl">💬</span>
              <p className="text-sm text-muted-foreground">
                {tab === 'global'
                  ? 'Nenhuma mensagem ainda. Começa a conversa!'
                  : 'Nenhuma mensagem privada ainda.'}
              </p>
            </div>
          ) : (
            activeMessages.map((m) => {
              const isOwn = m.sender_id === user?.id;
              const senderName = (m.sender as GeckoUser)?.name ?? 'Utilizador';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  {!isOwn && (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(senderName)}`}
                    >
                      {getInitials(senderName)}
                    </div>
                  )}

                  <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    {!isOwn && (
                      <span className="text-[10px] text-muted-foreground px-1">{senderName}</span>
                    )}
                    <div className="flex items-end gap-1 group">
                      {/* Delete button (director/admin) */}
                      {canDelete && (
                        <button
                          onClick={() => deleteMessage(m.id)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/20 text-red-400 ${isOwn ? 'order-first' : 'order-last'}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-muted text-foreground rounded-tl-sm'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">
                      {formatTime(m.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              tab === 'private'
                ? '🔒 Mensagem privada...'
                : 'Escreve uma mensagem...'
            }
            className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={sendMessage}
            disabled={!msg.trim()}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
