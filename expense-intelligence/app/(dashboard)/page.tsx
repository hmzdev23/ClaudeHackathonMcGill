"use client";

import { useEffect, useState } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";

interface DashboardKpis {
  total_spend_qtd: number;
  pending_approvals: number;
  open_violations: number;
  departments_over_80pct: number;
}

interface BudgetStatus {
  department: string;
  category: string;
  period: string;
  allocated: number;
  spent: number;
  remaining: number;
  percent_used: number;
  projected_end_of_period: number;
}

interface Violation {
  id: string;
  transaction_id: string;
  employee_id: string;
  violation_type: string;
  severity: string;
  description: string;
  detected_at: string;
  status: string;
}

interface DashboardData {
  kpis: DashboardKpis;
  recent_violations: Violation[];
  budget_status: BudgetStatus[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load dashboard");
    }
    setLoading(false);
  };

  const seedDatabase = async () => {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "GET" });
      await loadDashboard();
    } catch {
      console.error("Failed to seed");
    }
    setSeeding(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const isEmpty =
    data &&
    data.kpis.total_spend_qtd === 0 &&
    data.kpis.pending_approvals === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen relative" style={{ background: "var(--bg)" }}>
        <BGPattern variant="grid" mask="fade-edges" size={32} fill="rgba(255,255,255,0.03)" />
        <div className="text-center relative z-10">
          <div className="spinner mx-auto mb-4" style={{ borderTopColor: "var(--accent-gold)" }} />
          <span className="mono-label" style={{ color: "var(--accent-gold)", opacity: 0.6 }}>Loading system...</span>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-screen relative" style={{ background: "var(--bg)" }}>
        <BGPattern variant="grid" mask="fade-edges" size={32} fill="rgba(255,255,255,0.03)" />
        <div className="text-center max-w-md px-8 relative z-10">
          <div className="mb-10 flex items-center justify-center gap-3">
            <div className="h-px w-8" style={{ background: "var(--accent-gold)", opacity: 0.4 }} />
            <span className="mono-label" style={{ color: "var(--accent-gold)", opacity: 0.7 }}>BRIM_CHALLENGE // INITIALIZE</span>
            <div className="h-px w-8" style={{ background: "var(--accent-gold)", opacity: 0.4 }} />
          </div>
          <h1 className="text-h2 mb-4" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>System ready.</h1>
          <p className="text-body mb-10">
            Deploy 6 months of anonymized SMB transaction data (~50 employees,
            thousands of transactions) to activate the intelligence dashboard.
          </p>
          <button
            onClick={seedDatabase}
            disabled={seeding}
            id="seed-btn"
            className="inline-flex items-center gap-3 px-8 py-3.5 text-sm font-medium transition-all"
            style={{
              background: seeding ? "transparent" : "var(--accent-gold)",
              color: seeding ? "var(--text-sec)" : "#000",
              border: `1px solid ${seeding ? "var(--borderline)" : "var(--accent-gold)"}`,
              boxShadow: !seeding ? "0 0 30px rgba(245,158,11,0.25)" : undefined,
            }}
          >
            {seeding ? "Deploying..." : "Initialize Demo Data"}
            {!seeding && <span>&rarr;</span>}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    {
      tag: "SPEND_QTD",
      label: "Total Spend",
      value: `$${data.kpis.total_spend_qtd.toLocaleString()}`,
      accentColor: "#FBBF24",
      glowClass: "kpi-glow-gold",
      bgGlow: "rgba(245,158,11,0.06)",
    },
    {
      tag: "PENDING",
      label: "Pending Approvals",
      value: data.kpis.pending_approvals.toString(),
      accentColor: data.kpis.pending_approvals > 0 ? "#F59E0B" : "#22c55e",
      glowClass: data.kpis.pending_approvals > 0 ? "kpi-glow-gold" : "kpi-glow-green",
      bgGlow: data.kpis.pending_approvals > 0 ? "rgba(245,158,11,0.05)" : "rgba(34,197,94,0.04)",
    },
    {
      tag: "VIOLATIONS",
      label: "Open Violations",
      value: data.kpis.open_violations.toString(),
      accentColor: data.kpis.open_violations > 0 ? "#ef4444" : "#22c55e",
      glowClass: data.kpis.open_violations > 0 ? "kpi-glow-red" : "kpi-glow-green",
      bgGlow: data.kpis.open_violations > 0 ? "rgba(239,68,68,0.05)" : "rgba(34,197,94,0.04)",
    },
    {
      tag: "OVER_BUDGET",
      label: "Depts Over 80%",
      value: data.kpis.departments_over_80pct.toString(),
      accentColor: data.kpis.departments_over_80pct > 0 ? "#A78BFA" : "#22c55e",
      glowClass: data.kpis.departments_over_80pct > 0 ? "" : "kpi-glow-green",
      bgGlow: data.kpis.departments_over_80pct > 0 ? "rgba(139,92,246,0.05)" : "rgba(34,197,94,0.04)",
    },
  ];

  const totalBudgets = (data.budget_status || []).filter(
    (b) => b.category === "total"
  );

  const recentViolations = data.recent_violations || [];

  return (
    <div className="p-8 lg:p-12 max-w-[100rem] mx-auto relative">
      <BGPattern variant="grid" mask="fade-edges" size={32} fill="#1a1a1a" />

      {/* Header */}
      <div className="flex items-end justify-between mb-10 animate-fade-up relative z-10">
        <div>
          <div className="editorial-badge mb-5" style={{ color: "var(--accent-gold)", opacity: 0.7 }}>
            BRIM_CHALLENGE // DASHBOARD
          </div>
          <h1 className="text-h1" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>
            Expense
            <br />
            <span style={{ color: "var(--text-sec)", opacity: 0.35 }}>Intelligence.</span>
          </h1>
        </div>
        <button
          className="btn-ghost text-xs"
          onClick={seedDatabase}
          disabled={seeding}
        >
          {seeding ? "Seeding..." : "Re-initialize"}
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[var(--borderline)] border border-[var(--borderline)] mb-10 animate-fade-up delay-1 relative z-10">
        {kpiCards.map((kpi, i) => (
          <div
            key={i}
            className="p-7 flex flex-col justify-between min-h-[150px] relative overflow-hidden"
            style={{ background: "var(--surface)", borderTop: `2px solid ${kpi.accentColor}` }}
          >
            {/* subtle bg glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${kpi.bgGlow}, transparent 70%)` }} />
            <span className="mono-label block mb-4 relative" style={{ color: kpi.accentColor, opacity: 0.7 }}>{kpi.tag}</span>
            <div className="relative">
              <span
                className={`text-display text-4xl lg:text-5xl ${kpi.glowClass}`}
                style={{
                  color: kpi.accentColor,
                  fontFamily: "var(--font-display), Georgia, serif",
                }}
              >
                {kpi.value}
              </span>
              <p className="mono-label mt-2 opacity-40">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] bg-[var(--borderline)] border border-[var(--borderline)] animate-fade-up delay-2 relative z-10">
        {/* Department Budgets */}
        <div className="p-8" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between mb-8">
            <span className="mono-label" style={{ color: "var(--accent-gold)", opacity: 0.7 }}>BUDGET_UTILIZATION</span>
            <span className="mono-label">{totalBudgets.length} DEPTS</span>
          </div>
          <div className="space-y-5">
            {totalBudgets.map((b, i) => {
              const pct =
                b.allocated > 0 ? (b.spent / b.allocated) * 100 : 0;
              const color =
                pct >= 80
                  ? "var(--accent-red)"
                  : pct >= 60
                    ? "var(--accent-amber)"
                    : "var(--accent-cyan)";
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{b.department}</span>
                    <span className="mono-label" style={{ fontFamily: "var(--font-mono), monospace" }}>
                      ${b.spent.toLocaleString()} / ${b.allocated.toLocaleString()}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: color,
                        boxShadow: pct >= 80 ? `0 0 8px ${color}` : undefined,
                      }}
                    />
                  </div>
                  <p className="mono-label mt-1.5" style={{ color, opacity: 0.8 }}>
                    {pct.toFixed(1)}%
                  </p>
                </div>
              );
            })}
            {totalBudgets.length === 0 && (
              <p className="text-body">No budget data yet.</p>
            )}
          </div>
        </div>

        {/* Recent Violations */}
        <div className="p-8" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between mb-8">
            <span className="mono-label" style={{ color: "var(--accent-red)", opacity: 0.7 }}>RECENT_VIOLATIONS</span>
            <span className="mono-label">{recentViolations.length} OPEN</span>
          </div>
          <div className="space-y-0">
            {recentViolations.map((v, i) => (
              <div
                key={i}
                className="flex items-start justify-between py-3 border-b"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge badge-${v.severity}`}>
                      {v.severity.toUpperCase()}
                    </span>
                    <span className="mono-label">
                      {v.violation_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm truncate" style={{ color: "var(--text-sec)" }}>
                    {v.description}
                  </p>
                </div>
                <span className="mono-label ml-4 flex-shrink-0">
                  {v.detected_at?.split("T")[0] || ""}
                </span>
              </div>
            ))}
            {recentViolations.length === 0 && (
              <p className="text-body">No open violations. All clear.</p>
            )}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-10 animate-fade-up delay-3 relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px w-6 bg-amber-400/40" />
          <span className="mono-label" style={{ color: "var(--accent-gold)", opacity: 0.6 }}>
            BRIM_CHALLENGE // REQUIRED_FEATURES
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[var(--borderline)] border border-[var(--borderline)]">
          {[
            { num: "01", title: "Talk to Your Data", desc: "Natural language queries with charts & summaries", color: "#FBBF24" },
            { num: "02", title: "Policy Compliance", desc: "AI-powered rule enforcement with context", color: "#06B6D4" },
            { num: "03", title: "Pre-Approval Workflow", desc: "Smart recommendations with full context", color: "#A78BFA" },
            { num: "04", title: "Expense Reports", desc: "Auto-grouped by trip/event with policy checks", color: "#34D399" },
          ].map((f, i) => (
            <div key={i} className="p-6 relative overflow-hidden" style={{ background: "var(--surface)" }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, ${f.color}40, transparent)` }} />
              <span className="mono-label block mb-3" style={{ color: f.color, opacity: 0.7 }}>
                FEATURE_{f.num}
              </span>
              <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-sec)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
