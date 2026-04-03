"use client";

import { useState } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";
import { SelectDropdown } from "@/components/ui/select-dropdown";

interface ReportResult {
  report_id: string;
  narrative: string;
  total_amount: number;
  transaction_count: number;
}

const employees = [
  { id: "emp-001", name: "Alice Chen" },
  { id: "emp-002", name: "Bob Martinez" },
  { id: "emp-003", name: "Carol Johnson" },
  { id: "emp-004", name: "David Kim" },
  { id: "emp-005", name: "Eve Patel" },
  { id: "emp-006", name: "Frank Wilson" },
  { id: "emp-007", name: "Grace Lee" },
];

const eventTags = [
  { value: "", label: "auto-detect" },
  { value: "sf-offsite-q1", label: "sf offsite q1" },
  { value: "nyc-acme-deal", label: "nyc acme deal" },
  { value: "product-launch-q1", label: "product launch q1" },
];

export default function ReportsPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [eventTag, setEventTag] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    if (!employeeId) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, event_tag: eventTag || undefined, title: title || undefined }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data); }
    } catch {
      setError("Failed to generate report");
    }
    setLoading(false);
  };

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto page-transition relative" style={{ background: "var(--bg)" }}>
      <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />

      {/* Header */}
      <div className="mb-12 stagger-children relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-6" style={{ background: "var(--accent-primary)", opacity: 0.5 }} />
          <div className="mono-label" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>BRIM_CHALLENGE // FEATURE_04</div>
        </div>
        <h1 className="text-h2" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>
          Automated<br /><span style={{ color: "var(--text-sec)", opacity: 0.3 }}>Reports.</span>
        </h1>
        <p className="text-body mt-4 max-w-lg">
          Transactions grouped by trip/event, linked to spend categories, with built-in policy checks. Ready for CFO approval.
        </p>
      </div>

      {/* Form card */}
      <div className="tactile-base relative z-10 mb-6 animate-fade-up">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.04), transparent 60%)" }} />
        <div className="p-8 relative">
          <span className="mono-label block mb-6" style={{ color: "var(--accent-primary)", opacity: 0.7 }}>REPORT_CONFIG</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <SelectDropdown
                label="Employee"
                options={employees.map((e) => ({ value: e.id, label: e.name }))}
                value={employeeId}
                onChange={setEmployeeId}
                placeholder="select employee"
              />
            </div>
            <div>
              <SelectDropdown
                label="Event / Trip"
                options={eventTags}
                value={eventTag}
                onChange={setEventTag}
                placeholder="auto-detect"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mono-label block mb-3">Title (optional)</label>
              <input className="input" type="text" placeholder="q1 conference expenses" value={title} onChange={(e) => setTitle(e.target.value)} />
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
        <div
          className="relative overflow-hidden p-6 mb-6 animate-fade-up z-10"
          style={{ borderLeft: "2px solid var(--accent-red)", background: "rgba(239,68,68,0.04)" }}
        >
          <span className="mono-label block mb-1" style={{ color: "var(--accent-red)" }}>ERROR</span>
          <p className="text-sm" style={{ color: "var(--text-sec)" }}>{error}</p>
        </div>
      )}

      {result && (
        <div className="tactile-base relative overflow-hidden animate-fade-up z-10">
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-green), transparent)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 0% 0%, rgba(34,197,94,0.04), transparent 60%)" }} />
          <div className="p-8 border-b relative" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between">
              <span className="mono-label" style={{ color: "var(--text-sec)" }}>AI_GENERATED_REPORT</span>
              <div className="flex items-center gap-4">
                <span className="badge badge-approved">{result.transaction_count} TRANSACTIONS</span>
                <span
                  className="text-2xl tracking-tighter kpi-glow-green"
                  style={{ fontFamily: "var(--font-display), Georgia, serif", color: "var(--accent-green)" }}
                >
                  ${result.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="p-8 relative">
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text-sec)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}
            >
              {result.narrative}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
