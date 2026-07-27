import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { AppNotification, NotificationType, GeckoUser } from '@/types';

interface UseNotificationManagerProps {
  user: GeckoUser | null;
  onNewNotification?: (n: AppNotification) => void;
}

export function useNotificationManager({ user, onNewNotification }: UseNotificationManagerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentRef = useRef<Set<string>>(new Set());

  // ── Pedir permissão browser ──────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const p = await Notification.requestPermission();
      return p === 'granted';
    }
    return false;
  }, []);

  // ── Enviar notificação (browser + toast) ─────────────────
  const sendBrowserNotification = useCallback((title: string, body: string, type: NotificationType) => {
    const icons: Record<string, string> = {
      warning: '⚠️', success: '✅', error: '❌',
      chat: '💬', schedule: '📅', activity: '🏕️',
      director_alert: '📢', info: 'ℹ️',
    };
    const icon = icons[type] ?? 'ℹ️';

    if (Notification.permission === 'granted') {
      new Notification(`${icon} ${title}`, { body, tag: title });
    }

    // Toast com estilo por tipo
    const toastFn =
      type === 'success' ? toast.success :
      type === 'error' ? toast.error :
      type === 'warning' || type === 'director_alert' ? toast.warning :
      toast.info;

    toastFn(`${icon} ${title}`, { description: body, duration: 8000 });
  }, []);

  // ── Criar notificação na DB (para um user específico) ────
  const createNotification = useCallback(async (
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    extras?: { schedule_id?: string; time_slot_id?: string; camp_id?: string }
  ) => {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      camp_id: extras?.camp_id ?? user?.camp_id,
      schedule_id: extras?.schedule_id,
      time_slot_id: extras?.time_slot_id,
      read: false,
    });
  }, [user]);

  // ── Notificar todos os monitores do camp ─────────────────
  const notifyAllMonitors = useCallback(async (
    title: string,
    message: string,
    type: NotificationType,
    extras?: { schedule_id?: string; time_slot_id?: string }
  ) => {
    if (!user?.camp_id) return;
    const { data: monitors } = await supabase
      .from('users')
      .select('id')
      .eq('camp_id', user.camp_id)
      .eq('role', 'monitor');

    if (!monitors) return;
    const inserts = monitors.map((m) => ({
      user_id: m.id,
      title,
      message,
      type,
      camp_id: user.camp_id,
      schedule_id: extras?.schedule_id ?? null,
      time_slot_id: extras?.time_slot_id ?? null,
      read: false,
    }));
    await supabase.from('notifications').insert(inserts);
  }, [user]);

  // ── Notificar director do camp ───────────────────────────
  const notifyDirector = useCallback(async (
    title: string,
    message: string,
    type: NotificationType,
    extras?: { schedule_id?: string; time_slot_id?: string }
  ) => {
    if (!user?.camp_id) return;
    const { data: directors } = await supabase
      .from('users')
      .select('id')
      .eq('camp_id', user.camp_id)
      .eq('role', 'director');

    if (!directors) return;
    const inserts = directors.map((d) => ({
      user_id: d.id,
      title,
      message,
      type,
      camp_id: user.camp_id,
      schedule_id: extras?.schedule_id ?? null,
      time_slot_id: extras?.time_slot_id ?? null,
      read: false,
    }));
    await supabase.from('notifications').insert(inserts);
  }, [user]);

  // ── Verificar time slots e disparar 10min antes ──────────
  const checkUpcomingSlots = useCallback(async () => {
    if (!user?.camp_id) return;

    const today = new Date().toISOString().split('T')[0];
    const { data: schedules } = await supabase
      .from('schedules')
      .select('id, time_slots(*)')
      .eq('camp_id', user.camp_id)
      .eq('date', today);

    if (!schedules) return;

    const now = new Date();
    const in10 = new Date(now.getTime() + 10 * 60 * 1000);

    for (const schedule of schedules) {
      const slots = (schedule.time_slots as any[]) ?? [];
      for (const slot of slots) {
        if (slot.completed) continue;

        const [h, m] = slot.time.split(':').map(Number);
        const slotDate = new Date();
        slotDate.setHours(h, m, 0, 0);

        // Janela: entre agora e +10min
        const key = `slot-${slot.id}`;
        if (slotDate > now && slotDate <= in10 && !sentRef.current.has(key)) {
          sentRef.current.add(key);

          const isAssigned = slot.assignees?.includes(user.name) ||
                             slot.assignees?.includes(user.id);

          if (isAssigned) {
            // Notificação destacada para o responsável
            sendBrowserNotification(
              `⭐ És responsável: ${slot.title}`,
              `Começa às ${slot.time} — ${slot.description}`,
              'warning'
            );
            await createNotification(
              user.id,
              `⭐ És responsável: ${slot.title}`,
              `Começa às ${slot.time} — ${slot.description}`,
              'warning',
              { schedule_id: schedule.id, time_slot_id: slot.id }
            );
          } else {
            // Notificação normal para todos
            sendBrowserNotification(
              `⏰ Em 10 min: ${slot.title}`,
              `Às ${slot.time} — ${slot.description}`,
              'info'
            );
            await createNotification(
              user.id,
              `⏰ Em 10 min: ${slot.title}`,
              `Às ${slot.time} — ${slot.description}`,
              'info',
              { schedule_id: schedule.id, time_slot_id: slot.id }
            );
          }
        }
      }
    }
  }, [user, sendBrowserNotification, createNotification]);

  // ── Iniciar intervalo de verificação ────────────────────
  useEffect(() => {
    if (!user) return;
    requestPermission();

    // Verificar imediatamente e depois a cada minuto
    checkUpcomingSlots();
    intervalRef.current = setInterval(checkUpcomingSlots, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, checkUpcomingSlots, requestPermission]);

  // ── Realtime: ouvir notificações novas na DB ─────────────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
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
          onNewNotification?.(n);
          // Mostrar toast para notificações vindas de outros (não as que criámos nós)
          sendBrowserNotification(n.title, n.message, n.type);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, onNewNotification, sendBrowserNotification]);

  return {
    notifyAllMonitors,
    notifyDirector,
    createNotification,
    sendBrowserNotification,
  };
}
