"use client";

import { useState, useEffect } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CategoryBreakdown { category: string; total: number; count: number; }
interface MonthlyBreakdown  { month: string; total: number; }
interface TopTransaction    { id: string; date: string; merchant: string; category: string; amount: number; description: string; }

interface FullReport {
  id: string | number;
  title: string;
  employee_name: string;
  department: string;
  event_tag: string | null;
  total_amount: number;
  transaction_count: number;
  narrative: string;
  policy_summary: string;
  category_breakdown: CategoryBreakdown[];
  monthly_breakdown: MonthlyBreakdown[];
  date_range: { from: string; to: string };
  top_transactions: TopTransaction[];
  generated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const employees = [
  { id: "emp-001", name: "Fleet Cards (3xxx)" },
  { id: "emp-002", name: "Account Admin (01xx)" },
  { id: "emp-003", name: "Account Charges (04xx)" },
];

const CAT_LABELS: Record<string, string> = {
  fleet_fuel: "Fleet Fuel", fleet_permits: "Permits & Compliance",
  fleet_tires_parts: "Tires & Parts", fleet_maintenance: "Maintenance & Repairs",
  equipment: "Equipment", office_supplies: "Office Supplies",
  software_saas: "Software / SaaS", hotels: "Hotels", training: "Training", meals: "Meals",
};
function fmtCat(c: string) {
  return CAT_LABELS[c] ?? c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
function fmtAmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMonth(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(m)-1]} '${y.slice(2)}`;
}

const CATEGORY_COLORS = [
  "#38BDF8","#818CF8","#34D399","#F59E0B","#F472B6","#A78BFA","#FB923C","#4ADE80",
];

// ─── Print PDF generator ──────────────────────────────────────────────────────
function buildHorizBarsSVG(data: CategoryBreakdown[], maxWidth: number): string {
  const max = Math.max(...data.map((d) => d.total), 1);
  const rowH = 34;
  const labelW = 150;
  const barArea = maxWidth - labelW - 80;
  const h = data.length * rowH + 8;
  const colors = ["#0ea5e9","#6366f1","#10b981","#f59e0b","#ec4899","#8b5cf6","#f97316","#22c55e"];

  const rows = data.map((d, i) => {
    const bw = Math.max((d.total / max) * barArea, 2);
    const y = i * rowH;
    const valLabel = d.total >= 1000 ? `$${(d.total / 1000).toFixed(0)}k` : `$${d.total.toFixed(0)}`;
    return `
      <text x="0" y="${y + 22}" font-family="Arial,sans-serif" font-size="12" fill="#374151">${fmtCat(d.category)}</text>
      <rect x="${labelW}" y="${y + 9}" width="${bw}" height="16" fill="${colors[i % colors.length]}" rx="3"/>
      <text x="${labelW + bw + 7}" y="${y + 22}" font-family="Arial,sans-serif" font-size="11" fill="#6b7280">${valLabel}</text>
    `;
  }).join("");

  return `<svg viewBox="0 0 ${maxWidth} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${h}px;display:block">${rows}</svg>`;
}

function buildMonthlyBarsSVG(data: MonthlyBreakdown[], w: number, h: number): string {
  const max = Math.max(...data.map((d) => d.total), 1);
  const pad = 30;
  const barW = Math.max(Math.floor((w - pad * 2) / data.length) - 4, 4);
  const chartH = h - 36;

  const bars = data.map((d, i) => {
    const bh = Math.max((d.total / max) * chartH, 2);
    const x = pad + i * (barW + 4);
    const y = chartH - bh;
    const label = fmtMonth(d.month);
    const valLabel = d.total >= 1000 ? `$${Math.round(d.total / 1000)}k` : `$${Math.round(d.total)}`;
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="#0ea5e9" rx="2" opacity="0.85"/>
      <text x="${x + barW / 2}" y="${h - 4}" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#9ca3af">${label}</text>
      ${bh > 18 ? `<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#6b7280">${valLabel}</text>` : ""}
    `;
  }).join("");

  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${h}px;display:block">${bars}</svg>`;
}

function generatePrintHTML(report: FullReport): string {
  const isClean = report.policy_summary === "clean";
  const catSVG = buildHorizBarsSVG(report.category_breakdown.slice(0, 8), 540);
  const monthSVG = buildMonthlyBarsSVG(report.monthly_breakdown, 560, 120);
  const topTxns = report.top_transactions.slice(0, 15);
  const extraCount = report.transaction_count - topTxns.length;

  const tableRows = topTxns.map((t, i) => `
    <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#fff"}">
      <td style="padding:7px 10px;font-size:11px;color:#374151;border-bottom:1px solid #e5e7eb">${t.date}</td>
      <td style="padding:7px 10px;font-size:11px;color:#111827;font-weight:500;border-bottom:1px solid #e5e7eb">${t.merchant}</td>
      <td style="padding:7px 10px;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb">${fmtCat(t.category)}</td>
      <td style="padding:7px 10px;font-size:11px;color:#111827;text-align:right;font-family:monospace;border-bottom:1px solid #e5e7eb">$${fmtAmt(t.amount)}</td>
    </tr>
  `).join("");

  const avgTxn = report.transaction_count > 0 ? report.total_amount / report.transaction_count : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${report.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111827; background: #fff; }
  @page { size: A4 portrait; margin: 14mm 16mm; }
  @media print { .no-print { display: none !important; } }
  .page { max-width: 740px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #0ea5e9; margin-bottom: 18px; }
  .logo { font-size: 17px; font-weight: 700; color: #0ea5e9; letter-spacing: -0.5px; }
  .logo-sub { font-size: 10px; color: #9ca3af; margin-top: 2px; letter-spacing: 0.05em; text-transform: uppercase; }
  .report-title { text-align: right; }
  .report-title h1 { font-size: 20px; font-weight: 700; color: #111827; }
  .report-title p { font-size: 11px; color: #6b7280; margin-top: 3px; }
  .meta-row { display: flex; gap: 24px; margin-bottom: 16px; font-size: 12px; }
  .meta-item strong { color: #374151; }
  .meta-item span { color: #6b7280; }
  .kpis { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 18px; }
  .kpi { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px 14px; }
  .kpi-value { font-size: 20px; font-weight: 700; color: #0369a1; font-family: monospace; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-top: 3px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
  .two-col { display: grid; grid-template-columns: 55% 43%; gap: 2%; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 7px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  th:last-child { text-align: right; }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
  .badge-clean { background: #dcfce7; color: #15803d; }
  .badge-violations { background: #fee2e2; color: #b91c1c; }
  .narrative { font-size: 12px; line-height: 1.65; color: #374151; background: #f8fafc; border-left: 3px solid #0ea5e9; padding: 12px 14px; border-radius: 4px; }
  .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
  .print-btn { position: fixed; top: 16px; right: 16px; padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; z-index: 999; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  .print-btn:hover { background: #0284c7; }
</style>
</head>
<body>
<button class="no-print print-btn" onclick="window.print()">Print / Save as PDF</button>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">Lucid</div>
      <div class="logo-sub">Powered by Brim · AI-Generated Report</div>
    </div>
    <div class="report-title">
      <h1>${report.title}</h1>
      <p>Generated ${new Date(report.generated_at).toLocaleDateString("en-CA", { year:"numeric",month:"long",day:"numeric" })}</p>
    </div>
  </div>

  <!-- Meta -->
  <div class="meta-row">
    <div class="meta-item"><strong>Card Group:</strong> <span>${report.employee_name}</span></div>
    <div class="meta-item"><strong>Department:</strong> <span>${report.department}</span></div>
    <div class="meta-item"><strong>Period:</strong> <span>${report.date_range.from} → ${report.date_range.to}</span></div>
    <div class="meta-item"><strong>Period Tag:</strong> <span>${report.event_tag || "All transactions"}</span></div>
    <div class="meta-item"><strong>Policy:</strong> <span class="badge ${isClean ? "badge-clean" : "badge-violations"}">${isClean ? "CLEAN" : "VIOLATIONS"}</span></div>
  </div>

  <!-- KPIs -->
  <div class="kpis">
    <div class="kpi">
      <div class="kpi-value">$${fmtAmt(report.total_amount)}</div>
      <div class="kpi-label">Total Spend</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${report.transaction_count.toLocaleString()}</div>
      <div class="kpi-label">Transactions</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">$${fmtAmt(avgTxn)}</div>
      <div class="kpi-label">Avg / Transaction</div>
    </div>
  </div>

  <!-- Charts row -->
  <div class="two-col section">
    <div>
      <div class="section-title">Spend by Category</div>
      ${catSVG}
    </div>
    <div>
      <div class="section-title">Monthly Trend</div>
      ${monthSVG}
    </div>
  </div>

  <!-- AI Narrative -->
  <div class="section">
    <div class="section-title">AI Executive Summary</div>
    <div class="narrative">${report.narrative.replace(/\n/g, "<br/>")}</div>
  </div>

  <!-- Top transactions table -->
  <div class="section">
    <div class="section-title">Top Transactions by Amount ${extraCount > 0 ? `(showing 15 of ${report.transaction_count})` : `(${report.transaction_count} total)`}</div>
    <table>
      <thead>
        <tr><th>Date</th><th>Merchant</th><th>Category</th><th style="text-align:right">Amount</th></tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:8px 10px;font-size:11px;font-weight:700;text-align:right;color:#374151">
            ${extraCount > 0 ? `+ ${extraCount.toLocaleString()} more transactions not shown` : "All transactions shown"}
          </td>
          <td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:right;color:#0369a1;font-family:monospace">
            $${fmtAmt(report.total_amount)}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>Report ID: ${report.id} · Lucid / Brim Financial</span>
    <span>This report was AI-generated. Verify figures before submission.</span>
  </div>

</div>
</body>
</html>`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [eventTag, setEventTag] = useState("");
  const [title, setTitle] = useState("");
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventTagOptions, setEventTagOptions] = useState<Array<{ value: string; label: string }>>([
    { value: "", label: "all transactions" },
  ]);

  useEffect(() => {
    if (!employeeId) {
      setEventTagOptions([{ value: "", label: "all transactions" }]);
      setEventTag("");
      return;
    }
    fetch(`/api/reports/event-tags?employee_id=${employeeId}`)
      .then((r) => r.json())
      .then((data) => {
        setEventTagOptions([
          { value: "", label: "all transactions" },
          ...(data.event_tags || []).map((t: { event_tag: string; txn_count: number; total: number }) => ({
            value: t.event_tag,
            label: `${t.event_tag}  (${t.txn_count} txns · $${Math.round(t.total).toLocaleString()})`,
          })),
        ]);
        setEventTag("");
      })
      .catch(() => {});
  }, [employeeId]);

  const generateReport = async () => {
    if (!employeeId) return;
    setLoading(true);
    setReport(null);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          event_tag: eventTag || undefined,
          title: title || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setReport(data.report ?? data); }
    } catch {
      setError("Failed to generate report");
    }
    setLoading(false);
  };

  const openPDF = () => {
    if (!report) return;
    const html = generatePrintHTML(report);
    const win = window.open("", "_blank", "width=920,height=1200");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  const isClean = report?.policy_summary === "clean";

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto page-transition relative" style={{ background: "var(--bg)" }}>
      <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />

      {/* Header */}
      <div className="mb-12 stagger-children relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-6" style={{ background: "var(--accent-primary)", opacity: 0.5 }} />
          <div className="mono-label" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>EXPENSE_REPORTS</div>
        </div>
        <h1 className="text-h2" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>
          Automated<br /><span style={{ color: "var(--text-sec)", opacity: 0.3 }}>Reports.</span>
        </h1>
        <p className="text-body mt-4 max-w-lg">
          Transactions grouped by period, with category charts, AI narrative, and one-click PDF export ready for CFO approval.
        </p>
      </div>

      {/* Config form */}
      <div className="tactile-base relative z-10 mb-6 animate-fade-up overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.04), transparent 60%)" }} />
        <div className="p-8 relative">
          <span className="mono-label block mb-6" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>REPORT_CONFIG</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <SelectDropdown
                label="Card Group"
                options={employees.map((e) => ({ value: e.id, label: e.name }))}
                value={employeeId}
                onChange={setEmployeeId}
                placeholder="select card group"
              />
            </div>
            <div>
              <SelectDropdown
                label="Period / Month"
                options={eventTagOptions}
                value={eventTag}
                onChange={setEventTag}
                placeholder="auto-detect"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mono-label block mb-3">Title (optional)</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Fleet Operations — Q1 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <button
            className="w-full py-3.5 text-sm font-medium transition-all"
            onClick={generateReport}
            disabled={loading || !employeeId}
            style={{
              background: loading || !employeeId ? "transparent" : "var(--accent-primary)",
              color: loading || !employeeId ? "var(--text-sec)" : "#fff",
              border: `1px solid ${loading || !employeeId ? "var(--borderline)" : "var(--accent-primary)"}`,
              boxShadow: !loading && employeeId ? "0 0 30px rgba(56,189,248,0.25)" : undefined,
            }}
          >
            <span className="flex items-center gap-3 justify-center">
              {loading ? "Generating with Claude AI..." : "Generate Report"}
              {!loading && <span>→</span>}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="relative overflow-hidden p-6 mb-6 animate-fade-up z-10"
          style={{ borderLeft: "2px solid var(--accent-red)", background: "rgba(239,68,68,0.04)" }}>
          <span className="mono-label block mb-1" style={{ color: "var(--accent-red)" }}>ERROR</span>
          <p className="text-sm" style={{ color: "var(--text-sec)" }}>{error}</p>
        </div>
      )}

      {report && (
        <div className="animate-fade-up relative z-10 space-y-4">

          {/* Report header card */}
          <div className="tactile-base relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(to right, ${isClean ? "var(--accent-green)" : "var(--accent-red)"}, transparent)` }} />
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="mono-label block mb-2" style={{ color: "var(--text-sec)" }}>AI_GENERATED_REPORT</span>
                  <h2 className="text-xl font-semibold tracking-tight">{report.title}</h2>
                  <p className="mono-label mt-1" style={{ color: "var(--text-sec)" }}>
                    {report.employee_name} · {report.date_range.from} → {report.date_range.to}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge badge-${isClean ? "approved" : "critical"}`}>
                    {isClean ? "POLICY CLEAN" : "VIOLATIONS"}
                  </span>
                  <button
                    onClick={openPDF}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all"
                    style={{
                      background: "var(--accent-primary)",
                      color: "#fff",
                      border: "1px solid var(--accent-primary)",
                      borderRadius: 6,
                      boxShadow: "0 0 20px rgba(56,189,248,0.2)",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export PDF
                  </button>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "TOTAL SPEND", value: `$${fmtAmt(report.total_amount)}`, color: "var(--accent-green)" },
                  { label: "TRANSACTIONS", value: report.transaction_count.toLocaleString(), color: "var(--accent-primary)" },
                  { label: "AVG / TXN", value: `$${fmtAmt(report.transaction_count > 0 ? report.total_amount / report.transaction_count : 0)}`, color: "var(--accent-primary)" },
                ].map((kpi, i) => (
                  <div key={i} className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
                    <div className="text-xl font-semibold tracking-tighter"
                      style={{ fontFamily: "var(--font-display), Georgia, serif", color: kpi.color }}>
                      {kpi.value}
                    </div>
                    <div className="mono-label mt-1" style={{ opacity: 0.4 }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category chart */}
            <div className="tactile-base relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
              <div className="p-6">
                <span className="mono-label block mb-4" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>SPEND_BY_CATEGORY</span>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={report.category_breakdown.slice(0, 7).map((c) => ({ ...c, name: fmtCat(c.category) }))}
                      layout="vertical"
                      margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v: number) => [`$${fmtAmt(v)}`, "Total"]}
                        contentStyle={{ background: "rgba(7,9,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 }}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar dataKey="total" radius={[0, 3, 3, 0]}>
                        {report.category_breakdown.slice(0, 7).map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Monthly trend */}
            <div className="tactile-base relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
              <div className="p-6">
                <span className="mono-label block mb-4" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>MONTHLY_TREND</span>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={report.monthly_breakdown.map((m) => ({ ...m, label: fmtMonth(m.month) }))}
                      margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
                    >
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`}
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                      />
                      <Tooltip
                        formatter={(v: number) => [`$${fmtAmt(v)}`, "Spend"]}
                        contentStyle={{ background: "rgba(7,9,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 }}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar dataKey="total" fill="var(--accent-primary)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* AI Narrative */}
          <div className="tactile-base relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-cyan), transparent)" }} />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--accent-cyan)", flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="2.5" fill="currentColor" />
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                </svg>
                <span className="mono-label" style={{ color: "var(--accent-cyan)", opacity: 0.7 }}>CLAUDE_NARRATIVE</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-sec)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                {report.narrative}
              </p>
            </div>
          </div>

          {/* Top transactions table */}
          <div className="tactile-base relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, rgba(255,255,255,0.1), transparent)" }} />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="mono-label" style={{ opacity: 0.5 }}>
                  TOP_TRANSACTIONS — showing {Math.min(report.top_transactions.length, 15)} of {report.transaction_count.toLocaleString()}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Merchant</th>
                      <th>Category</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_transactions.slice(0, 15).map((t) => (
                      <tr key={t.id} className="table-row-hover">
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{t.date}</td>
                        <td className="font-medium" style={{ color: "var(--text-main)" }}>{t.merchant}</td>
                        <td><span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-sec)" }}>{fmtCat(t.category)}</span></td>
                        <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>${fmtAmt(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {report.transaction_count > 15 && (
                <p className="mono-label mt-3" style={{ opacity: 0.35 }}>
                  + {(report.transaction_count - 15).toLocaleString()} more transactions included in PDF export
                </p>
              )}
            </div>
          </div>

          {/* Export CTA */}
          <div className="flex justify-end">
            <button
              onClick={openPDF}
              className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all"
              style={{
                background: "var(--accent-primary)",
                color: "#fff",
                border: "1px solid var(--accent-primary)",
                borderRadius: 8,
                boxShadow: "0 0 30px rgba(56,189,248,0.2)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export as PDF — Print-Ready Report
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
