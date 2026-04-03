"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const SKY = "#38BDF8";
const SKY_DIM = "rgba(56,189,248,0.12)";
const SKY_BORDER = "rgba(56,189,248,0.25)";
const TOUR_KEY = "expense-ai-tour-v5";

interface TourStep {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  hint: string;
  route: string;
  required?: boolean;
}

const STEPS: TourStep[] = [
  {
    id: "welcome",
    tag: "INITIALIZE",
    tagColor: SKY,
    title: "Welcome to Expense Intelligence",
    description: "AI-powered expense management built on Claude API. 4 required features + optional capabilities, running on 6 months of real Brim card data across 9 employees.",
    hint: "Hit RELOAD_DATA in the top nav first — it seeds real Brim transaction data and makes every feature come alive.",
    route: "/dashboard",
  },
  {
    id: "dashboard",
    tag: "FEATURE_00 — OVERVIEW",
    tagColor: SKY,
    title: "Live Intelligence Dashboard",
    description: "Real-time KPIs from 4,180 Brim card transactions (Aug 2025–Mar 2026). Pending approvals, open policy violations, and department budget health at a glance.",
    hint: "The SPEND_QTD figure is the real sum of all Brim transactions. Departments hitting 80%+ budget threshold are flagged red automatically.",
    route: "/dashboard",
    required: true,
  },
  {
    id: "query",
    tag: "FEATURE_01 — AI QUERY",
    tagColor: SKY,
    title: "Talk to Your Data",
    description: "Natural language interface backed by Claude's multi-step reasoning. The agent picks and chains the right tools — SQL queries, aggregations, visualizations — to answer anything.",
    hint: `Try asking: "Who are the top 3 spenders this quarter?" or "Show me all policy violations for the Operations team"`,
    route: "/query",
    required: true,
  },
  {
    id: "compliance",
    tag: "FEATURE_02 — COMPLIANCE",
    tagColor: "#22D3EE",
    title: "Contextual Policy Compliance",
    description: "Goes beyond rule matching — AI understands intent. A $200 dinner for 4 people is fine; the same amount solo is a violation. Flags issues by severity with full reasoning.",
    hint: `Try: Amount $280, Merchant "STK Steakhouse", Category "meals", Attendees 1. Watch it flag a per-person limit violation.`,
    route: "/compliance",
    required: true,
  },
  {
    id: "approvals",
    tag: "FEATURE_03 — APPROVALS",
    tagColor: "#A78BFA",
    title: "AI Pre-Approval Workflow",
    description: "Every pending expense includes an AI recommendation (approve/deny), employee spend history, current budget headroom, and clear reasoning. One-click decisions.",
    hint: "Each card shows AI confidence and reasoning. Try approving or denying a real pending expense from the Brim dataset.",
    route: "/approvals",
    required: true,
  },
  {
    id: "reports",
    tag: "FEATURE_04 — REPORTS",
    tagColor: "#34D399",
    title: "Automated Expense Reports",
    description: "Select any employee. Claude groups their transactions by trip or project, writes an executive narrative, and adds policy annotations — in seconds.",
    hint: "Pick an employee from the dropdown and click Generate Report. Claude writes a real narrative from their actual Brim transaction data.",
    route: "/reports",
    required: true,
  },
  {
    id: "anomalies",
    tag: "OPTIONAL — ANOMALY DETECTION",
    tagColor: "#EF4444",
    title: "Fraud & Anomaly Detection",
    description: "Statistical analysis of the Brim dataset detects split charges (avoiding approval thresholds), duplicate transactions, round-number patterns, and velocity spikes.",
    hint: "These anomalies were detected automatically when the data was seeded. Critical = suspected fraud. High = needs review.",
    route: "/anomalies",
  },
  {
    id: "budgets",
    tag: "OPTIONAL — BUDGET TRACKING",
    tagColor: SKY,
    title: "Department Budget Tracking",
    description: "Actual spend for each department vs allocated budget. Operations runs lean; other departments show projected overruns derived directly from the real XLSX export.",
    hint: "Bars turn orange at 60% utilization and red at 80%. Each row shows remaining headroom and projected end-of-quarter burn.",
    route: "/budgets",
  },
  {
    id: "insights",
    tag: "OPTIONAL — INSIGHTS",
    tagColor: "#F59E0B",
    title: "Proactive Financial Insights",
    description: "Three intelligence modules: vendor consolidation opportunities with estimated savings, department budget forecasting with overrun dates, and peer benchmarking across employees.",
    hint: "The Vendor tab shows how consolidating suppliers could cut costs by 12%. Budget Forecast shows which departments will overrun and when.",
    route: "/insights",
  },
  {
    id: "complete",
    tag: "DEMO COMPLETE",
    tagColor: "#22C55E",
    title: "Built with Claude API",
    description: "All 4 required Brim features implemented, plus anomaly detection, budget tracking, and insights. The AI agent chains SQL queries, aggregations, and analysis for complex financial questions.",
    hint: "Best demo path: seed data → ask a complex query → run compliance check → approve an expense → generate a report.",
    route: "/dashboard",
  },
];

export function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  // Show tour on first visit
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      const t = setTimeout(() => {
        setActive(true);
        setVisible(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Navigate when step changes (non-blocking — never disables UI)
  useEffect(() => {
    if (!active) return;
    router.push(STEPS[step].route);
  }, [step, active]); // eslint-disable-line react-hooks/exhaustive-deps

  const completeTour = useCallback(() => {
    setVisible(false);
    setTimeout(() => setActive(false), 300);
    localStorage.setItem(TOUR_KEY, "true");
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(TOUR_KEY);
    setStep(0);
    setActive(true);
    setVisible(true);
    router.push(STEPS[0].route);
  }, [router]);

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else completeTour();
  }, [step, completeTour]);

  const goPrev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  // Restart button (shown when tour is inactive)
  if (!active) {
    return (
      <button
        onClick={restartTour}
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-3.5 py-2 transition-all duration-300 hover:opacity-90 active:scale-95 cursor-pointer"
        title="Restart Demo Tour"
        style={{
          background: SKY_DIM,
          border: `1px solid ${SKY_BORDER}`,
          borderRadius: "10px",
          color: SKY,
        }}
      >
        <span className="inline-flex w-1.5 h-1.5 rounded-full" style={{ background: SKY, boxShadow: `0 0 6px ${SKY}` }} />
        <span className="font-mono tracking-widest uppercase text-[10px]">Tour</span>
      </button>
    );
  }

  const current = STEPS[step];
  const accent = current.tagColor;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999]"
      style={{
        width: "clamp(300px, 90vw, 380px)",
        transition: "opacity 0.3s, transform 0.3s",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          background: "rgba(9,11,20,0.97)",
          border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: "16px",
          boxShadow: "0 20px 60px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          overflow: "hidden",
        }}
      >
        {/* Top accent line */}
        <div
          className="h-[2px]"
          style={{
            background: `linear-gradient(to right, ${accent}, ${accent}40, transparent)`,
            transition: "background 0.4s",
          }}
        />

        {/* Header row */}
        <div className="px-4 pt-3.5 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: accent, boxShadow: `0 0 6px ${accent}`, transition: "background 0.4s, box-shadow 0.4s" }}
            />
            <span
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: accent, opacity: 0.85, transition: "color 0.4s" }}
            >
              {current.tag}
            </span>
            {current.required && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5"
                style={{
                  background: `${accent}18`,
                  border: `1px solid ${accent}30`,
                  borderRadius: "4px",
                  color: accent,
                  opacity: 0.7,
                }}
              >
                REQ
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Progress dots */}
            <div className="flex items-center gap-[3px]">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="cursor-pointer transition-all duration-300 rounded-full"
                  style={{
                    width: i === step ? "14px" : "4px",
                    height: "4px",
                    background:
                      i === step
                        ? accent
                        : i < step
                        ? "rgba(56,189,248,0.35)"
                        : "rgba(255,255,255,0.13)",
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
              {step + 1}/{STEPS.length}
            </span>
            <button
              onClick={completeTour}
              className="w-6 h-6 flex items-center justify-center rounded-md cursor-pointer transition-all hover:bg-white/8"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pt-3 pb-4">
          <h3 className="text-sm font-semibold text-white mb-1.5 tracking-tight leading-snug">
            {current.title}
          </h3>
          <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.48)" }}>
            {current.description}
          </p>

          {/* Hint callout */}
          <div
            className="rounded-xl px-3 py-2.5 mb-3.5"
            style={{ background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)" }}
          >
            <p className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: SKY, opacity: 0.6 }}>
              TRY THIS
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
              {current.hint}
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-px rounded-full mb-3.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((step + 1) / STEPS.length) * 100}%`,
                background: `linear-gradient(to right, ${accent}, ${accent}70)`,
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={goPrev}
              className="px-3 py-1.5 rounded-lg text-xs transition-all duration-200 cursor-pointer hover:bg-white/5"
              style={{
                color: "rgba(255,255,255,0.45)",
                opacity: step > 0 ? 1 : 0,
                pointerEvents: step > 0 ? "auto" : "none",
              }}
            >
              ← Back
            </button>

            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 cursor-pointer"
              style={{
                background: isLast ? "#22C55E" : accent,
                color: "#000",
                transition: "background 0.4s",
              }}
            >
              {isLast ? "Finish Tour" : "Next"}
              {!isLast && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5h6M5.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
