import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent } from "react";
import { Sparkles, ArrowUp, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import type { Filing } from "@/lib/filingsClient";

/**
 * FactSheetChat v2 — refined ChatGPT-style conversational interface.
 *
 * Save as:  calendar-app/src/components/FactSheetChat.tsx (overwrite)
 *
 * Design notes:
 *   - Inline styles only (no Tailwind dependency).
 *   - Empty state: 4 suggested question cards in a 2x2 grid.
 *   - Active state: scrollable message thread with rounded bubbles.
 *   - Input: pill-shaped floating input with circular send button
 *     anchored inside on the right.
 *   - Cmd/Ctrl+Enter to send. Plain Enter sends too.
 *   - "Reset" button to clear conversation appears once messages exist.
 *   - Mobile-first responsive (single column suggestions on narrow).
 */

const COLORS = {
  bg: "#0a0d10",
  bgCard: "#131820",
  bgCard2: "#181f28",
  bgInput: "#0f141a",
  fg: "#e4e6e8",
  fgMuted: "#8b9099",
  fgDim: "#5b6068",
  primary: "#03c8b5",
  primaryFg: "#001512",
  gold: "#c8a45c",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
};

const FONTS = {
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '"Barlow", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", "SF Mono", Consolas, monospace',
};

const SUGGESTED_QUESTIONS = [
  "What's the offering size and price range?",
  "Who are the lead underwriters?",
  "What are the top three risks?",
  "What's the use of proceeds?",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FactSheetChatProps {
  filing: Filing;
}

export default function FactSheetChat({ filing }: FactSheetChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message / loading state
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-resize the textarea up to a cap
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 140) + "px";
    }
  }, [input]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filing, messages: newMessages }),
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
    } catch (e: any) {
      console.error("[FactSheetChat] error:", e);
      setError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter to send, Shift+Enter for newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function reset() {
    setMessages([]);
    setError(null);
    setInput("");
  }

  const hasMessages = messages.length > 0;

  return (
    <section
      style={{
        borderTop: `1px solid ${COLORS.border}`,
        background: "rgba(19,24,32,0.35)",
        padding: "64px 0 80px 0",
      }}
    >
      <div style={containerStyle}>
        {/* ── Header ───────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: COLORS.primary,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              <Sparkles size={12} style={{ opacity: 0.85 }} />
              Ask the analyst
            </div>
            <h2
              style={{
                fontFamily: FONTS.serif,
                fontWeight: 400,
                fontSize: "clamp(24px, 2.6vw, 36px)",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                color: COLORS.fg,
                margin: 0,
              }}
            >
              Questions about{" "}
              <em style={{ color: COLORS.primary, fontStyle: "italic" }}>
                {filing.companyName}
              </em>
              ?
            </h2>
            <p
              style={{
                fontFamily: FONTS.sans,
                fontSize: "14px",
                color: COLORS.fgMuted,
                maxWidth: "560px",
                lineHeight: 1.7,
                margin: "12px 0 0 0",
                fontWeight: 300,
              }}
            >
              Grounded primarily in the S-1 filing. External context is cited
              when used. AI-generated; no investment advice.
            </p>
          </div>
          {hasMessages ? (
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: `1px solid ${COLORS.border}`,
                padding: "8px 14px",
                borderRadius: "2px",
                fontFamily: FONTS.mono,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: COLORS.fgMuted,
                cursor: "pointer",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.fg)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = COLORS.fgMuted)
              }
            >
              <RotateCcw size={11} />
              New conversation
            </button>
          ) : null}
        </div>

        {/* ── Chat window ───────────────────────────────────────── */}
        <div
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "12px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxWidth: "880px",
            margin: "0 auto",
          }}
        >
          {/* Messages area */}
          <div
            ref={scrollRef}
            style={{
              minHeight: hasMessages ? "320px" : "260px",
              maxHeight: "560px",
              overflowY: "auto",
              padding: "32px 28px",
            }}
          >
            {hasMessages ? (
              <>
                {messages.map((m, i) => (
                  <MessageBubble key={i} message={m} />
                ))}
                {loading ? <LoadingBubble /> : null}
              </>
            ) : (
              <EmptyState
                companyName={filing.companyName}
                onPick={(q) => send(q)}
                disabled={loading}
              />
            )}

            {error ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  marginTop: hasMessages ? "16px" : "0",
                  padding: "12px 14px",
                  border: `1px solid ${COLORS.gold}55`,
                  background: `${COLORS.gold}15`,
                  borderRadius: "6px",
                }}
              >
                <AlertCircle
                  size={14}
                  color={COLORS.gold}
                  style={{ marginTop: "2px", flexShrink: 0 }}
                />
                <span
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: "13px",
                    color: COLORS.gold,
                  }}
                >
                  {error}
                </span>
              </div>
            ) : null}
          </div>

          {/* Input bar */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "16px 20px 20px 20px",
              borderTop: `1px solid ${COLORS.borderSubtle}`,
              background: "rgba(15,20,26,0.6)",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "flex-end",
                gap: "0",
                background: COLORS.bgInput,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "24px",
                padding: "6px 6px 6px 18px",
                transition: "border-color 0.15s",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder={`Ask about ${filing.companyName}…`}
                rows={1}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontFamily: FONTS.sans,
                  fontSize: "15px",
                  fontWeight: 300,
                  color: COLORS.fg,
                  padding: "10px 0",
                  lineHeight: 1.5,
                  minHeight: "24px",
                  maxHeight: "140px",
                  overflowY: "auto",
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: input.trim() && !loading ? COLORS.primary : COLORS.bgCard2,
                  color: input.trim() && !loading ? COLORS.primaryFg : COLORS.fgDim,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
              >
                {loading ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <ArrowUp size={16} strokeWidth={2.5} />
                )}
              </button>
            </div>
            <div
              style={{
                marginTop: "10px",
                fontFamily: FONTS.mono,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: COLORS.fgDim,
                textAlign: "center",
              }}
            >
              Powered by Claude · Answers may be inaccurate · Not investment advice
            </div>
          </form>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .factsheet-chip:hover {
          background: rgba(3, 200, 181, 0.06) !important;
          border-color: rgba(3, 200, 181, 0.35) !important;
          color: #e4e6e8 !important;
        }
        .factsheet-chat-scroll::-webkit-scrollbar { width: 6px; }
        .factsheet-chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
      `}</style>
    </section>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function EmptyState({
  companyName,
  onPick,
  disabled,
}: {
  companyName: string;
  onPick: (q: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(3, 200, 181, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={15} color={COLORS.primary} />
        </div>
        <div>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: "15px",
              color: COLORS.fg,
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            Hi — I'm the IPO Radar analyst.
          </div>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: "13.5px",
              color: COLORS.fgMuted,
              lineHeight: 1.6,
              fontWeight: 300,
              marginTop: "2px",
            }}
          >
            Ask me anything about {companyName} or its filing.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "10px",
        }}
        className="suggested-grid"
      >
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            className="factsheet-chip"
            onClick={() => onPick(q)}
            disabled={disabled}
            style={{
              textAlign: "left",
              padding: "14px 16px",
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "10px",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              fontFamily: FONTS.sans,
              fontSize: "13.5px",
              color: "rgba(228,230,232,0.8)",
              lineHeight: 1.5,
              fontWeight: 300,
              transition: "all 0.15s",
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .suggested-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "78%",
            padding: "10px 16px",
            background: COLORS.primary,
            color: COLORS.primaryFg,
            borderRadius: "18px 18px 4px 18px",
            fontFamily: FONTS.sans,
            fontSize: "14.5px",
            lineHeight: 1.55,
            fontWeight: 400,
            whiteSpace: "pre-wrap",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          background: "rgba(3, 200, 181, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        <Sparkles size={13} color={COLORS.primary} />
      </div>
      <div
        style={{
          flex: 1,
          fontFamily: FONTS.sans,
          fontSize: "14.5px",
          color: COLORS.fg,
          lineHeight: 1.7,
          fontWeight: 300,
          whiteSpace: "pre-wrap",
          paddingTop: "4px",
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          background: "rgba(3, 200, 181, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        <Sparkles size={13} color={COLORS.primary} />
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          paddingTop: "10px",
        }}
      >
        <span className="dot" style={dotStyle(0)} />
        <span className="dot" style={dotStyle(0.15)} />
        <span className="dot" style={dotStyle(0.3)} />
        <style>{`
          .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${COLORS.fgMuted};
            display: inline-block;
            animation: pulseDot 1.2s ease-in-out infinite;
          }
          @keyframes pulseDot {
            0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
            30% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}

function dotStyle(delay: number): CSSProperties {
  return {
    animationDelay: `${delay}s`,
  };
}

const containerStyle: CSSProperties = {
  maxWidth: "1180px",
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: "32px",
  paddingRight: "32px",
};
