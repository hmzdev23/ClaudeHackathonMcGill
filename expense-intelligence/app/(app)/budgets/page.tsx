"use client";

import { useEffect, useState } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";

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

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/budgets");
        const data = await res.json();
        setBudgets(data.budgets || []);
      } catch {
        console.error("Failed to load budgets");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen relative" style={{ background: "var(--bg)" }}>
        <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />
        <div className="text-center relative z-10">
          <div className="spinner mx-auto mb-4" style={{ borderTopColor: "var(--accent-primary)" }} />
          <span className="mono-label" style={{ color: "var(--accent-primary)", opacity: 0.6 }}>Loading budgets...</span>
        </div>
      </div>
    );
  }

  const departments = [...new Set(budgets.map((b) => b.department))];

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto page-transition relative" style={{ background: "var(--bg)" }}>
      <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />

      {/* Header */}
      <div className="flex items-end justify-between mb-12 animate-fade-up relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-6" style={{ background: "var(--accent-primary)", opacity: 0.5 }} />
            <div className="mono-label" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>OPTIONAL // BUDGET_TRACKING</div>
          </div>
          <h1 className="text-h2" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>
            Department<br /><span style={{ color: "var(--text-sec)", opacity: 0.3 }}>Budgets.</span>
          </h1>
          <p className="text-body mt-4 max-w-lg">
            Real-time utilization by department and category. Projected overrun alerts help you stay ahead.
          </p>
        </div>
        <div className="text-right">
          <span className="mono-label">
            {budgets[0]?.period
              ? budgets[0].period.replace(/^(\d{4})-Q(\d)$/, "Q$2 $1")
              : "CURRENT_QTR"}
          </span>
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="tactile-base relative overflow-hidden p-12 text-center animate-fade-up relative z-10">
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
          <span className="mono-label block mb-4" style={{ color: "var(--accent-primary)" }}>NO_BUDGET_DATA</span>
          <h2 className="text-h3" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>No budget allocations in source data.</h2>
          <p className="text-body mt-2 mb-4 max-w-md mx-auto">The Brim dataset contains transaction records only — no budget allocations were provided. Budget vs. actual comparisons require budget data from your finance system.</p>
          <p className="mono-label" style={{ color: "var(--text-sec)", opacity: 0.45 }}>SOURCE: dummy_data(2).xlsx</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-up delay-1 relative z-10">
          {departments.map((dept, deptIndex) => {
            const deptBudgets = budgets.filter((b) => b.department === dept);
            const totalBudget = deptBudgets.find((b) => b.category === "total");
            const categoryBudgets = deptBudgets.filter((b) => b.category !== "total");
            const pct = totalBudget?.percent_used ?? 0;
            const accentColor = pct >= 80 ? "var(--accent-red)" : pct >= 60 ? "var(--accent-amber)" : "var(--accent-primary)";

            return (
              <div
                key={dept}
                className="tactile-base relative overflow-hidden animate-fade-up"
                style={{ animationDelay: `${deptIndex * 80}ms` }}
              >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, ${accentColor}, transparent)` }} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 0% 0%, ${pct >= 80 ? "rgba(239,68,68,0.04)" : pct >= 60 ? "rgba(245,158,11,0.04)" : "rgba(6,182,212,0.03)"}, transparent 60%)` }} />

                <div className="p-8 relative">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight mb-1">{dept}</h2>
                      {totalBudget && (
                        <span className="mono-label" style={{ color: "var(--text-sec)" }}>
                          PROJECTED: ${totalBudget.projected_end_of_period.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {totalBudget && (
                      <div className="text-right">
                        <span
                          className="text-2xl tracking-tighter"
                          style={{ fontFamily: "var(--font-display), Georgia, serif", color: accentColor }}
                        >
                          ${totalBudget.spent.toLocaleString()}
                        </span>
                        <span className="text-sm ml-1" style={{ color: "var(--text-sec)" }}>
                          / ${totalBudget.allocated.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Total progress */}
                  {totalBudget && (
                    <div className="mb-6">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(totalBudget.percent_used, 100)}%`,
                            background: accentColor,
                            boxShadow: pct >= 80 ? `0 0 8px ${accentColor}` : undefined,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="mono-label" style={{ color: accentColor }}>{totalBudget.percent_used.toFixed(1)}% UTILIZED</span>
                        <span className="mono-label">${totalBudget.remaining.toLocaleString()} REMAINING</span>
                      </div>
                    </div>
                  )}

                  {/* Category breakdowns */}
                  {categoryBudgets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryBudgets.map((b, i) => {
                        const catColor = b.percent_used >= 80 ? "var(--accent-red)" : b.percent_used >= 60 ? "var(--accent-amber)" : "rgba(255,255,255,0.35)";
                        return (
                          <div
                            key={i}
                            className="p-4 hover-lift-sm transition-all duration-300"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-medium" style={{ color: "var(--text-sec)" }}>
                                {b.category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                              </span>
                              <span className="mono-label" style={{ color: catColor }}>${b.spent.toLocaleString()}</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${Math.min(b.percent_used, 100)}%`, background: catColor }} />
                            </div>
                            <p className="mono-label mt-1.5" style={{ color: catColor, opacity: 0.7 }}>{b.percent_used.toFixed(1)}%</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
