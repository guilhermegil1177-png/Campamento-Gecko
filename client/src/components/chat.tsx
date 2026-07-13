import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  from_name: string;
  text: string;
  time: string;
  mine: boolean;
}

const DEMO_MESSAGES: ChatMessage[] = [
  { id: '1', from_name: 'João Director', text: 'Bom dia equipa! Hoje é o grande dia de Pilones 🎉', time: '07:30', mine: false },
  { id: '2', from_name: 'Sofia Monitor', text: 'Prontos! Acampados já estão a despertar 💪', time: '07:52', mine: false },
];

export default function Chat({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const isDemo = !import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isDemo) {
      const stored = localStorage.getItem('gecko_chat');
      if (stored) setMessages(JSON.parse(stored));
      return;
    }
    // Supabase realtime subscription
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        setMessages(prev => [...prev, {
          id: msg.id,
          from_name: msg.sender_name,
          text: msg.content,
          time: new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          mine: msg.sender_id === user?.id,
        }]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const send = async () => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      from_name: user?.name || 'Tu',
      text,
      time: now,
      mine: true,
    };

    if (isDemo) {
      const updated = [...messages, newMsg];
      setMessages(updated);
      localStorage.setItem('gecko_chat', JSON.stringify(updated));
    } else {
      await supabase.from('messages').insert({
        content: text,
        sender_id: user?.id,
        sender_name: user?.name,
      });
    }
    setText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <div className="bg-card border-t border-border rounded-t-2xl flex flex-col" style={{ height: '75vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="font-bold text-foreground text-sm">💬 Chat da Equipa</p>
            <p className="text-xs text-muted-foreground">Equipa Gecko</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.mine ? 'items-end' : 'items-start'}`}>
              {!msg.mine && (
                <span className="text-[10px] text-muted-foreground mb-1 ml-1">{msg.from_name}</span>
              )}
              <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                msg.mine
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">{msg.time}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border flex gap-2 items-center">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Mensagem..."
            className="flex-1 px-4 py-2.5 rounded-full bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={send}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
