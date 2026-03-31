import { useState } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPPORT_REPLY =
  'This assistant is not connected to live support yet. For orders and account help, use Account in the app or contact support through your order details.';

const quickActions = ['Track order', 'Login help', 'Contact support', 'FAQ'];

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isBot: boolean }[]>([
    {
      text: 'Hi — Khudra Pasal assistant. Ask a question and we will point you to the right place in the app.',
      isBot: true,
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { text: input, isBot: false }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { text: SUPPORT_REPLY, isBot: true }]);
    }, 400);
  };

  const handleQuickAction = (action: string) => {
    setMessages((prev) => [...prev, { text: action, isBot: false }]);
    setTimeout(() => {
      setMessages((prev) => [...prev, { text: SUPPORT_REPLY, isBot: true }]);
    }, 400);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110',
          'bg-gradient-to-br from-primary to-pink-600 text-white',
          isOpen ? 'hidden' : 'flex',
        )}
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          right: '16px',
        }}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div
          className="fixed z-50 bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            right: '16px',
            width: 'min(380px, calc(100vw - 32px))',
            height: 'min(480px, calc(100vh - 120px))',
          }}
        >
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Help</h3>
                <p className="text-xs text-muted-foreground">In-app guidance</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn('flex', msg.isBot ? 'justify-start' : 'justify-end')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    msg.isBot ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground',
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => handleQuickAction(a)}
                  className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80"
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message…"
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={handleSend}
                className="p-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
