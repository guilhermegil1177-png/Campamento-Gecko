import { X, Bell } from 'lucide-react';

interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
}

const DEMO_NOTIFS: Notification[] = [
  { id: '1', text: '📋 Cronograma de amanhã publicado', time: 'há 5min', read: false },
  { id: '2', text: '✅ Atividade "Desayuno" marcada como concluída', time: 'há 20min', read: false },
  { id: '3', text: '💬 João Director: "Bom trabalho equipa!"', time: 'há 1h', read: true },
  { id: '4', text: '📋 Cronograma do Dia 5 atualizado', time: 'ontem', read: true },
];

export default function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const unread = DEMO_NOTIFS.filter(n => !n.read);
  const read = DEMO_NOTIFS.filter(n => n.read);

  return (
    <div
      className="absolute top-14 right-3 z-50 w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Notificações</span>
          {unread.length > 0 && (
            <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">{unread.length}</span>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {unread.length > 0 && (
          <div>
            <p className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Novas</p>
            {unread.map(n => (
              <div key={n.id} className="px-4 py-2.5 border-b border-border/50 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                <p className="text-sm text-foreground">{n.text}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
              </div>
            ))}
          </div>
        )}

        {read.length > 0 && (
          <div>
            <p className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Anteriores</p>
            {read.map(n => (
              <div key={n.id} className="px-4 py-2.5 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                <p className="text-sm text-muted-foreground">{n.text}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{n.time}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
