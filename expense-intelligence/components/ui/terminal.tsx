"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TerminalLine {
  text: string;
  type: "command" | "output" | "info" | "error" | "success";
}

interface TerminalProps {
  // Static animated mode
  commands?: string[];
  outputs?: Record<number, string[]>;
  typingSpeed?: number;
  delayBetweenCommands?: number;
  // Live mode — renders lines as-is without animation
  lines?: TerminalLine[];
  // Shared
  title?: string;
  className?: string;
  minHeight?: number | string;
  maxHeight?: number | string;
}

// ─── Colour map ───────────────────────────────────────────────────────────────
const LINE_COLORS: Record<TerminalLine["type"], string> = {
  command: "#38BDF8",
  output:  "rgba(255,255,255,0.55)",
  info:    "rgba(255,255,255,0.35)",
  success: "#22C55E",
  error:   "#F87171",
};

// ─── Static animated Terminal ─────────────────────────────────────────────────
function StaticTerminal({
  commands,
  outputs = {},
  typingSpeed = 45,
  delayBetweenCommands = 1000,
  title,
  minHeight,
  maxHeight,
}: Pick<TerminalProps, "commands" | "outputs" | "typingSpeed" | "delayBetweenCommands" | "title" | "minHeight" | "maxHeight">) {
  const cmds = commands ?? [];
  const [cmdIndex, setCmdIndex]   = useState(0);
  const [typed, setTyped]         = useState("");
  const [phase, setPhase]         = useState<"typing" | "output" | "pause" | "done">("typing");
  const [outIndex, setOutIndex]   = useState(0);
  const [committed, setCommitted] = useState<TerminalLine[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [committed, typed]);

  // Typing phase
  useEffect(() => {
    if (phase !== "typing" || cmdIndex >= cmds.length) return;
    const cmd = cmds[cmdIndex];
    if (typed.length < cmd.length) {
      const t = setTimeout(() => setTyped(cmd.slice(0, typed.length + 1)), typingSpeed);
      return () => clearTimeout(t);
    }
    // Command fully typed → move to output phase
    const t = setTimeout(() => {
      setCommitted((prev) => [...prev, { text: `$ ${cmd}`, type: "command" }]);
      setTyped("");
      setOutIndex(0);
      setPhase((outputs[cmdIndex]?.length ?? 0) > 0 ? "output" : "pause");
    }, typingSpeed * 2);
    return () => clearTimeout(t);
  }, [phase, typed, cmdIndex, cmds, typingSpeed, outputs]);

  // Output phase — show one line at a time
  useEffect(() => {
    if (phase !== "output") return;
    const lines = outputs[cmdIndex] ?? [];
    if (outIndex < lines.length) {
      const t = setTimeout(() => {
        setCommitted((prev) => [...prev, { text: lines[outIndex], type: "output" }]);
        setOutIndex((i) => i + 1);
      }, 80);
      return () => clearTimeout(t);
    }
    // All output shown → pause
    const t = setTimeout(() => setPhase("pause"), 200);
    return () => clearTimeout(t);
  }, [phase, outIndex, cmdIndex, outputs]);

  // Pause → next command
  useEffect(() => {
    if (phase !== "pause") return;
    const t = setTimeout(() => {
      if (cmdIndex + 1 < cmds.length) {
        setCmdIndex((i) => i + 1);
        setPhase("typing");
      } else {
        setPhase("done");
      }
    }, delayBetweenCommands);
    return () => clearTimeout(t);
  }, [phase, cmdIndex, cmds.length, delayBetweenCommands]);

  const currentCmd = phase === "typing" && cmdIndex < cmds.length ? `$ ${typed}` : null;

  return (
    <TerminalShell title={title} minHeight={minHeight} maxHeight={maxHeight}>
      {committed.map((line, i) => (
        <div key={i} style={{ color: LINE_COLORS[line.type] }}>{line.text}</div>
      ))}
      {currentCmd !== null && (
        <div style={{ color: LINE_COLORS.command }}>
          {currentCmd}
          <span
            className="inline-block w-[7px] h-[14px] ml-[2px] align-middle"
            style={{
              background: "#38BDF8",
              opacity: 0.9,
              animation: "cursor-blink 1s step-end infinite",
            }}
          />
        </div>
      )}
      {phase === "done" && (
        <div className="mt-1" style={{ color: "#22C55E" }}>
          <span
            className="inline-block w-[7px] h-[14px] ml-[2px] align-middle"
            style={{
              background: "#22C55E",
              opacity: 0.9,
              animation: "cursor-blink 1s step-end infinite",
            }}
          />
        </div>
      )}
      <div ref={bottomRef} />
    </TerminalShell>
  );
}

// ─── Live Terminal (no animation, just renders lines) ─────────────────────────
function LiveTerminal({
  lines,
  title,
  minHeight,
  maxHeight,
}: Pick<TerminalProps, "lines" | "title" | "minHeight" | "maxHeight">) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <TerminalShell title={title} minHeight={minHeight} maxHeight={maxHeight}>
      {(lines ?? []).map((line, i) => (
        <div key={i} style={{ color: LINE_COLORS[line.type] }}>{line.text}</div>
      ))}
      <div
        className="inline-block w-[7px] h-[14px] mt-1 align-middle"
        style={{
          background: "#38BDF8",
          opacity: 0.8,
          animation: "cursor-blink 1s step-end infinite",
        }}
      />
      <div ref={bottomRef} />
    </TerminalShell>
  );
}

// ─── Shell (shared chrome) ────────────────────────────────────────────────────
function TerminalShell({
  title,
  minHeight,
  maxHeight,
  children,
}: {
  title?: string;
  minHeight?: number | string;
  maxHeight?: number | string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(5,7,15,0.95)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div className="flex gap-1.5">
          {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: c, opacity: 0.4 }}
            />
          ))}
        </div>
        {title && (
          <span
            className="ml-2 text-[10px] font-mono uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            {title}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#38BDF8", boxShadow: "0 0 6px #38BDF8" }} />
          <span className="text-[10px] font-mono" style={{ color: "rgba(56,189,248,0.5)" }}>LIVE</span>
        </div>
      </div>
      {/* Body */}
      <div
        className="p-5 font-mono text-[12px] leading-relaxed overflow-y-auto"
        style={{
          minHeight: minHeight ?? 240,
          maxHeight: maxHeight ?? "60vh",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export function Terminal(props: TerminalProps) {
  if (props.lines !== undefined) {
    return (
      <LiveTerminal
        lines={props.lines}
        title={props.title}
        minHeight={props.minHeight}
        maxHeight={props.maxHeight}
      />
    );
  }
  return (
    <StaticTerminal
      commands={props.commands}
      outputs={props.outputs}
      typingSpeed={props.typingSpeed}
      delayBetweenCommands={props.delayBetweenCommands}
      title={props.title}
      minHeight={props.minHeight}
      maxHeight={props.maxHeight}
    />
  );
}
