"use client";

import { useState, useRef, useEffect } from "react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";
import { BGPattern } from "@/components/ui/bg-pattern";
import { ArrowUpIcon, PanelLeft, Plus, X } from "lucide-react";

const BLUE = "#38BDF8";
const SESSIONS_KEY = "expense-chat-sessions";
const MAX_SESSIONS = 20;

interface Message {
  role: "user" | "assistant";
  content: string;
  tool_calls?: Array<{ tool: string; input: Record<string, unknown> }>;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

// ── Inline markdown renderer ─────────────────────────────────────────────────

function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m: RegExpExecArray | null, idx = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0], k = `${keyPrefix}-${idx++}`;
    if (tok.startsWith('`'))
      parts.push(<code key={k} style={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8', padding: '0.15em 0.35em', borderRadius: 4, fontSize: '0.82em', fontFamily: 'var(--font-mono)' }}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('**'))
      parts.push(<strong key={k} style={{ color: 'var(--text-main)', fontWeight: 600 }}>{tok.slice(2, -2)}</strong>);
    else
      parts.push(<em key={k} style={{ fontStyle: 'italic', color: 'var(--text-sec)' }}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let listType: 'ul' | 'ol' | null = null;
  const listItems: React.ReactNode[] = [];

  const flushList = (key: string) => {
    if (!listItems.length) return;
    const items = [...listItems];
    listItems.length = 0;
    if (listType === 'ul') {
      elements.push(<ul key={key} style={{ paddingLeft: '1.25rem', margin: '0.4rem 0', listStyleType: 'disc' }}>{items}</ul>);
    } else {
      elements.push(<ol key={key} style={{ paddingLeft: '1.25rem', margin: '0.4rem 0', listStyleType: 'decimal' }}>{items}</ol>);
    }
    listType = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      flushList(`fl-${i}`);
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
      elements.push(
        <pre key={`cb-${i}`} style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)', borderRadius: 8, padding: '0.875rem 1rem', margin: '0.6rem 0', overflowX: 'auto', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1', lineHeight: 1.6 }}>
          {lang && <span style={{ display: 'block', color: 'rgba(56,189,248,0.45)', fontSize: '0.68rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang}</span>}
          {code.join('\n')}
        </pre>
      );
      i++; continue;
    }

    // Horizontal rule
    if (/^-{3,}$|^\*{3,}$/.test(line.trim())) {
      flushList(`fl-${i}`);
      elements.push(<hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid var(--borderline)', margin: '0.75rem 0' }} />);
      i++; continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    if (h3) { flushList(`fl-${i}`); elements.push(<h3 key={`h3-${i}`} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', margin: '0.9rem 0 0.2rem' }}>{parseInline(h3[1], `h3-${i}`)}</h3>); i++; continue; }
    const h2 = line.match(/^## (.+)/);
    if (h2) { flushList(`fl-${i}`); elements.push(<h2 key={`h2-${i}`} style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: '1rem 0 0.25rem' }}>{parseInline(h2[1], `h2-${i}`)}</h2>); i++; continue; }
    const h1 = line.match(/^# (.+)/);
    if (h1) { flushList(`fl-${i}`); elements.push(<h1 key={`h1-${i}`} style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '1rem 0 0.35rem' }}>{parseInline(h1[1], `h1-${i}`)}</h1>); i++; continue; }

    // Unordered list
    const ulM = line.match(/^[-*+] (.+)/);
    if (ulM) {
      if (listType !== 'ul') { flushList(`fl-${i}`); listType = 'ul'; }
      listItems.push(<li key={`li-${i}`} style={{ color: 'var(--text-sec)', margin: '0.1rem 0', lineHeight: 1.6 }}>{parseInline(ulM[1], `li-${i}`)}</li>);
      i++; continue;
    }

    // Ordered list
    const olM = line.match(/^\d+\. (.+)/);
    if (olM) {
      if (listType !== 'ol') { flushList(`fl-${i}`); listType = 'ol'; }
      listItems.push(<li key={`li-${i}`} style={{ color: 'var(--text-sec)', margin: '0.1rem 0', lineHeight: 1.6 }}>{parseInline(olM[1], `li-${i}`)}</li>);
      i++; continue;
    }

    flushList(`fl-${i}`);

    // Empty line
    if (!line.trim()) {
      if (elements.length > 0) elements.push(<div key={`sp-${i}`} style={{ height: '0.4rem' }} />);
      i++; continue;
    }

    // Paragraph
    elements.push(<p key={`p-${i}`} style={{ margin: '0.1rem 0', color: 'var(--text-sec)', lineHeight: 1.7 }}>{parseInline(line, `p-${i}`)}</p>);
    i++;
  }
  flushList('fl-end');

  return <div>{elements}</div>;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function QueryPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSIONS_KEY);
      if (stored) setSessions(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
  };

  const loadSession = (s: ChatSession) => {
    setMessages(s.messages);
    setCurrentSessionId(s.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)); } catch {}
    if (currentSessionId === id) startNewChat();
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts), now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    const capturedSessionId = currentSessionId;
    const prevMsgs = messages;

    setInput("");
    setMessages([...prevMsgs, { role: "user", content: userMessage }, { role: "assistant", content: "", tool_calls: [] }]);
    setLoading(true);

    let streamedContent = "";
    const streamedToolCalls: Array<{ tool: string; input: Record<string, unknown> }> = [];

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as { type: string; content?: string; tool?: string; error?: string };
            if (event.type === "text_delta" && event.content) {
              streamedContent += event.content;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") updated[updated.length - 1] = { ...last, content: last.content + event.content };
                return updated;
              });
            } else if (event.type === "tool_call" && event.tool) {
              streamedToolCalls.push({ tool: event.tool, input: {} });
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") updated[updated.length - 1] = { ...last, tool_calls: [...(last.tool_calls || []), { tool: event.tool!, input: {} }] };
                return updated;
              });
            } else if (event.type === "error") {
              streamedContent = `Error: ${event.error}`;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") updated[updated.length - 1] = { ...last, content: `Error: ${event.error}` };
                return updated;
              });
            }
          } catch { /* skip malformed line */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      streamedContent = `Error: ${msg}`;
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.content) updated[updated.length - 1] = { ...last, content: `Error: ${msg}` };
        return updated;
      });
    }

    // Save session to localStorage
    const finalMsgs: Message[] = [
      ...prevMsgs,
      { role: "user", content: userMessage },
      { role: "assistant", content: streamedContent, tool_calls: streamedToolCalls },
    ];
    if (finalMsgs.length >= 2) {
      const title = userMessage.slice(0, 60);
      setSessions(currentSessions => {
        const existing = capturedSessionId ? currentSessions.find(s => s.id === capturedSessionId) : null;
        let updated: ChatSession[];
        if (existing) {
          updated = currentSessions.map(s => s.id === capturedSessionId ? { ...s, messages: finalMsgs, updatedAt: Date.now() } : s);
        } else {
          const newId = `${Date.now()}`;
          setCurrentSessionId(newId);
          updated = [{ id: newId, title, messages: finalMsgs, updatedAt: Date.now() }, ...currentSessions].slice(0, MAX_SESSIONS);
        }
        try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
    }

    setLoading(false);
  };

  const suggestions = [
    "Who are the top 5 spenders this quarter?",
    "Show me all policy violations",
    "Are there any suspicious split charges?",
    "What's the budget status for Engineering?",
    "Compare marketing vs engineering spend on software",
    "Generate a report for Alice Chen's SF offsite",
  ];

  return (
    <div
      className="page-transition relative"
      style={{ display: 'flex', height: 'calc(100vh - 3.5rem)', background: 'var(--bg)', overflow: 'hidden' }}
    >
      <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.03)" />

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div style={{
        width: sidebarOpen ? 256 : 0,
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        borderRight: sidebarOpen ? '1px solid var(--borderline)' : 'none',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ width: 256, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* New Chat */}
          <div style={{ padding: '0.875rem', borderBottom: '1px solid var(--borderline)' }}>
            <button
              onClick={startNewChat}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--accent-primary-dim)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, color: BLUE, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', transition: 'background 0.15s', justifyContent: 'center' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary-dim)'; }}
            >
              <Plus size={12} />
              NEW_CHAT
            </button>
          </div>

          {/* Session list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {sessions.length === 0 ? (
              <p style={{ color: 'var(--text-sec)', fontSize: '0.68rem', textAlign: 'center', marginTop: '2rem', fontFamily: 'var(--font-mono)', opacity: 0.45 }}>NO_HISTORY</p>
            ) : sessions.map(s => (
              <div
                key={s.id}
                onClick={() => loadSession(s)}
                style={{
                  padding: '0.55rem 0.7rem',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginBottom: '0.2rem',
                  background: currentSessionId === s.id ? 'rgba(56,189,248,0.08)' : 'transparent',
                  border: `1px solid ${currentSessionId === s.id ? 'rgba(56,189,248,0.2)' : 'transparent'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (currentSessionId !== s.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (currentSessionId !== s.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.1rem' }}>{s.title}</p>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-sec)', fontFamily: 'var(--font-mono)', opacity: 0.55 }}>{formatDate(s.updatedAt)}</p>
                </div>
                <button
                  onClick={e => deleteSession(s.id, e)}
                  style={{ flexShrink: 0, padding: '0.2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sec)', opacity: 0.35, borderRadius: 4, display: 'flex', transition: 'opacity 0.12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.35'; }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Footer count */}
          <div style={{ padding: '0.6rem', borderTop: '1px solid var(--borderline)' }}>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-sec)', fontFamily: 'var(--font-mono)', opacity: 0.35, textAlign: 'center' }}>
              {sessions.length}/{MAX_SESSIONS} SESSIONS
            </p>
          </div>
        </div>
      </div>

      {/* ── Main chat column ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          className="px-6 py-5 border-b flex items-center justify-between relative"
          style={{ borderColor: "var(--borderline)", background: "var(--surface)", flexShrink: 0 }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: sidebarOpen ? 'var(--accent-primary-dim)' : 'transparent',
                border: `1px solid ${sidebarOpen ? 'rgba(56,189,248,0.3)' : 'var(--borderline)'}`,
                borderRadius: 8, cursor: 'pointer',
                color: sidebarOpen ? BLUE : 'var(--text-sec)',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              <PanelLeft size={15} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-px w-4" style={{ background: "var(--accent-primary)", opacity: 0.5 }} />
                <span className="mono-label" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>BRIM_CHALLENGE // FEATURE_01</span>
              </div>
              <h1 className="text-lg tracking-tight" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>Talk to Your Data</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="mono-label hidden sm:block" style={{ color: "var(--accent-green)" }}>MULTI-TURN REASONING</span>
            <span className="mono-label flex items-center gap-1.5" style={{ color: loading ? "var(--accent-amber)" : "var(--accent-green)" }}>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: loading ? "var(--accent-amber)" : "var(--accent-green)", boxShadow: loading ? "0 0 6px var(--accent-amber)" : "0 0 6px var(--accent-green)" }}
              />
              {loading ? "PROCESSING" : "READY"}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full stagger-children">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="h-px w-8" style={{ background: "var(--accent-primary)", opacity: 0.4 }} />
                <span className="mono-label" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>BRIM_CHALLENGE // FEATURE_01</span>
                <div className="h-px w-8" style={{ background: "var(--accent-primary)", opacity: 0.4 }} />
              </div>
              <h2 className="text-h2 mb-3 text-center" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>Ask me anything.</h2>
              <p className="text-body mb-10 text-center max-w-lg">
                Query transactions in plain English. I handle follow-ups and reason across departments, time periods, and categories.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-[var(--borderline)] border border-[var(--borderline)] max-w-2xl w-full">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="text-left p-4 text-sm transition-all duration-300 cursor-pointer group relative overflow-hidden"
                    style={{ background: "var(--surface)", color: "var(--text-sec)" }}
                    onClick={() => setInput(s)}
                  >
                    <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
                    <span className="mono-label block mb-1" style={{ color: "var(--accent-primary)", opacity: 0.6 }}>QUERY_{String(i).padStart(2, "0")}</span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex mb-5 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}>
              <div
                className={`chat-bubble ${msg.role}`}
                style={msg.role === "assistant" ? { whiteSpace: 'normal' } : {}}
              >
                {msg.role === "assistant" && (
                  <span className="mono-label block mb-2">CLAUDE_RESPONSE</span>
                )}

                {/* Inline typing indicator or content */}
                {msg.role === "assistant" && msg.content === "" && loading && i === messages.length - 1 ? (
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '0.1rem 0' }}>
                    {[0, 1, 2].map(dot => (
                      <span
                        key={dot}
                        className="animate-bounce"
                        style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: 'var(--text-sec)',
                          display: 'inline-block',
                          animationDelay: `${dot * 0.15}s`,
                          animationDuration: '0.9s',
                        }}
                      />
                    ))}
                  </div>
                ) : msg.role === "assistant" ? (
                  <MarkdownContent content={msg.content} />
                ) : (
                  msg.content
                )}

                {msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--borderline)" }}>
                    <span className="mono-label" style={{ color: "var(--accent-green)" }}>
                      TOOLS_INVOKED: {msg.tool_calls.map(tc => tc.tool).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4" style={{ background: "var(--surface)", borderTop: "1px solid var(--borderline)", flexShrink: 0 }}>
          <PromptInput
            value={input}
            onValueChange={setInput}
            onSubmit={sendMessage}
            isLoading={loading}
            className="max-w-4xl mx-auto"
          >
            <PromptInputTextarea
              placeholder="Ask about transactions, compliance, budgets, anomalies..."
              className="px-4 py-3"
            />
            <PromptInputActions className="px-4 pb-3 pt-1 justify-end">
              <PromptInputAction tooltip="Send message">
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: loading || !input.trim() ? "rgba(255,255,255,0.08)" : BLUE,
                    color: loading || !input.trim() ? "rgba(255,255,255,0.25)" : "#000",
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                    boxShadow: loading || !input.trim() ? "none" : `0 0 16px rgba(56,189,248,0.4)`,
                  }}
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-[1.5px] rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "transparent" }} />
                  ) : (
                    <ArrowUpIcon className="w-4 h-4" />
                  )}
                </button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
          <p className="text-center mt-3 mono-label" style={{ color: "var(--text-sec)", fontSize: "0.65rem" }}>
            Powered by Claude API · Multi-step reasoning · Agentic workflows
          </p>
        </div>
      </div>
    </div>
  );
}
