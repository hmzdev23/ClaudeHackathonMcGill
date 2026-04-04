"use client";

import { useEffect, useState } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Colour palette ───────────────────────────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  Fleet_Operations: "#38BDF8",
  Administration:   "#A78BFA",
  Finance:          "#34D399",
};

function deptColor(key: string) {
  return DEPT_COLORS[key] ?? "#ffffff";
}

function fmtMonth(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(m) - 1]} '${y.slice(2)}`;
}

function fmtCAD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
  return `$${n.toLocaleString()}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrendSummary {
  dept: string;
  key: string;
  avg: number;
  slope: number;
  trend: "increasing" | "decreasing" | "stable";
  trend_pct: number;
  q2_projected: number;
  last_actual: number;
}

interface ForecastData {
  chart_data: Record<string, string | number | boolean>[];
  departments: string[];
  projected_months: string[];
  last_actual_month: string;
  trend_summaries: TrendSummary[];
  regression_months: string[];
  insights: string;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ForecastTooltip({ active, payload, label, projectedMonths }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  projectedMonths: string[];
}) {
  if (!active || !payload || !label) return null;
  const isProj = projectedMonths.includes(label);
  const filtered = payload.filter((p) => p.value != null && p.value > 0);
  return (
    <div style={{
      background: "rgba(7,9,20,0.95)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "10px 14px",
      color: "#fff",
      minWidth: 180,
    }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.5, marginBottom: 6 }}>
        {fmtMonth(label)} {isProj ? "· PROJECTED" : "· ACTUAL"}
      </p>
      {filtered.map((p) => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, marginBottom: 3 }}>
          <span style={{ color: p.color, opacity: 0.85 }}>{p.name.replace(/_proj$/, "").replace(/_/g, " ")}</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "#fff" }}>{fmtCAD(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Trend arrow ─────────────────────────────────────────────────────────────
function TrendArrow({ trend }: { trend: string }) {
  if (trend === "increasing") return <span style={{ color: "#f97316" }}>↑</span>;
  if (trend === "decreasing") return <span style={{ color: "#34D399" }}>↓</span>;
  return <span style={{ color: "rgba(255,255,255,0.4)" }}>→</span>;
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/forecast");
        const json = await res.json();
        if (json.error) { setError(json.error); } else { setData(json); }
      } catch {
        setError("Failed to load forecast data");
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
          <span className="mono-label" style={{ color: "var(--accent-primary)", opacity: 0.6 }}>
            Generating forecast...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen relative" style={{ background: "var(--bg)" }}>
        <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />
        <div className="text-center relative z-10">
          <span className="mono-label block mb-4" style={{ color: "var(--accent-red)" }}>FORECAST_ERROR</span>
          <p className="text-body">{error ?? "No data available"}</p>
        </div>
      </div>
    );
  }

  const { chart_data, departments, projected_months, last_actual_month, trend_summaries, regression_months, insights } = data;

  // Total Q2 projection across all depts
  const totalQ2 = trend_summaries.reduce((s, t) => s + t.q2_projected, 0);
  const totalAvg = trend_summaries.reduce((s, t) => s + t.avg, 0);

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto page-transition relative" style={{ background: "var(--bg)" }}>
      <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />

      {/* Header */}
      <div className="flex items-end justify-between mb-12 animate-fade-up relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-6" style={{ background: "var(--accent-primary)", opacity: 0.5 }} />
            <div className="mono-label" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>OPTIONAL // SPEND_FORECAST</div>
          </div>
          <h1 className="text-h2" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>
            Spending<br /><span style={{ color: "var(--text-sec)", opacity: 0.3 }}>Forecast.</span>
          </h1>
          <p className="text-body mt-4 max-w-lg">
            Linear trend analysis on {regression_months.length} months of real transaction data. Projected forward for Q2 2026.
          </p>
        </div>
        <div className="text-right">
          <span
            className="text-3xl tracking-tighter kpi-glow-blue"
            style={{ fontFamily: "var(--font-display), Georgia, serif", color: "var(--accent-primary)" }}
          >
            {fmtCAD(totalQ2)}
          </span>
          <p className="mono-label mt-1">Q2 2026 PROJECTION</p>
        </div>
      </div>

      {/* AI Insight */}
      <div
        className="mb-8 p-6 relative overflow-hidden animate-fade-up relative z-10"
        style={{
          background: "rgba(56,189,248,0.03)",
          border: "1px solid rgba(56,189,248,0.12)",
          borderRadius: 12,
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
        <div className="flex items-start gap-4">
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 2,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2.5" fill="#38BDF8" />
              <circle cx="7" cy="7" r="6" stroke="#38BDF8" strokeWidth="1" opacity="0.4" />
            </svg>
          </div>
          <div>
            <span className="mono-label block mb-2" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>
              CLAUDE_FORECAST_ANALYSIS
            </span>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-sec)" }}>{insights}</p>
          </div>
        </div>
      </div>

      {/* Main chart */}
      <div
        className="tactile-base relative overflow-hidden mb-8 animate-fade-up delay-1 relative z-10"
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
        <div className="p-8 relative">
          <div className="flex items-center justify-between mb-6">
            <span className="mono-label" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>MONTHLY_SPEND_TREND</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div style={{ width: 20, height: 2, background: "rgba(255,255,255,0.3)" }} />
                <span className="mono-label" style={{ opacity: 0.4 }}>ACTUAL</span>
              </div>
              <div className="flex items-center gap-2">
                <div style={{ width: 20, height: 2, background: "rgba(255,255,255,0.3)", borderTop: "2px dashed rgba(255,255,255,0.3)" }} />
                <span className="mono-label" style={{ opacity: 0.4 }}>PROJECTED</span>
              </div>
            </div>
          </div>

          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <ComposedChart data={chart_data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="month"
                  tickFormatter={fmtMonth}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => fmtCAD(v)}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  content={<ForecastTooltip projectedMonths={projected_months} />}
                />

                {/* Forecast boundary */}
                <ReferenceLine
                  x={last_actual_month}
                  stroke="rgba(255,255,255,0.15)"
                  strokeDasharray="4 4"
                  label={{
                    value: "FORECAST →",
                    position: "insideTopRight",
                    fill: "rgba(255,255,255,0.25)",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                  }}
                />

                {departments.map((dept) => {
                  const key = dept.replace(/ /g, "_");
                  const color = deptColor(key);
                  return [
                    // Actual line (solid)
                    <Line
                      key={`${key}_actual`}
                      type="monotone"
                      dataKey={key}
                      name={dept}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: color }}
                      connectNulls={false}
                    />,
                    // Projected line (dashed)
                    <Line
                      key={`${key}_proj`}
                      type="monotone"
                      dataKey={`${key}_proj`}
                      name={`${dept}_proj`}
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      activeDot={{ r: 4, fill: color, stroke: color }}
                      legendType="none"
                      connectNulls={false}
                    />,
                  ];
                })}

                <Legend
                  formatter={(value: string) => (
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                      {value.replace(/_/g, " ")}
                    </span>
                  )}
                  wrapperStyle={{ paddingTop: 16 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department trend cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-up delay-2 relative z-10">
        {trend_summaries.map((t, i) => {
          const color = deptColor(t.key);
          const isRisk = t.trend === "increasing" && t.avg > 10000;
          return (
            <div
              key={t.dept}
              className="tactile-base relative overflow-hidden animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />
              <div className="absolute inset-0 pointer-events-none" style={{
                background: `radial-gradient(circle at 0% 0%, ${color}08, transparent 60%)`,
              }} />
              <div className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="mono-label block mb-1" style={{ color, opacity: 0.7 }}>
                      {t.key.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <h3 className="text-sm font-semibold tracking-tight">{t.dept}</h3>
                  </div>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>
                    <TrendArrow trend={t.trend} />
                  </span>
                </div>

                <div className="mb-4">
                  <span
                    className="text-2xl tracking-tighter"
                    style={{ fontFamily: "var(--font-display), Georgia, serif", color }}
                  >
                    {fmtCAD(t.avg)}
                  </span>
                  <span className="mono-label ml-2" style={{ opacity: 0.4 }}>/MO AVG</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="mono-label" style={{ opacity: 0.4 }}>TREND</span>
                    <span className="mono-label" style={{
                      color: t.trend === "increasing" ? "#f97316" : t.trend === "decreasing" ? "#34D399" : "rgba(255,255,255,0.4)",
                    }}>
                      {t.slope >= 0 ? "+" : ""}{fmtCAD(Math.abs(t.slope))}/MO
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="mono-label" style={{ opacity: 0.4 }}>Q2 PROJECTION</span>
                    <span className="mono-label" style={{ color: isRisk ? "#f97316" : color }}>
                      {fmtCAD(t.q2_projected)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="mono-label" style={{ opacity: 0.4 }}>LAST ACTUAL</span>
                    <span className="mono-label">{fmtCAD(t.last_actual)}</span>
                  </div>
                </div>

                {isRisk && (
                  <div className="mt-4 px-3 py-2 text-xs" style={{
                    background: "rgba(249,115,22,0.06)",
                    border: "1px solid rgba(249,115,22,0.15)",
                    borderRadius: 6,
                    color: "#f97316",
                    fontFamily: "var(--font-mono)",
                  }}>
                    ↑ UPWARD TREND — MONITOR
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Methodology note */}
      <div className="animate-fade-up delay-3 relative z-10 flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 8,
        }}
      >
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }} />
        <p className="text-xs" style={{ color: "var(--text-sec)", lineHeight: 1.6 }}>
          <span style={{ color: "var(--text-main)", fontWeight: 500 }}>Methodology:</span>{" "}
          Ordinary least-squares linear regression on {regression_months.length} months of actual spend ({regression_months[0].replace('-', ' ')} – {regression_months[regression_months.length - 1].replace('-', ' ')}). Projections assume trend continuity. Actual spend may vary due to seasonality, one-off charges, or operational changes.
        </p>
      </div>
    </div>
  );
}
