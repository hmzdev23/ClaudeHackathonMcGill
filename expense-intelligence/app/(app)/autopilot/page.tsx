"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ActionPlan, ActionItem, AgentStreamEvent } from "@/lib/claude/agent";

// ── Design tokens ─────────────────────────────────────────────────────────────
const SKY = "#38BDF8";
const GREEN = "#22C55E";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const ORANGE = "#F97316";

type Mode = "idle" | "scanning" | "briefing" | "executing" | "complete";

interface ToolStatus {
  name: string;
  label: string;
  status: "pending" | "running" | "done";
}

const TOOL_LABELS: Record<string, string> = {
  get_dashboard_kpis: "Dashboard KPIs",
  get_pending_approvals: "Pending Approvals",
  get_violations: "Policy Violations",
  detect_anomalies: "Anomaly Detection",
  get_budget_status: "Budget Health",
  query_transactions: "Transaction Data",
  get_employee_profile: "Employee Profiles",
  output_action_plan: "Building Action Plan",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: RED,
  high: ORANGE,
  medium: AMBER,
  low: "rgba(255,255,255,0.4)",
};

const ACTION_TYPE_LABEL: Record<string, string> = {
  approve_expense: "APPROVE",
  deny_expense: "DENY",
  budget_alert: "BUDGET",
  anomaly_alert: "ANOMALY",
  compliance_alert: "COMPLIANCE",
  vendor_opportunity: "VENDOR",
};

const ACTION_TYPE_COLOR: Record<string, string> = {
  approve_expense: GREEN,
  deny_expense: RED,
  budget_alert: AMBER,
  anomaly_alert: RED,
  compliance_alert: ORANGE,
  vendor_opportunity: SKY,
};

function fmtDollar(n?: number) {
  if (!n) return "";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Idle Scan Module Card ──────────────────────────────────────────────────────
function ModuleCard({ icon, label, sub, color }: { icon: string; label: string; sub: string; color: string }) {
  return (
    <div
      className="flex flex-col gap-1.5 p-4 rounded-xl transition-all duration-300 hover:border-white/15 cursor-default"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color, opacity: 0.8 }}>
        {label}
      </span>
      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        {sub}
      </span>
    </div>
  );
}

// ── Risk badge ────────────────────────────────────────────────────────────────
function RiskBadge({ level }: { level: ActionPlan["risk_level"] }) {
  const c = { low: GREEN, medium: AMBER, high: ORANGE, critical: RED }[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest rounded-md"
      style={{ background: `${c}15`, border: `1px solid ${c}40`, color: c }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-flex" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
      {level.toUpperCase()}
    </span>
  );
}

// ── Action card ───────────────────────────────────────────────────────────────
function ActionCard({
  action,
  selected,
  onToggle,
  executing,
  result,
}: {
  action: ActionItem;
  selected: boolean;
  onToggle: () => void;
  executing: boolean;
  result?: { success: boolean; acknowledged?: boolean };
}) {
  const typeColor = ACTION_TYPE_COLOR[action.type] || SKY;
  const priorityColor = PRIORITY_COLOR[action.priority] || "rgba(255,255,255,0.4)";
  const typeLabel = ACTION_TYPE_LABEL[action.type] || action.type.toUpperCase();

  let statusEl = null;
  if (executing && result === undefined) {
    statusEl = (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full inline-flex animate-pulse" style={{ background: SKY }} />
        <span className="text-[10px] font-mono" style={{ color: SKY }}>executing…</span>
      </div>
    );
  } else if (result) {
    statusEl = result.success ? (
      <span className="text-[10px] font-mono" style={{ color: GREEN }}>
        {result.acknowledged ? "✓ acknowledged" : "✓ done"}
      </span>
    ) : (
      <span className="text-[10px] font-mono" style={{ color: RED }}>✗ failed</span>
    );
  }

  const isDone = !!result;

  return (
    <div
      className="rounded-xl transition-all duration-300 overflow-hidden"
      style={{
        background: selected && !isDone
          ? `linear-gradient(135deg, rgba(${typeColor === GREEN ? "34,197,94" : typeColor === RED ? "239,68,68" : "56,189,248"},0.07) 0%, rgba(255,255,255,0.02) 100%)`
          : "rgba(255,255,255,0.025)",
        border: `1px solid ${selected && !isDone ? `${typeColor}35` : "rgba(255,255,255,0.07)"}`,
        opacity: isDone ? 0.65 : 1,
      }}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Checkbox (only for executable actions) */}
          {action.auto_executable && !isDone && (
            <button
              onClick={onToggle}
              className="mt-0.5 flex-shrink-0 w-4 h-4 rounded transition-all duration-150 cursor-pointer"
              style={{
                background: selected ? typeColor : "transparent",
                border: `1.5px solid ${selected ? typeColor : "rgba(255,255,255,0.2)"}`,
              }}
            >
              {selected && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mx-auto mt-px">
                  <path d="M1.5 5l2.5 2.5 4.5-4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )}
          {!action.auto_executable && !isDone && (
            <div className="mt-0.5 w-4 h-4 flex-shrink-0 rounded opacity-20" style={{ border: "1.5px solid rgba(255,255,255,0.2)" }} />
          )}
          {isDone && (
            <div className="mt-0.5 w-4 h-4 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: `${typeColor}18`, border: `1px solid ${typeColor}30`, color: typeColor }}
              >
                {typeLabel}
              </span>
              <span
                className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: `${priorityColor}15`, border: `1px solid ${priorityColor}25`, color: priorityColor }}
              >
                {action.priority}
              </span>
              {action.amount && (
                <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {fmtDollar(action.amount)}
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-white mb-1">{action.title}</p>

            <div className="flex items-center gap-3 flex-wrap mb-2">
              {action.employee && (
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>{action.employee}</span>
              )}
              {action.department && (
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{action.department}</span>
              )}
            </div>

            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              {action.reasoning}
            </p>
          </div>

          {statusEl && <div className="flex-shrink-0">{statusEl}</div>}
        </div>
      </div>

      {/* Bottom accent */}
      {selected && !isDone && (
        <div className="h-[1px]" style={{ background: `linear-gradient(to right, ${typeColor}60, transparent)` }} />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AutopilotPage() {
  const [mode, setMode] = useState<Mode>("idle");
  const [streamText, setStreamText] = useState("");
  const [toolStatuses, setToolStatuses] = useState<ToolStatus[]>([]);
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [executionResults, setExecutionResults] = useState<Record<string, { success: boolean; acknowledged?: boolean }>>({});
  const [executing, setExecuting] = useState(false);
  const [executionDone, setExecutionDone] = useState(false);
  const [idleStats, setIdleStats] = useState<{ approvals: number; violations: number; depts: number } | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load quick stats for idle screen
  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setIdleStats({
          approvals: d.kpis?.pending_approvals ?? 0,
          violations: d.kpis?.open_violations ?? 0,
          depts: d.budget_status?.length ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [streamText, toolStatuses]);

  const startAnalysis = useCallback(async () => {
    setMode("scanning");
    setStreamText("");
    setToolStatuses([]);
    setPlan(null);
    setSelected(new Set());
    setExecutionResults({});
    setExecutionDone(false);

    try {
      const res = await fetch("/api/autopilot", { method: "POST" });
      if (!res.ok || !res.body) throw new Error("Failed to connect");

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
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event: AgentStreamEvent = JSON.parse(trimmed);

            if (event.type === "text_delta" && event.content) {
              setStreamText((prev) => prev + event.content);
            } else if (event.type === "tool_call" && event.tool) {
              const toolName = event.tool;
              setToolStatuses((prev) => {
                const exists = prev.find((t) => t.name === toolName);
                if (exists) {
                  return prev.map((t) =>
                    t.name === toolName ? { ...t, status: "running" } : t
                  );
                }
                return [
                  ...prev.map((t) => (t.status === "running" ? { ...t, status: "done" as const } : t)),
                  {
                    name: toolName,
                    label: TOOL_LABELS[toolName] || toolName,
                    status: "running" as const,
                  },
                ];
              });
            } else if (event.type === "action_plan" && event.plan) {
              setToolStatuses((prev) =>
                prev.map((t) => ({ ...t, status: "done" as const }))
              );
              setPlan(event.plan);
              // Auto-select all executable actions
              const executableIds = event.plan.actions
                .filter((a) => a.auto_executable)
                .map((a) => a.id);
              setSelected(new Set(executableIds));
              setMode("briefing");
            } else if (event.type === "done") {
              setToolStatuses((prev) =>
                prev.map((t) => ({ ...t, status: "done" as const }))
              );
              if (!plan) setMode("briefing");
            } else if (event.type === "error") {
              setStreamText((prev) => prev + `\n\nError: ${event.error}`);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setStreamText((prev) => prev + `\n\nFailed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [plan]);

  const executeActions = useCallback(async () => {
    if (!plan) return;
    const actionsToExecute = plan.actions.filter((a) => selected.has(a.id));
    if (actionsToExecute.length === 0) return;

    setExecuting(true);
    setMode("executing");

    try {
      const res = await fetch("/api/autopilot/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: actionsToExecute }),
      });
      const data = await res.json();
      const resultMap: Record<string, { success: boolean; acknowledged?: boolean }> = {};
      for (const r of data.results || []) {
        resultMap[r.id] = { success: r.success, acknowledged: r.acknowledged };
      }
      setExecutionResults(resultMap);
      setExecutionDone(true);
      router.refresh();
    } catch {
      setExecutionDone(true);
    } finally {
      setExecuting(false);
    }
  }, [plan, selected, router]);

  const reset = useCallback(() => {
    setMode("idle");
    setPlan(null);
    setStreamText("");
    setToolStatuses([]);
    setSelected(new Set());
    setExecutionResults({});
    setExecutionDone(false);
  }, []);

  const executableCount = plan ? plan.actions.filter((a) => a.auto_executable && selected.has(a.id)).length : 0;
  const totalActions = plan?.actions.length ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen relative"
      style={{
        background: "var(--bg)",
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56,189,248,0.04) 0%, transparent 70%),
          linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 48px 48px, 48px 48px",
      }}
    >
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* ── IDLE ─────────────────────────────────────────────────────────── */}
        {mode === "idle" && (
          <div className="animate-fade-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-6" style={{ background: SKY, opacity: 0.5 }} />
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: SKY, opacity: 0.7 }}>
                ADVISORY_SYSTEM // BRIM FINANCIAL
              </span>
            </div>

            <div className="text-center mb-12">
              {/* Animated icon */}
              <div className="relative inline-flex mb-8">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.04))`,
                    border: `1px solid rgba(56,189,248,0.2)`,
                    boxShadow: `0 0 40px rgba(56,189,248,0.08)`,
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="6" stroke={SKY} strokeWidth="1.5" />
                    <circle cx="16" cy="16" r="11" stroke={SKY} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="2 3" />
                    <path d="M16 5v3M16 24v3M5 16h3M24 16h3" stroke={SKY} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
                    <path d="M22 10l-4 4M10 22l4-4" stroke={SKY} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.3" />
                  </svg>
                </div>
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                  style={{ background: GREEN, boxShadow: `0 0 8px ${GREEN}` }}
                />
              </div>

              <h1
                className="text-3xl font-semibold tracking-tight text-white mb-3"
                style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 500 }}
              >
                AI Financial Advisor
              </h1>
              <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                Claude will scan your entire expense dataset, analyze every pending decision, and deliver a prioritized action plan — in about 30 seconds.
              </p>
            </div>

            {/* Scan modules grid */}
            <div className="mb-10">
              <p className="text-[10px] font-mono uppercase tracking-widest mb-4 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                ANALYSIS MODULES
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <ModuleCard icon="⏳" label="Pending Approvals" sub={idleStats ? `${idleStats.approvals} waiting` : "Loading…"} color={SKY} />
                <ModuleCard icon="⚠️" label="Policy Violations" sub={idleStats ? `${idleStats.violations} open` : "Loading…"} color={ORANGE} />
                <ModuleCard icon="📊" label="Budget Health" sub={idleStats ? `${idleStats.depts} departments` : "Loading…"} color={AMBER} />
                <ModuleCard icon="🔍" label="Anomaly Detection" sub="fraud patterns" color={RED} />
                <ModuleCard icon="🧾" label="Compliance Scan" sub="policy rules" color="#A78BFA" />
                <ModuleCard icon="💡" label="Vendor Insights" sub="savings opps" color={GREEN} />
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <button
                onClick={startAnalysis}
                className="inline-flex items-center gap-3 px-8 py-4 text-sm font-semibold transition-all duration-300 hover:opacity-90 active:scale-[0.98] cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${SKY}, rgba(56,189,248,0.7))`,
                  color: "#000",
                  borderRadius: "14px",
                  boxShadow: `0 0 40px rgba(56,189,248,0.2), 0 4px 16px rgba(0,0,0,0.4)`,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1v7m0 0l3-3M8 8L5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
                </svg>
                Begin Analysis
                <span className="text-[10px] font-mono opacity-60">~30s</span>
              </button>
              <p className="text-[10px] font-mono mt-3" style={{ color: "rgba(255,255,255,0.2)" }}>
                Uses Claude API with multi-step tool calling
              </p>
            </div>
          </div>
        )}

        {/* ── SCANNING ─────────────────────────────────────────────────────── */}
        {mode === "scanning" && (
          <div className="animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: SKY, boxShadow: `0 0 8px ${SKY}` }} />
                <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: SKY }}>
                  ADVISORY_SYSTEM // SCANNING
                </span>
              </div>
              <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                Claude is analyzing your data…
              </span>
            </div>

            {/* Tool status tracker */}
            {toolStatuses.length > 0 && (
              <div
                className="mb-4 p-4 rounded-xl flex flex-wrap gap-2"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {toolStatuses.map((t) => (
                  <span
                    key={t.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all duration-300"
                    style={{
                      background:
                        t.status === "done"
                          ? "rgba(34,197,94,0.1)"
                          : t.status === "running"
                          ? "rgba(56,189,248,0.1)"
                          : "rgba(255,255,255,0.04)",
                      border: `1px solid ${
                        t.status === "done"
                          ? "rgba(34,197,94,0.3)"
                          : t.status === "running"
                          ? "rgba(56,189,248,0.3)"
                          : "rgba(255,255,255,0.08)"
                      }`,
                      color:
                        t.status === "done"
                          ? GREEN
                          : t.status === "running"
                          ? SKY
                          : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {t.status === "done" ? "✓" : t.status === "running" ? (
                      <span className="w-1 h-1 rounded-full inline-flex animate-pulse" style={{ background: SKY }} />
                    ) : "○"}
                    {t.label}
                  </span>
                ))}
              </div>
            )}

            {/* Terminal */}
            <div
              ref={terminalRef}
              className="rounded-xl p-5 font-mono text-[12px] leading-relaxed overflow-y-auto"
              style={{
                background: "rgba(5,7,15,0.9)",
                border: "1px solid rgba(255,255,255,0.07)",
                minHeight: "320px",
                maxHeight: "60vh",
                color: "rgba(255,255,255,0.65)",
                whiteSpace: "pre-wrap",
              }}
            >
              {streamText || (
                <span className="animate-pulse" style={{ color: SKY }}>
                  Initializing Claude advisory agent…
                </span>
              )}
              <span
                className="inline-block w-2 h-3.5 ml-0.5 align-middle animate-pulse"
                style={{ background: SKY, opacity: 0.8 }}
              />
            </div>
          </div>
        )}

        {/* ── BRIEFING ─────────────────────────────────────────────────────── */}
        {(mode === "briefing" || mode === "executing" || mode === "complete") && plan && (
          <div className="animate-fade-up">
            {/* Brief header */}
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px w-6" style={{ background: GREEN, opacity: 0.5 }} />
                  <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: GREEN, opacity: 0.8 }}>
                    ADVISORY BRIEF
                  </span>
                </div>
                <h2 className="text-2xl font-semibold text-white tracking-tight mb-2"
                  style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 500 }}>
                  {totalActions} Action{totalActions !== 1 ? "s" : ""} Identified
                </h2>
                <div className="flex items-center gap-3">
                  <RiskBadge level={plan.risk_level} />
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {plan.actions.filter((a) => a.auto_executable).length} auto-executable
                  </span>
                </div>
              </div>

              <button
                onClick={reset}
                className="flex-shrink-0 text-[11px] font-mono px-3 py-2 rounded-lg transition-all hover:bg-white/5 cursor-pointer"
                style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                ↺ Re-scan
              </button>
            </div>

            {/* Summary */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)" }}
            >
              <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: SKY, opacity: 0.7 }}>
                EXECUTIVE SUMMARY
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                {plan.summary}
              </p>
            </div>

            {/* Insights */}
            {plan.insights.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                  KEY FINDINGS
                </p>
                <div className="space-y-2">
                  {plan.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: SKY, opacity: 0.6 }} />
                      <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                  RECOMMENDED ACTIONS
                </p>
                {mode === "briefing" && plan.actions.filter((a) => a.auto_executable).length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const all = new Set(plan.actions.filter((a) => a.auto_executable).map((a) => a.id));
                        setSelected(all);
                      }}
                      className="text-[10px] font-mono px-2.5 py-1 rounded-lg cursor-pointer transition-all hover:bg-white/5"
                      style={{ color: SKY, border: `1px solid rgba(56,189,248,0.2)` }}
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => setSelected(new Set())}
                      className="text-[10px] font-mono px-2.5 py-1 rounded-lg cursor-pointer transition-all hover:bg-white/5"
                      style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {plan.actions.map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    selected={selected.has(action.id)}
                    onToggle={() => {
                      if (mode !== "briefing") return;
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(action.id)) next.delete(action.id);
                        else next.add(action.id);
                        return next;
                      });
                    }}
                    executing={mode === "executing"}
                    result={executionResults[action.id]}
                  />
                ))}
              </div>
            </div>

            {/* Execute bar */}
            {mode === "briefing" && (
              <div
                className="sticky bottom-6 rounded-2xl p-4 flex items-center justify-between gap-4"
                style={{
                  background: "rgba(9,11,20,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                }}
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {executableCount} action{executableCount !== 1 ? "s" : ""} selected
                  </p>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {executableCount > 0
                      ? "Claude will execute these automatically"
                      : "Select actions above to execute"}
                  </p>
                </div>

                <button
                  onClick={executeActions}
                  disabled={executableCount === 0}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: executableCount > 0 ? GREEN : "rgba(255,255,255,0.08)",
                    color: executableCount > 0 ? "#000" : "rgba(255,255,255,0.4)",
                    borderRadius: "12px",
                  }}
                >
                  Execute {executableCount > 0 ? executableCount : ""} Action{executableCount !== 1 ? "s" : ""}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}

            {/* Execution done */}
            {mode === "executing" && executionDone && (
              <div
                className="rounded-2xl p-6 text-center"
                style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(34,197,94,0.12)", border: `1px solid rgba(34,197,94,0.3)` }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10l4 4 8-8" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-white mb-1">Actions Executed</p>
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {Object.values(executionResults).filter((r) => r.success && !r.acknowledged).length} expense decision{
                    Object.values(executionResults).filter((r) => r.success && !r.acknowledged).length !== 1 ? "s" : ""
                  } applied. Dashboard updated.
                </p>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                >
                  Run another analysis
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
