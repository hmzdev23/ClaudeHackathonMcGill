"use client";

import { useEffect, useState } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";

interface StoredAnomaly {
  id: string;
  type: string;
  transaction_ids: string;
  employee_id: string;
  employee_name?: string;
  description: string;
  severity: string;
  detected_at: string;
  status: string;
}

interface AnomalyData {
  anomalies?: StoredAnomaly[];
  stored_anomalies?: StoredAnomaly[];
}

const typeLabels: Record<string, string> = {
  split_charge: "SPLIT_CHARGE",
  duplicate: "DUPLICATE",
  round_number: "ROUND_NUMBER",
  velocity: "VELOCITY_SPIKE",
  unusual_merchant: "UNUSUAL_MERCHANT",
};

export default function AnomaliesPage() {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/anomalies");
        setData(await res.json());
      } catch {
        console.error("Failed to load anomalies");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen relative" style={{ background: "var(--bg)" }}>
        <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />
        <div className="text-center relative z-10">
          <div className="spinner mx-auto mb-4" style={{ borderTopColor: "var(--accent-red)" }} />
          <span className="mono-label" style={{ color: "var(--accent-red)", opacity: 0.6 }}>Scanning anomalies...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const anomalies = data.anomalies ?? data.stored_anomalies ?? [];
  const critical = anomalies.filter((a) => a.severity === "critical").length;
  const high = anomalies.filter((a) => a.severity === "high").length;
  const medium = anomalies.filter((a) => a.severity === "medium").length;

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto page-transition relative" style={{ background: "var(--bg)" }}>
      <BGPattern variant="grid" mask="fade-three-sides" size={32} fill="rgba(255,255,255,0.025)" />

      {/* Header */}
      <div className="mb-12 stagger-children relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-6" style={{ background: "var(--accent-red)", opacity: 0.5 }} />
          <div className="mono-label" style={{ color: "var(--accent-red)", opacity: 0.7 }}>OPTIONAL // ANOMALY_DETECTION</div>
        </div>
        <h1 className="text-h2" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>
          Fraud &<br /><span style={{ color: "var(--text-sec)", opacity: 0.3 }}>Anomalies.</span>
        </h1>
        <p className="text-body mt-4 max-w-lg">
          AI detection of split charges, duplicates, round-number patterns, and unusual merchant activity.
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-[1px] bg-[var(--borderline)] border border-[var(--borderline)] mb-12 animate-fade-up relative z-10">
        {[
          { label: "CRITICAL", count: critical, color: "var(--accent-red)", bgGlow: "rgba(239,68,68,0.06)", glowClass: "kpi-glow-red" },
          { label: "HIGH", count: high, color: "#f97316", bgGlow: "rgba(249,115,22,0.05)", glowClass: "" },
          { label: "MEDIUM", count: medium, color: "var(--accent-amber)", bgGlow: "rgba(245,158,11,0.05)", glowClass: "kpi-glow-gold" },
        ].map((s, i) => (
          <div
            key={i}
            className="p-7 flex flex-col justify-between min-h-[120px] relative overflow-hidden"
            style={{ background: "var(--surface)", borderTop: `2px solid ${s.color}` }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${s.bgGlow}, transparent 70%)` }} />
            <span className="mono-label block mb-4 relative" style={{ color: s.color, opacity: 0.7 }}>{s.label}</span>
            <div className="relative">
              <span
                className={`${s.glowClass} text-4xl`}
                style={{ color: s.color, fontFamily: "var(--font-display), Georgia, serif" }}
              >
                {s.count}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Anomaly list */}
      {anomalies.length === 0 ? (
        <div className="tactile-base relative overflow-hidden p-12 text-center animate-fade-up relative z-10">
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, var(--accent-green), transparent)" }} />
          <span className="mono-label block mb-4" style={{ color: "var(--accent-green)" }}>ALL_CLEAR</span>
          <h2 className="text-h3" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}>No anomalies detected.</h2>
          <p className="text-body mt-2 mb-4">Click <strong className="font-semibold" style={{ color: "var(--text-main)" }}>RELOAD_DATA</strong> in the top navbar to load demo data with real anomaly patterns.</p>
          <p className="mono-label" style={{ color: "var(--text-sec)", opacity: 0.45 }}>↑ Top right corner of the navigation bar</p>
        </div>
      ) : (
        <div className="space-y-[1px] bg-[var(--borderline)] border border-[var(--borderline)] animate-fade-up delay-2 relative z-10">
          {anomalies.map((a, i) => {
            const severityColor = a.severity === "critical" ? "var(--accent-red)" : a.severity === "high" ? "#f97316" : "var(--accent-amber)";
            return (
              <div
                key={i}
                className="relative overflow-hidden p-6 flex items-start gap-6 table-row-hover"
                style={{ background: "var(--surface)", animationDelay: `${i * 50}ms` }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: severityColor, opacity: 0.6 }} />
                <div className="flex-1 pl-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="mono-label" style={{ color: severityColor }}>{typeLabels[a.type] || a.type}</span>
                    <span className={`badge badge-${a.severity}`}>{a.severity.toUpperCase()}</span>
                    <span className={`badge badge-${a.status}`}>{a.status.toUpperCase()}</span>
                  </div>
                  <p className="text-sm mt-2" style={{ color: "var(--text-main)" }}>{a.description}</p>
                  <span className="mono-label mt-3 block">
                    CARD: {a.employee_name ?? a.employee_id} · DETECTED: {a.detected_at?.split("T")[0] || ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
