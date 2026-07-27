import { useState, useEffect } from 'react';
import { X, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { AppNotification, NotificationType } from '@/types';

interface Props {
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

const TYPE_STYLES: Record<NotificationType, { bg: string; border: string; icon: string }> = {
  info:           { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    icon: 'ℹ️' },
  warning:        { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  icon: '⚠️' },
  success:        { bg: 'bg-green-500/10',   border: 'border-green-500/30',   icon: '✅' },
  error:          { bg: 'bg-red-500/10',     border: 'border-red-500/30',     icon: '❌' },
  chat:           { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  icon: '💬' },
  schedule:       { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    icon: '📅' },
  activity:       { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  icon: '🏕️' },
  director_alert: { bg: 'bg-red-500/15',     border: 'border-red-500/50',     icon: '📢' },
};

export default function NotificationsPanel({ onClose, onUnreadChange }: Props) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    // Realtime: novas notificações entram automaticamente
    const channel = supabase
      .channel(`notif-panel-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          setNotifications((prev) => [n, ...prev]);
          onUnreadChange?.((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Atualizar badge quando notificações mudam
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    onUnreadChange?.(unread);
  }, [notifications]);

  const loadNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications(data || []);
    } catch {
      toast.error('Erro ao carregar notificações');
    } finally {
      setIsLoading(false);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
    toast.success('Notificações limpas');
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins}min`;
    if (hours < 24) return `há ${hours}h`;
    return `há ${days}d`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="border-b border-border bg-card shadow-lg animate-in slide-in-from-top-2 duration-200">
      <div className="container mx-auto px-4 py-3 max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notificações
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-red-400"
                title="Limpar todas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <span className="text-2xl animate-bounce">🦎</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Sem notificações</p>
            </div>
          ) : (
            notifications.map((n) => {
              const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.info;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`rounded-xl p-3 border cursor-pointer transition-all group relative
                    ${n.read ? 'border-border bg-muted/20 opacity-70' : `${style.border} ${style.bg}`}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-base flex-shrink-0 mt-0.5">{style.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatTime(n.created_at)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-red-400 text-muted-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {/* Unread dot */}
                  {!n.read && (
                    <div className="absolute top-3 right-8 w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
