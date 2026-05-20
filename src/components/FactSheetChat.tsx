import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Loader2, AlertCircle } from "lucide-react";
import type { Filing } from "@/lib/filingsClient";

/**
 * FactSheetChat — conversational Q&A box for a single fact sheet.
 *
 * Save as:  calendar-app/src/components/FactSheetChat.tsx
 *
 * Flow:
 *   1. User types a question.
 *   2. Component POSTs { filing, messages } to /api/chat (the Vercel
 *      serverless function in api/chat.ts).
 *   3. Claude answers using the filing data + general knowledge,
 *      always citing source type.
 *   4. Message rendered in the chat thread.
 *
 * UX:
 *   - 3 suggested starter questions to lower the blank-page barrier.
 *   - Compact, capped height. Scrolls when conversation gets long.
 *   - Loading spinner while waiting for Claude.
 *   - Error toast inline on failure.
 *   - "New conversation" button to reset.
 */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FactSheetChatProps {
  filing: Filing;
}

const SUGGESTED_QUESTIONS = [
  "What's the offering size?",
  "Who are the lead underwriters?",
  "What are the top risks?",
  "What's the use of proceeds?",
];

export default function FactSheetChat({ filing }: FactSheetChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const newUserMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, newUserMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filing, messages: nextMessages }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody?.detail || errBody?.error || `HTTP ${res.status}`,
        );
      }

      const data = await res.json();
      const reply = (data?.reply ?? "").toString();
      if (!reply) throw new Error("Empty response from chat service");

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      console.error("[FactSheetChat] error:", err);
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function reset() {
    setMessages([]);
    setError(null);
    setInput("");
  }

  return (
    <section className="border-t border-border/60 bg-card/30 py-14">
      <div className="container max-w-3xl">
        {/* Header */}
        <div className="flex items-end justify-between gap-6 mb-6 flex-wrap">
          <div>
            <div
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary mb-3 inline-flex items-center gap-2"
            >
              <Sparkles className="w-3 h-3 opacity-80" />
              Ask the analyst
            </div>
            <h2
              className="text-foreground"
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontWeight: 400,
                fontSize: "clamp(24px, 2.4vw, 36px)",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              Questions about{" "}
              <em style={{ color: "var(--primary)" }}>{filing.companyName}</em>?
            </h2>
            <p className="text-[14px] text-muted-foreground max-w-xl font-light leading-[1.7] mt-2">
              Grounded primarily in the S-1 filing. External context is cited
              when used. AI-generated; no investment advice.
            </p>
          </div>
          {messages.length > 0 ? (
            <button
              onClick={reset}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
            >
              New conversation
            </button>
          ) : null}
        </div>

        {/* Chat window */}
        <div
          className="bg-card border border-border/60 overflow-hidden flex flex-col"
          style={{ borderRadius: "4px", maxHeight: "560px" }}
        >
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-background/40">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/25" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/25" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/25" />
            </div>
            <span className="ml-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
              IPO Radar AI · Analyst Chat
            </span>
            <span className="ml-auto px-2 py-0.5 bg-primary/10 text-primary font-mono text-[9px] tracking-[0.16em] uppercase" style={{ borderRadius: "2px" }}>
              Live
            </span>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-5 space-y-4"
            style={{ minHeight: "220px" }}
          >
            {messages.length === 0 ? (
              <div>
                <p className="text-[13px] text-muted-foreground mb-4">
                  Try one of these to get started:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={loading}
                      className="px-3 py-2 text-[12px] text-foreground/85 bg-background/50 border border-border/60 hover:border-primary/40 hover:text-foreground transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderRadius: "2px" }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))
            )}

            {loading ? (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                </div>
                <div
                  className="px-3.5 py-2.5 bg-muted text-foreground text-[13.5px] flex items-center gap-2"
                  style={{ borderRadius: "6px" }}
                >
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Thinking…</span>
                </div>
              </div>
            ) : null}

            {error ? (
              <div
                className="flex items-start gap-2 px-3 py-2 border border-[#c8a45c]/40 bg-[#c8a45c]/10"
                style={{ borderRadius: "4px" }}
              >
                <AlertCircle className="w-3.5 h-3.5 text-[#c8a45c] mt-0.5 shrink-0" />
                <span className="text-[12px] text-[#c8a45c]">{error}</span>
              </div>
            ) : null}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-border/40 bg-background/40 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder={`Ask about ${filing.companyName}…`}
                className="flex-1 px-3 py-2.5 bg-card border border-border/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 text-[13.5px] disabled:opacity-50"
                style={{ borderRadius: "4px" }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderRadius: "4px" }}
                aria-label="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Disclaimer */}
        <p className="mt-3 font-mono text-[10px] text-muted-foreground/60 tracking-[0.12em] uppercase text-center">
          Powered by Claude · Answers may be inaccurate · Not investment advice
        </p>
      </div>
    </section>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-primary" />
        </div>
      ) : null}
      <div
        className={`max-w-[80%] px-3.5 py-2.5 text-[13.5px] leading-[1.65] whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
        style={{ borderRadius: "6px" }}
      >
        {message.content}
      </div>
      {isUser ? (
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3 h-3 text-secondary-foreground" />
        </div>
      ) : null}
    </div>
  );
}
