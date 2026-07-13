import { X, Send } from 'lucide-react';
import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export default function Chat({ onClose }: Props) {
  const [msg, setMsg] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-card border-t border-border rounded-t-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-bold text-foreground flex items-center gap-2">💬 Chat da Equipa</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">Chat em desenvolvimento.<br />Em breve poderás comunicar com a equipa aqui.</p>
        </div>
        <div className="px-4 py-3 border-t border-border flex gap-2">
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="Escreve uma mensagem..."
            className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
