"use client";

import { useEffect, useState } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardKpis {
  total_spend_qtd: number;
  pending_approvals: number;
  open_violations: number;
  departments_over_80pct: number;
}

interface Violation {
  id: string;
  violation_type: string;
  severity: string;
  description: string;
  detected_at: string;
  status: string;
}

interface BudgetStatus {
  department: string;
  category: string;
  period?: string;
  allocated: number;
  spent: number;
  remaining: number;
  percent_used: number;
  projected_end_of_period?: number;
}

interface DashboardData {
  kpis: DashboardKpis;
  recent_violations: Violation[];
  budget_status: BudgetStatus[];
  monthly_spend: { month: string; total: number }[];
  category_spend: { category: string; total: number }[];
  department_spend: { department: string; total: number }[];
}

const BLUE = "#38BDF8";
const BLUE_GLOW = "rgba(56,189,248,0.06)";
const GRID = "rgba(255,255,255,0.04)";

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", { month: "short" });
}

function fmtCat(cat: string) {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtK(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
  return `$${val}`;
}

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0d0f1a",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
        padding: "8px 12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {label && (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", fontFamily: "monospace", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </p>
      )}
      <p style={{ color: BLUE, fontSize: "14px", fontWeight: 600 }}>
        ${payload[0].value?.toLocaleString()}
      </p>
    </div>
  );
};

const PIE_COLORS = ["#38BDF8", "#EF4444", "#34D399", "#F59E0B", "#A78BFA", "#F97316", "#22D3EE", "#FB7185"];

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

  const seedDatabase = async (mode: "synthetic" | "brim" = "brim") => {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      await loadDashboard();
    } catch {
      console.error("Failed to seed");
    }
    setSeeding(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const isEmpty = data && data.kpis.total_spend_qtd === 0 && data.kpis.pending_approvals === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen relative" style={{ background: "var(--bg)" }}>
        <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.03)" />
        <div className="text-center relative z-10">
          <div className="spinner mx-auto mb-4" style={{ borderTopColor: BLUE }} />
          <span className="mono-label" style={{ color: BLUE, opacity: 0.6 }}>Loading system...</span>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-screen relative" style={{ background: "var(--bg)" }}>
        <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.03)" />
        <div className="text-center max-w-md px-8 relative z-10">
          <div className="mb-10 flex items-center justify-center gap-3">
            <div className="h-px w-8" style={{ background: BLUE, opacity: 0.4 }} />
            <span className="mono-label" style={{ color: BLUE, opacity: 0.7 }}>BRIM_CHALLENGE // INITIALIZE</span>
            <div className="h-px w-8" style={{ background: BLUE, opacity: 0.4 }} />
          </div>
          <h1 className="text-h2 mb-4" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>System ready.</h1>
          <p className="text-body mb-10">
            Deploy 6 months of real Brim card transaction data to activate the intelligence dashboard.
          </p>
          <button
            onClick={() => seedDatabase("brim")}
            disabled={seeding}
            id="seed-btn"
            className="inline-flex items-center gap-3 px-8 py-3.5 text-sm font-medium transition-all"
            style={{
              background: seeding ? "transparent" : BLUE,
              color: seeding ? "var(--text-sec)" : "#000",
              border: `1px solid ${seeding ? "var(--borderline)" : BLUE}`,
              borderRadius: "10px",
              boxShadow: !seeding ? `0 0 30px rgba(56,189,248,0.3)` : undefined,
            }}
          >
            {seeding ? "Deploying..." : "Load Brim Data"}
            {!seeding && <span>→</span>}
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
      accentColor: BLUE,
      bgGlow: BLUE_GLOW,
    },
    {
      tag: "PENDING",
      label: "Pending Approvals",
      value: data.kpis.pending_approvals.toString(),
      accentColor: data.kpis.pending_approvals > 0 ? BLUE : "#22c55e",
      bgGlow: data.kpis.pending_approvals > 0 ? BLUE_GLOW : "rgba(34,197,94,0.04)",
    },
    {
      tag: "VIOLATIONS",
      label: "Policy Violations",
      value: data.kpis.open_violations.toString(),
      accentColor: data.kpis.open_violations > 0 ? "#ef4444" : "#22c55e",
      bgGlow: data.kpis.open_violations > 0 ? "rgba(239,68,68,0.05)" : "rgba(34,197,94,0.04)",
    },
    {
      tag: "OVER_BUDGET",
      label: "Depts Over 80%",
      value: data.kpis.departments_over_80pct.toString(),
      accentColor: data.kpis.departments_over_80pct > 0 ? "#ef4444" : "#22c55e",
      bgGlow: data.kpis.departments_over_80pct > 0 ? "rgba(239,68,68,0.05)" : "rgba(34,197,94,0.04)",
    },
  ];

  const totalBudgets = (data.budget_status || []).filter((b) => b.category === "total");
  const monthlyData = (data.monthly_spend || []).map((d) => ({ ...d, label: fmtMonth(d.month) }));
  const categoryData = (data.category_spend || []).map((d) => ({ ...d, label: fmtCat(d.category) }));
  const deptData = (data.department_spend || []);
  const hasCharts = monthlyData.length > 0;

  return (
    <div className="p-8 lg:p-12 max-w-[100rem] mx-auto relative" style={{ background: "var(--bg)" }}>
      <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />

      {/* Header */}
      <div className="mb-12 animate-fade-up relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-6" style={{ background: BLUE, opacity: 0.5 }} />
            <div className="editorial-badge" style={{ color: BLUE, opacity: 0.7 }}>BRIM_CHALLENGE // DASHBOARD</div>
          </div>
          <h1 className="text-h1" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>
            Expense<br />
            <span style={{ color: "var(--text-sec)", opacity: 0.3 }}>Intelligence.</span>
          </h1>
          <p className="text-body mt-4 max-w-md" style={{ opacity: 0.6 }}>
            AI-powered expense management for SMBs. Built with Claude API for multi-step reasoning and agentic workflows.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[var(--borderline)] border border-[var(--borderline)] mb-8 animate-fade-up delay-1 relative z-10 rounded-2xl overflow-hidden" id="kpi-grid">
        {kpiCards.map((kpi, i) => (
          <div
            key={i}
            className="p-7 flex flex-col justify-between min-h-[150px] relative overflow-hidden"
            style={{ background: "var(--surface)", borderTop: `2px solid ${kpi.accentColor}` }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${kpi.bgGlow}, transparent 70%)` }} />
            <span className="mono-label block mb-4 relative" style={{ color: kpi.accentColor, opacity: 0.7 }}>{kpi.tag}</span>
            <div className="relative">
              <span
                className="text-4xl lg:text-5xl"
                style={{ color: kpi.accentColor, fontFamily: "var(--font-display), Georgia, serif" }}
              >{kpi.value}</span>
              <p className="mono-label mt-2 opacity-40">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      {hasCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-[1px] bg-[var(--borderline)] border border-[var(--borderline)] mb-8 animate-fade-up delay-2 relative z-10 rounded-2xl overflow-hidden">
          {/* Area Chart: Monthly Spend Trend */}
          <div className="lg:col-span-3 p-8" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between mb-6">
              <span className="mono-label" style={{ color: BLUE, opacity: 0.7 }}>SPEND_TREND</span>
              <span className="mono-label">{monthlyData.length} MONTHS</span>
            </div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BLUE} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtK}
                    width={42}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(56,189,248,0.2)", strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={BLUE}
                    strokeWidth={2}
                    fill="url(#areaGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: BLUE, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart: Department Spend */}
          <div className="lg:col-span-2 p-8" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between mb-6">
              <span className="mono-label" style={{ color: BLUE, opacity: 0.7 }}>DEPT_BREAKDOWN</span>
              <span className="mono-label">{deptData.length} DEPTS</span>
            </div>
            <div className="flex items-center gap-4" style={{ height: 200 }}>
              <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      dataKey="total"
                      strokeWidth={0}
                      minAngle={6}
                    >
                      {deptData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px 10px" }}>
                            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "9px", fontFamily: "monospace", marginBottom: "2px" }}>{payload[0].name}</p>
                            <p style={{ color: BLUE, fontSize: "12px" }}>${(payload[0].value as number)?.toLocaleString()}</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                {deptData.slice(0, 5).map((d, idx) => (
                  <div key={d.department} className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{d.department}</span>
                    <span className="text-[10px] ml-auto flex-shrink-0 font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{fmtK(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Bar Chart */}
      {hasCharts && categoryData.length > 0 && (
        <div className="border border-[var(--borderline)] mb-8 animate-fade-up delay-2 relative z-10 rounded-2xl overflow-hidden">
          <div className="p-8" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between mb-6">
              <span className="mono-label" style={{ color: BLUE, opacity: 0.7 }}>SPEND_BY_CATEGORY</span>
              <span className="mono-label">TOP {categoryData.length} CATEGORIES</span>
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={true} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtK}
                    width={42}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {categoryData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={BLUE}
                        fillOpacity={1 - idx * 0.08}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Budget + Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] bg-[var(--borderline)] border border-[var(--borderline)] animate-fade-up delay-3 relative z-10 rounded-2xl overflow-hidden mb-8">
        {/* Department Budgets */}
        <div className="p-8" style={{ background: "var(--surface)" }} id="budget-section">
          <div className="flex items-center justify-between mb-8">
            <span className="mono-label" style={{ color: BLUE, opacity: 0.7 }}>BUDGET_UTILIZATION</span>
            <span className="mono-label">{totalBudgets.length} DEPTS</span>
          </div>
          <div className="space-y-5">
            {totalBudgets.map((b, i) => {
              const pct = b.allocated > 0 ? (b.spent / b.allocated) * 100 : 0;
              const color = pct >= 80 ? "#ef4444" : pct >= 60 ? "#f97316" : BLUE;
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{b.department}</span>
                    <span className="mono-label">${b.spent.toLocaleString()} / ${b.allocated.toLocaleString()}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color, boxShadow: pct >= 80 ? `0 0 8px ${color}` : undefined }} />
                  </div>
                  <p className="mono-label mt-1.5" style={{ color, opacity: 0.8 }}>{pct.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Violations */}
        <div className="p-8" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between mb-8">
            <span className="mono-label" style={{ color: "var(--accent-red)", opacity: 0.7 }}>RECENT_VIOLATIONS</span>
            <span className="mono-label">{(data.recent_violations || []).length} OPEN</span>
          </div>
          <div className="space-y-0">
            {(data.recent_violations || []).slice(0, 8).map((v, i) => (
              <div key={i} className="flex items-start justify-between py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge badge-${v.severity}`}>{v.severity?.toUpperCase()}</span>
                    <span className="mono-label">{v.violation_type?.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-sm truncate" style={{ color: "var(--text-sec)" }}>{v.description}</p>
                </div>
                <span className="mono-label ml-4 flex-shrink-0">{v.detected_at?.split("T")[0] || ""}</span>
              </div>
            ))}
            {(data.recent_violations || []).length === 0 && (
              <p className="text-body">No open violations. All clear.</p>
            )}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="animate-fade-up delay-3 relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px w-6" style={{ background: BLUE, opacity: 0.4 }} />
          <span className="mono-label" style={{ color: BLUE, opacity: 0.6 }}>BRIM_CHALLENGE // REQUIRED_FEATURES</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[var(--borderline)] border border-[var(--borderline)] rounded-2xl overflow-hidden">
          {[
            { num: "01", title: "Talk to Your Data", desc: "Natural language queries with charts & summaries", color: "#38BDF8", href: "/query" },
            { num: "02", title: "Policy Compliance", desc: "AI-powered rule enforcement with context", color: "#06B6D4", href: "/compliance" },
            { num: "03", title: "Pre-Approval Workflow", desc: "Smart recommendations with full context", color: "#A78BFA", href: "/approvals" },
            { num: "04", title: "Expense Reports", desc: "Auto-grouped by trip/event with policy checks", color: "#34D399", href: "/reports" },
          ].map((f, i) => (
            <a key={i} href={f.href} className="block p-6 relative overflow-hidden group transition-all duration-300 hover:opacity-90" style={{ background: "var(--surface)" }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, ${f.color}50, transparent)` }} />
              <span className="mono-label block mb-3" style={{ color: f.color, opacity: 0.7 }}>FEATURE_{f.num}</span>
              <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-sec)" }}>{f.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
