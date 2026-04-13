"use client";

import { useEffect, useState } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";

interface Approval {
  id: string;
  transaction_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  amount: number;
  merchant: string;
  description: string;
  ai_recommendation: string;
  ai_reasoning: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);

  const loadApprovals = async () => {
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch {
      console.error("Failed to load approvals");
    }
    setLoading(false);
  };

  useEffect(() => { loadApprovals(); }, []);

  const handleGenerateAI = async (id: string) => {
    setGeneratingAI(id);
    try {
      const res = await fetch(`/api/approvals/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.approval) {
        // Optimistic update with the returned approval data
        setApprovals(prev =>
          prev.map(a => a.id === id ? { ...a, ...data.approval } : a)
        );
      } else {
        await loadApprovals();
      }
    } catch {
      console.error("AI generation failed");
    }
    setGeneratingAI(null);
  };

  const handleAction = async (id: string, action: "approved" | "denied") => {
    setActionLoading(id);
    // Optimistic update — move the card immediately so the UI responds even on Vercel
    setApprovals(prev =>
      prev.map(a => a.id === id ? { ...a, status: action, resolved_at: new Date().toISOString() } : a)
    );
    try {
      await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
    } catch {
      console.error("Action failed");
    }
    setActionLoading(null);
  };

  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen relative" style={{ background: "var(--bg)" }}>
        <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />
        <div className="text-center relative z-10">
          <div className="spinner mx-auto mb-4" style={{ borderTopColor: "var(--accent-primary)" }} />
          <span className="mono-label" style={{ color: "var(--accent-primary)", opacity: 0.6 }}>Loading approvals...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto page-transition relative" style={{ background: "var(--bg)" }}>
      <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />

      {/* Header */}
      <div className="flex items-end justify-between mb-12 animate-fade-up relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-6" style={{ background: "var(--gradient-violet)", opacity: 0.5 }} />
            <div className="mono-label" style={{ color: "var(--gradient-violet)", opacity: 0.7 }}>APPROVAL_WORKFLOW</div>
          </div>
          <h1 className="text-h2" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>
            Pre-Approval<br /><span style={{ color: "var(--text-sec)", opacity: 0.3 }}>Workflow.</span>
          </h1>
          <p className="text-body mt-4 max-w-lg">
            AI-generated recommendations with full context: spend history, budget status, and reasoning. One-click decisions.
          </p>
        </div>
        <div className="text-right">
          <span
            className="text-3xl"
            style={{ fontFamily: "var(--font-display), Georgia, serif", color: pending.length > 0 ? "var(--accent-primary)" : "var(--accent-green)" }}
          >
            {pending.length}
          </span>
          <p className="mono-label">PENDING</p>
        </div>
      </div>

      {/* Advisory notice */}
      <div className="mb-8 px-4 py-3 flex items-center gap-3 animate-fade-up relative z-10"
        style={{ background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.1)", borderRadius: 8 }}>
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: "var(--accent-primary)", opacity: 0.5 }} />
        <p className="text-xs" style={{ color: "var(--text-sec)", lineHeight: 1.6 }}>
          <span style={{ color: "var(--text-main)", fontWeight: 500 }}>AI recommendations are advisory only.</span>
          {" "}All decisions require human approval. Reasoning is shown for every suggestion so you can agree or override with full context.
        </p>
      </div>

      {/* Pending */}
      {pending.length === 0 ? (
        <div className="tactile-base relative overflow-hidden p-12 text-center mb-10 animate-fade-up relative z-10">
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-green), transparent)" }} />
          <span className="mono-label block mb-4" style={{ color: "var(--accent-green)" }}>STATUS_CLEAR</span>
          <h2 className="text-h3" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>All caught up.</h2>
          <p className="text-body mt-2">No pending approvals in the queue.</p>
        </div>
      ) : (
        <div className="space-y-6 mb-10 relative z-10">
          {pending.map((a, index) => (
            <div
              key={a.id}
              className="tactile-base relative overflow-hidden animate-fade-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-primary), transparent)" }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 0% 0%, rgba(245,158,11,0.04), transparent 60%)" }} />
              <div className="p-8 relative">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold tracking-tight">{a.merchant}</h3>
                      <span className="badge badge-pending">PENDING</span>
                    </div>
                    <span className="mono-label">{a.employee_name} · {a.created_at?.split("T")[0] || ""}</span>
                    <p className="text-sm mt-2" style={{ color: "var(--text-sec)" }}>{a.description}</p>
                  </div>
                  <span
                    className="text-2xl tracking-tighter kpi-glow-blue"
                    style={{ fontFamily: "var(--font-display), Georgia, serif", color: "var(--accent-primary)" }}
                  >
                    ${a.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* AI Recommendation */}
                {a.ai_recommendation ? (
                  <div
                    className="p-5 mb-6"
                    style={{
                      borderLeft: `2px solid ${a.ai_recommendation === "approve" ? "var(--accent-green)" : "var(--accent-red)"}`,
                      background: a.ai_recommendation === "approve" ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
                    }}
                  >
                    <span className="mono-label block mb-2" style={{ color: a.ai_recommendation === "approve" ? "var(--accent-green)" : "var(--accent-red)" }}>
                      AI_RECOMMENDATION: {a.ai_recommendation.toUpperCase()}
                    </span>
                    <p className="text-sm" style={{ color: "var(--text-sec)" }}>{a.ai_reasoning}</p>
                  </div>
                ) : (
                  <button
                    className="w-full p-4 mb-6 text-sm transition-all"
                    onClick={() => handleGenerateAI(a.id)}
                    disabled={generatingAI === a.id}
                    style={{
                      border: "1px dashed rgba(56,189,248,0.3)",
                      background: "rgba(56,189,248,0.03)",
                      color: generatingAI === a.id ? "var(--text-sec)" : "var(--accent-primary)",
                    }}
                  >
                    {generatingAI === a.id ? "Generating AI analysis..." : "Generate AI Recommendation →"}
                  </button>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    className="btn-approve flex-1 py-3"
                    onClick={() => handleAction(a.id, "approved")}
                    disabled={actionLoading === a.id}
                  >
                    {actionLoading === a.id ? "Processing..." : "Approve →"}
                  </button>
                  <button
                    className="btn-deny flex-1 py-3"
                    onClick={() => handleAction(a.id, "denied")}
                    disabled={actionLoading === a.id}
                  >
                    Deny ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="animate-fade-up delay-2 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-6" style={{ background: "var(--text-sec)", opacity: 0.3 }} />
            <span className="mono-label">RESOLVED_ITEMS</span>
          </div>
          <div className="tactile-base overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((a) => (
                  <tr key={a.id} className="table-row-hover">
                    <td className="font-medium" style={{ color: "var(--text-main)" }}>{a.employee_name}</td>
                    <td>{a.merchant}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>${a.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><span className={`badge badge-${a.status}`}>{a.status.toUpperCase()}</span></td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-sec)", fontSize: "0.75rem" }}>
                      {a.resolved_at ? new Date(a.resolved_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
