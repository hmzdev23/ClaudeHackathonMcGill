"use client";

import { useEffect, useState } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";

const BLUE = "#38BDF8";

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

const CAT_LABELS: Record<string, string> = {
  fleet_fuel: "Fleet Fuel", fleet_permits: "Permits & Compliance",
  fleet_tires_parts: "Tires & Parts", fleet_maintenance: "Maintenance & Repairs",
  equipment: "Equipment", office_supplies: "Office Supplies",
  software_saas: "Software / SaaS", hotels: "Hotels", training: "Training", meals: "Meals",
};
function fmtCat(s: string) {
  return CAT_LABELS[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

interface VendorRow {
  category: string;
  vendor_count: number;
  total_spend: number;
  tx_count: number;
  vendors: string[];
  potential_savings: number;
}

interface ForecastRow {
  department: string;
  period: string;
  allocated: number;
  spent: number;
  percent_used: number;
  projected_end: number;
  overrun_amount: number;
  days_until_overrun: number | null;
  overrun_date: string | null;
  status: "over_budget" | "at_risk" | "on_track";
}

interface PeerRow {
  employee_id: string;
  name: string;
  department: string;
  total_spend: number;
  tx_count: number;
  avg_tx: number;
  dept_avg: number;
  pct_vs_avg: number;
  status: "high" | "normal" | "low";
}

interface InsightsData {
  vendor_consolidation: VendorRow[];
  budget_forecast: ForecastRow[];
  peer_benchmarking: PeerRow[];
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"vendors" | "forecast" | "peers">("vendors");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/insights");
        setData(await res.json());
      } catch {
        console.error("Failed to load insights");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen relative" style={{ background: "var(--bg)" }}>
        <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />
        <div className="text-center relative z-10">
          <div className="spinner mx-auto mb-4" style={{ borderTopColor: BLUE }} />
          <span className="mono-label" style={{ color: BLUE, opacity: 0.6 }}>Generating insights...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalSavings = data.vendor_consolidation.reduce((s, r) => s + r.potential_savings, 0);
  const atRiskDepts = data.budget_forecast.filter(b => b.status !== "on_track").length;
  const highSpenders = data.peer_benchmarking.filter(p => p.status === "high").length;

  const tabs = [
    { id: "vendors" as const, label: "Vendor Consolidation", count: data.vendor_consolidation.length, badge: `${fmtMoney(totalSavings)} savings` },
    { id: "forecast" as const, label: "Budget Forecast",     count: data.budget_forecast.length,     badge: `${atRiskDepts} at risk` },
    { id: "peers"   as const, label: "Peer Benchmarking",   count: data.peer_benchmarking.length,    badge: `${highSpenders} outliers` },
  ];

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto page-transition relative" style={{ background: "var(--bg)" }}>
      <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />

      {/* Header */}
      <div className="mb-10 animate-fade-up relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-6" style={{ background: BLUE, opacity: 0.5 }} />
          <span className="mono-label" style={{ color: BLUE, opacity: 0.7 }}>OPTIONAL // INSIGHTS</span>
        </div>
        <h1 className="text-h2" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>
          Proactive<br /><span style={{ color: "var(--text-sec)", opacity: 0.3 }}>Insights.</span>
        </h1>
        <p className="text-body mt-4 max-w-xl">
          AI surfaces what you didn't know to ask — vendor savings, budget overruns before they happen, and spending outliers across your team.
        </p>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-3 gap-[1px] bg-[var(--borderline)] border border-[var(--borderline)] rounded-2xl overflow-hidden mb-8 animate-fade-up delay-1 relative z-10">
        {[
          { tag: "SAVINGS_POTENTIAL", value: fmtMoney(totalSavings), label: "from vendor consolidation", color: "var(--accent-green)" },
          { tag: "BUDGET_RISK", value: `${atRiskDepts}`, label: "depts at / over budget", color: atRiskDepts > 0 ? "var(--accent-amber)" : "var(--accent-green)" },
          { tag: "SPEND_OUTLIERS", value: `${highSpenders}`, label: "employees over 30% avg", color: highSpenders > 0 ? "var(--accent-red)" : "var(--accent-green)" },
        ].map(kpi => (
          <div key={kpi.tag} className="p-6 relative" style={{ background: "var(--surface)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, rgba(56,189,248,0.04), transparent 70%)` }} />
            <span className="mono-label block mb-3 relative" style={{ color: BLUE, opacity: 0.6 }}>{kpi.tag}</span>
            <span className="block text-3xl tracking-tighter relative" style={{ color: kpi.color, fontFamily: "var(--font-display), Georgia, serif" }}>{kpi.value}</span>
            <span className="mono-label block mt-1 relative" style={{ opacity: 0.4 }}>{kpi.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 animate-fade-up delay-1 relative z-10 p-1 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--borderline)", width: "fit-content" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm transition-all duration-200"
            style={{
              background: activeTab === tab.id ? "rgba(56,189,248,0.12)" : "transparent",
              border: `1px solid ${activeTab === tab.id ? "rgba(56,189,248,0.25)" : "transparent"}`,
              color: activeTab === tab.id ? BLUE : "var(--text-sec)",
              cursor: "pointer",
            }}
          >
            <span className="font-medium">{tab.label}</span>
            <span
              className="mono-label px-2 py-0.5 rounded-full"
              style={{
                background: activeTab === tab.id ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.05)",
                color: activeTab === tab.id ? BLUE : "var(--text-sec)",
                fontSize: "0.6rem",
              }}
            >
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab: Vendor Consolidation ─────────────────────────────────────── */}
      {activeTab === "vendors" && (
        <div className="space-y-4 animate-fade-up relative z-10">
          <p className="text-sm mb-6" style={{ color: "var(--text-sec)" }}>
            Categories where you pay multiple vendors for the same thing. Consolidating to the top vendor typically saves <strong style={{ color: "var(--text-main)" }}>10–15%</strong> through volume discounts and reduced admin overhead.
          </p>
          {data.vendor_consolidation.length === 0 ? (
            <div className="tactile-base p-10 text-center">
              <span className="mono-label block mb-2" style={{ color: "var(--accent-green)" }}>VENDORS_CONSOLIDATED</span>
              <p className="text-body">No consolidation opportunities found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.vendor_consolidation.map((row, i) => (
                <div
                  key={row.category}
                  className="tactile-base relative overflow-hidden animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-green), transparent)" }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 0% 0%, rgba(34,197,94,0.04), transparent 60%)" }} />
                  <div className="p-6 relative">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="mono-label block mb-1" style={{ color: "var(--accent-green)", opacity: 0.7 }}>CONSOLIDATION_OPP</span>
                        <h3 className="text-base font-semibold tracking-tight">{fmtCat(row.category)}</h3>
                      </div>
                      <div className="text-right">
                        <span className="block text-xl tracking-tighter" style={{ color: "var(--accent-green)", fontFamily: "var(--font-display), Georgia, serif" }}>
                          +{fmtMoney(row.potential_savings)}
                        </span>
                        <span className="mono-label" style={{ opacity: 0.4 }}>est. savings</span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-4 mb-4">
                      <div className="text-center">
                        <span className="block text-xl" style={{ color: "var(--accent-amber)", fontFamily: "var(--font-display), Georgia, serif" }}>{row.vendor_count}</span>
                        <span className="mono-label" style={{ opacity: 0.4 }}>vendors</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-xl" style={{ color: BLUE, fontFamily: "var(--font-display), Georgia, serif" }}>{fmtMoney(row.total_spend)}</span>
                        <span className="mono-label" style={{ opacity: 0.4 }}>total spend</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-xl" style={{ color: "var(--text-sec)", fontFamily: "var(--font-display), Georgia, serif" }}>{row.tx_count}</span>
                        <span className="mono-label" style={{ opacity: 0.4 }}>transactions</span>
                      </div>
                    </div>

                    {/* Vendor list */}
                    <div className="flex flex-wrap gap-1.5">
                      {row.vendors.map((v, vi) => (
                        <span
                          key={vi}
                          className="px-2.5 py-1 rounded-full text-xs"
                          style={{
                            background: vi === 0 ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${vi === 0 ? "rgba(56,189,248,0.25)" : "rgba(255,255,255,0.07)"}`,
                            color: vi === 0 ? BLUE : "var(--text-sec)",
                          }}
                        >
                          {vi === 0 ? "★ " : ""}{v}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs mt-2" style={{ color: "var(--text-sec)", opacity: 0.5 }}>
                      ★ Top vendor by volume — consolidate others here
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total savings callout */}
          {data.vendor_consolidation.length > 0 && (
            <div className="p-6 rounded-xl animate-fade-up" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="mono-label block mb-1" style={{ color: "var(--accent-green)" }}>TOTAL_OPPORTUNITY</span>
                  <p className="text-sm" style={{ color: "var(--text-sec)" }}>
                    Consolidating {data.vendor_consolidation.length} categories to preferred vendors could save approximately
                  </p>
                </div>
                <span className="text-3xl tracking-tighter ml-6 flex-shrink-0" style={{ color: "var(--accent-green)", fontFamily: "var(--font-display), Georgia, serif" }}>
                  {fmtMoney(totalSavings)}/yr
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Budget Forecast ──────────────────────────────────────────── */}
      {activeTab === "forecast" && (
        <div className="space-y-4 animate-fade-up relative z-10">
          <p className="text-sm mb-6" style={{ color: "var(--text-sec)" }}>
            Burn rate analysis for the current quarter. Projected spend is calculated from days elapsed — departments shown with current trajectory.
          </p>
          {data.budget_forecast.length === 0 ? (
            <div className="tactile-base p-10 text-center">
              <p className="text-body">No budget data available.</p>
            </div>
          ) : (
            <div className="tactile-base overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
              <div className="divide-y" style={{ borderColor: "var(--borderline)" }}>
                {data.budget_forecast.map((row, i) => {
                  const statusColor =
                    row.status === "over_budget" ? "var(--accent-red)"
                    : row.status === "at_risk"    ? "var(--accent-amber)"
                    :                               "var(--accent-green)";
                  const statusLabel =
                    row.status === "over_budget" ? "OVER_BUDGET"
                    : row.status === "at_risk"    ? "AT_RISK"
                    :                               "ON_TRACK";
                  const projPct = row.allocated > 0 ? Math.min(200, (row.projected_end / row.allocated) * 100) : 0;

                  return (
                    <div key={row.department} className="p-6 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2.5 mb-1">
                            <h3 className="font-semibold tracking-tight">{row.department}</h3>
                            <span className="mono-label px-2 py-0.5 rounded-full" style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}>
                              {statusLabel}
                            </span>
                          </div>
                          <span className="mono-label" style={{ opacity: 0.4 }}>{row.period}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-xl tracking-tighter" style={{ color: statusColor, fontFamily: "var(--font-display), Georgia, serif" }}>
                            {fmtMoney(row.spent)}
                            <span className="text-sm ml-1" style={{ opacity: 0.5 }}>/ {fmtMoney(row.allocated)}</span>
                          </span>
                          <span className="mono-label" style={{ opacity: 0.4 }}>{row.percent_used.toFixed(0)}% used</span>
                        </div>
                      </div>

                      {/* Progress bars: actual + projected */}
                      <div className="space-y-1.5 mb-3">
                        {/* Actual spend bar */}
                        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, row.percent_used)}%`, background: statusColor, boxShadow: `0 0 6px ${statusColor}80` }}
                          />
                        </div>
                        {/* Projected bar */}
                        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, projPct)}%`, background: `${statusColor}60` }}
                          />
                          {projPct > 100 && (
                            <div className="absolute right-0 top-0 h-full w-1 rounded-full" style={{ background: statusColor }} />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--text-sec)" }}>
                          Projected end-of-quarter: <strong style={{ color: statusColor }}>{fmtMoney(row.projected_end)}</strong>
                        </span>
                        {row.overrun_amount > 0 ? (
                          <span className="mono-label" style={{ color: statusColor }}>
                            +{fmtMoney(row.overrun_amount)} overrun · {row.days_until_overrun !== null && row.days_until_overrun > 0 ? `~${row.days_until_overrun}d` : "NOW"}
                          </span>
                        ) : (
                          <span className="mono-label" style={{ color: "var(--accent-green)", opacity: 0.6 }}>WITHIN_BUDGET</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Peer Benchmarking ────────────────────────────────────────── */}
      {activeTab === "peers" && (
        <div className="animate-fade-up relative z-10">
          <p className="text-sm mb-6" style={{ color: "var(--text-sec)" }}>
            Each employee's total spend compared to their department average. Outliers above <strong style={{ color: "var(--text-main)" }}>+30%</strong> may warrant review.
          </p>

          {/* Group by department */}
          {Array.from(new Set(data.peer_benchmarking.map(p => p.department))).map((dept, di) => {
            const deptPeers = data.peer_benchmarking.filter(p => p.department === dept);
            const deptAvg = deptPeers[0]?.dept_avg ?? 0;
            const maxSpend = Math.max(...deptPeers.map(p => p.total_spend));

            return (
              <div key={dept} className="tactile-base overflow-hidden mb-4 animate-fade-up" style={{ animationDelay: `${di * 80}ms` }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--borderline)" }}>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold tracking-tight">{dept}</h3>
                    <span className="mono-label" style={{ opacity: 0.4 }}>{deptPeers.length} employees</span>
                  </div>
                  <span className="mono-label">AVG <span style={{ color: BLUE }}>{fmtMoney(deptAvg)}</span></span>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--borderline)" }}>
                  {deptPeers.map((peer, pi) => {
                    const barWidth = maxSpend > 0 ? (peer.total_spend / maxSpend) * 100 : 0;
                    const statusColor =
                      peer.status === "high"   ? "var(--accent-red)"
                      : peer.status === "low"  ? "var(--accent-green)"
                      :                          BLUE;
                    const pctLabel = peer.pct_vs_avg > 0
                      ? `+${peer.pct_vs_avg}%`
                      : `${peer.pct_vs_avg}%`;

                    return (
                      <div key={peer.employee_id} className="px-6 py-4 flex items-center gap-4 animate-fade-up" style={{ animationDelay: `${pi * 30}ms` }}>
                        {/* Rank */}
                        <span className="mono-label w-6 flex-shrink-0 text-center" style={{ opacity: 0.3 }}>{pi + 1}</span>
                        {/* Name */}
                        <div style={{ width: 140, flexShrink: 0 }}>
                          <p className="text-sm font-medium" style={{ color: "var(--text-main)" }}>{peer.name}</p>
                          <p className="mono-label" style={{ opacity: 0.4, fontSize: "0.6rem" }}>{peer.tx_count} txns · avg {fmtMoney(peer.avg_tx)}</p>
                        </div>
                        {/* Bar */}
                        <div className="flex-1 relative">
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${barWidth}%`,
                                background: statusColor,
                                boxShadow: peer.status !== "normal" ? `0 0 8px ${statusColor}60` : undefined,
                                animationDelay: `${pi * 30}ms`,
                              }}
                            />
                          </div>
                          {/* Avg marker */}
                          {deptAvg > 0 && maxSpend > 0 && (
                            <div
                              className="absolute top-0 h-2 w-px"
                              style={{
                                left: `${(deptAvg / maxSpend) * 100}%`,
                                background: "rgba(255,255,255,0.25)",
                              }}
                            />
                          )}
                        </div>
                        {/* Amount */}
                        <span className="text-sm font-mono flex-shrink-0" style={{ color: statusColor, minWidth: 64, textAlign: "right" }}>
                          {fmtMoney(peer.total_spend)}
                        </span>
                        {/* % vs avg badge */}
                        <span
                          className="mono-label flex-shrink-0 px-2 py-0.5 rounded-full"
                          style={{
                            background: `${statusColor}18`,
                            border: `1px solid ${statusColor}30`,
                            color: statusColor,
                            minWidth: 56,
                            textAlign: "center",
                            fontSize: "0.6rem",
                          }}
                        >
                          {pctLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
