"use client";

import { useState } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";
import { SelectDropdown } from "@/components/ui/select-dropdown";

interface ComplianceResult {
  compliant: boolean;
  requires_approval: boolean;
  issues: Array<{ rule: string; severity: string; detail: string }>;
  policy_summary: { approval_threshold: number; applied_limit: number | null };
}

export default function CompliancePage() {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");
  const [attendeeCount, setAttendeeCount] = useState("1");
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState(false);

  const checkCompliance = async () => {
    if (!amount || !merchant || !category) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), merchant, category, attendee_count: parseInt(attendeeCount) || 1 }),
      });
      setResult(await res.json());
    } catch {
      console.error("Compliance check failed");
    }
    setLoading(false);
  };

  const categoryOptions = [
    { value: "meals", label: "Meals & Dining" },
    { value: "flights", label: "Flights" },
    { value: "hotels", label: "Hotels" },
    { value: "transportation", label: "Transportation" },
    { value: "office_supplies", label: "Office Supplies" },
    { value: "software_saas", label: "Software / SaaS" },
    { value: "conference_registration", label: "Conference Registration" },
    { value: "equipment", label: "Equipment" },
    { value: "entertainment", label: "Entertainment" },
    { value: "training", label: "Training" },
  ];

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto page-transition relative" style={{ background: "var(--bg)" }}>
      <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />

      {/* Header */}
      <div className="mb-12 stagger-children relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-6" style={{ background: "var(--accent-cyan)", opacity: 0.5 }} />
          <div className="mono-label" style={{ color: "var(--accent-cyan)", opacity: 0.7 }}>BRIM_CHALLENGE // FEATURE_02</div>
        </div>
        <h1 className="text-h2" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>
          Policy<br /><span style={{ color: "var(--text-sec)", opacity: 0.3 }}>Compliance.</span>
        </h1>
        <p className="text-body mt-4 max-w-lg">
          AI understands context — a $200 team dinner is different from a $200 solo dinner. Flags violations and ranks by severity.
        </p>
      </div>

      {/* Form card */}
      <div className="tactile-base relative z-10 mb-6 overflow-hidden animate-fade-up">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-cyan), transparent)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.04), transparent 60%)" }} />
        <div className="p-8 relative">
          <span className="mono-label block mb-6" style={{ color: "var(--accent-cyan)", opacity: 0.7 }}>TRANSACTION_DETAILS</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="mono-label block mb-3">Amount ($)</label>
              <input className="input" type="number" step="0.01" placeholder="350.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="mono-label block mb-3">Merchant</label>
              <input className="input" type="text" placeholder="marriott hotels" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
            </div>
            <div>
              <SelectDropdown
                label="Category"
                options={categoryOptions}
                value={category}
                onChange={setCategory}
                placeholder="select category"
              />
            </div>
            <div>
              <label className="mono-label block mb-3">Attendees</label>
              <input className="input" type="number" min="1" placeholder="1" value={attendeeCount} onChange={(e) => setAttendeeCount(e.target.value)} />
            </div>
          </div>
          <button
            className="w-full py-3.5 text-sm font-medium transition-all"
            onClick={checkCompliance}
            disabled={loading || !amount || !merchant || !category}
            style={{
              background: loading || !amount || !merchant || !category ? "transparent" : "var(--accent-primary)",
              color: loading || !amount || !merchant || !category ? "var(--text-sec)" : "#fff",
              border: `1px solid ${loading || !amount || !merchant || !category ? "var(--borderline)" : "var(--accent-primary)"}`,
              boxShadow: !loading && amount && merchant && category ? "0 0 30px rgba(56,189,248,0.25)" : undefined,
            }}
          >
            <span className="flex items-center gap-3 justify-center">
              {loading ? "Analyzing with AI..." : "Validate Compliance"}
              {!loading && <span>→</span>}
            </span>
          </button>
        </div>
      </div>

      {result && (
        <div className="tactile-base relative z-10 overflow-hidden animate-fade-up">
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, ${result.compliant ? "var(--accent-green)" : "var(--accent-red)"}, transparent)` }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 0% 0%, ${result.compliant ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)"}, transparent 60%)` }} />

          {/* Header */}
          <div className="p-8 border-b relative" style={{ borderColor: "var(--borderline)" }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="mono-label block mb-2" style={{ color: "var(--text-sec)" }}>AI_ANALYSIS_RESULT</span>
                <h2
                  className="text-2xl tracking-tight"
                  style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400, color: result.compliant ? "var(--accent-green)" : "var(--accent-red)" }}
                >
                  {result.compliant ? "Compliant" : "Violations Detected"}
                </h2>
              </div>
              <span className={`badge ${result.compliant ? "badge-approved" : "badge-critical"}`} style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem" }}>
                {result.compliant ? "PASS" : "FAIL"}
              </span>
            </div>
            {result.requires_approval && (
              <p className="mono-label mt-3" style={{ color: "var(--accent-amber)" }}>
                REQUIRES_APPROVAL — Threshold: ${result.policy_summary.approval_threshold}
              </p>
            )}
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="p-8 relative">
              <span className="mono-label block mb-4">ISSUES_FOUND</span>
              <div className="space-y-3">
                {result.issues.map((issue, i) => (
                  <div
                    key={i}
                    className="p-4 animate-slide-up"
                    style={{
                      borderLeft: `2px solid ${issue.severity === "critical" ? "var(--accent-red)" : issue.severity === "high" ? "#f97316" : "var(--accent-amber)"}`,
                      background: `${issue.severity === "critical" ? "rgba(239,68,68,0.04)" : issue.severity === "high" ? "rgba(249,115,22,0.04)" : "rgba(245,158,11,0.04)"}`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                      <span className="mono-label">{issue.rule.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-sec)" }}>{issue.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.policy_summary.applied_limit && (
            <div className="px-8 pb-8 relative">
              <span className="mono-label" style={{ color: "var(--text-sec)" }}>
                CATEGORY_LIMIT: ${result.policy_summary.applied_limit}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
