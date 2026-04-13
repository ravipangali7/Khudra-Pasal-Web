import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { websiteApi } from '@/lib/api';
import type { ProductAiContext } from '@/lib/salesAssistant';

export type AIChatbotProps = {
  /** When set (product page with loaded detail), opens with an AI pitch for this product. */
  productAiContext?: ProductAiContext | null;
  /** True while product detail is still fetching (product page only). */
  productDetailLoading?: boolean;
  onAddToCart?: () => void;
};

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
}

/** Map on-screen messages to Gemini history; re-injects the hidden first user prompt on product pages. */
function toApiMessages(
  displayMessages: ChatMessage[],
  productCtx: ProductAiContext | null | undefined,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!productCtx || displayMessages.length === 0) {
    return displayMessages.map((m) => ({ role: m.role, content: m.content }));
  }
  const first = displayMessages[0];
  if (first.role !== 'assistant') {
    return displayMessages.map((m) => ({ role: m.role, content: m.content }));
  }
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: productCtx.firstUserMessage },
    { role: 'assistant', content: first.content },
  ];
  for (let i = 1; i < displayMessages.length; i++) {
    const m = displayMessages[i];
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

const GENERAL_EMPTY_HINT =
  'Ask about shopping on Khudrapasal, delivery, or account help — or open a product page for a tailored sales pitch.';

function TypingDots() {
  return (
    <div className="flex justify-start" aria-hidden>
      <div className="rounded-2xl bg-muted px-4 py-3">
        <span className="inline-flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

const AIChatbot = ({
  productAiContext = null,
  productDetailLoading = false,
  onAddToCart,
}: AIChatbotProps) => {
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pitchDoneForProductRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pitchDoneForProductRef.current = null;
    setMessages([]);
    setError(null);
  }, [productAiContext?.productId]);

  useEffect(() => {
    if (!isOpen || !productAiContext) return;
    if (pitchDoneForProductRef.current === productAiContext.productId) return;

    let cancelled = false;
    (async () => {
      setIsTyping(true);
      setError(null);
      try {
        const { text } = await websiteApi.aiPitch({
          messages: [{ role: 'user', content: productAiContext.firstUserMessage }],
        });
        if (cancelled) return;
        setMessages([{ id: newId(), role: 'assistant', content: text }]);
        pitchDoneForProductRef.current = productAiContext.productId;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load AI pitch.');
        }
      } finally {
        if (!cancelled) setIsTyping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, productAiContext]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isTyping, isOpen]);

  const runFollowUp = useCallback(
    async (displayThread: ChatMessage[]) => {
      const payload = toApiMessages(displayThread, productAiContext);
      setIsTyping(true);
      setError(null);
      try {
        const { text } = await websiteApi.aiPitch({ messages: payload });
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: text }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Request failed.');
      } finally {
        setIsTyping(false);
      }
    },
    [productAiContext],
  );

  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t || isTyping) return;

    if (productDetailLoading) return;

    if (productAiContext && pitchDoneForProductRef.current !== productAiContext.productId) {
      return;
    }

    setInput('');
    const userMsg: ChatMessage = { id: newId(), role: 'user', content: t };
    const nextThread = [...messages, userMsg];
    setMessages(nextThread);
    void runFollowUp(nextThread);
  }, [
    input,
    isTyping,
    productDetailLoading,
    productAiContext,
    messages,
    runFollowUp,
  ]);

  const firstAssistantIndex = messages.findIndex((m) => m.role === 'assistant');
  const showAddToCart =
    Boolean(productAiContext && onAddToCart && firstAssistantIndex >= 0 && !productDetailLoading);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close chat"
        className={cn(
          'fixed inset-0 z-40 bg-black/45 transition-opacity duration-300 md:bg-black/35',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-in panel */}
      <aside
        id={titleId}
        aria-hidden={!isOpen}
        className={cn(
          'fixed top-0 right-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 ease-out md:w-[360px] md:max-w-[360px]',
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        )}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-foreground">Khudrapasal AI</h2>
              <p className="truncate text-xs text-muted-foreground">Sales assistant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {productDetailLoading && isOpen ? (
            <p className="text-sm text-muted-foreground">Loading product information…</p>
          ) : null}

          {!productAiContext && !productDetailLoading && messages.length === 0 && isOpen ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{GENERAL_EMPTY_HINT}</p>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {messages.map((msg, i) => (
            <div key={msg.id} className="space-y-2">
              <div className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  {msg.content}
                </div>
              </div>
              {showAddToCart && msg.role === 'assistant' && i === firstAssistantIndex ? (
                <div className="flex justify-start pl-0 md:pl-0">
                  <button
                    type="button"
                    onClick={onAddToCart}
                    className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    Add to Cart
                  </button>
                </div>
              ) : null}
            </div>
          ))}

          {isTyping ? <TypingDots /> : null}
        </div>

        <div className="shrink-0 border-t border-border p-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                productDetailLoading
                  ? 'Loading product…'
                  : productAiContext && pitchDoneForProductRef.current !== productAiContext.productId
                    ? 'Preparing pitch…'
                    : productAiContext
                      ? 'Ask a follow-up…'
                      : 'Type a message…'
              }
              disabled={
                isTyping ||
                productDetailLoading ||
                Boolean(productAiContext && pitchDoneForProductRef.current !== productAiContext.productId)
              }
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={
                isTyping ||
                !input.trim() ||
                productDetailLoading ||
                Boolean(productAiContext && pitchDoneForProductRef.current !== productAiContext.productId)
              }
              className="shrink-0 rounded-xl bg-primary px-3 py-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110',
          'bg-gradient-to-br from-primary to-amber-600 text-white',
        )}
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          right: '16px',
        }}
        aria-expanded={isOpen}
        aria-controls={titleId}
        aria-label={isOpen ? 'Close Khudrapasal AI' : 'Open Khudrapasal AI'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
};

export default AIChatbot;
