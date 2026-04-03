"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

const SKY = "#38BDF8";
const SKY_DIM = "rgba(56,189,248,0.12)";
const SKY_BORDER = "rgba(56,189,248,0.25)";

interface TourStep {
  id: string;
  feature: string;
  featureColor: string;
  title: string;
  description: string;
  hint?: string;       // demo action hint shown in a callout
  route: string;
  isRequired?: boolean;
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    feature: "INITIALIZE",
    featureColor: SKY,
    title: "Welcome to Expense Intelligence",
    description: "An AI-powered expense management platform built on Claude API for the Brim Financial Sub-Challenge. 4 required features + anomaly detection, running on 6 months of real corporate card data.",
    hint: `Click "Load Brim Data" on the dashboard to seed real transaction data — then the tour gets interesting.`,
    route: "/dashboard",
  },
  {
    id: "dashboard",
    feature: "FEATURE_00 — OVERVIEW",
    featureColor: SKY,
    title: "Live Intelligence Dashboard",
    description: "Real-time KPIs drawn from 4,180 actual Brim card transactions across 9 employees (Aug 2025–Mar 2026). Pending approvals, open violations, and department budget health at a glance.",
    hint: "The SPEND_QTD figure is the sum of all real transactions this quarter. Departments over 80% budget are flagged red.",
    route: "/dashboard",
  },
  {
    id: "query",
    feature: "FEATURE_01 — AI QUERY",
    featureColor: SKY,
    title: "Talk to Your Data",
    description: "Natural language interface backed by Claude's multi-step reasoning. The agent autonomously selects and chains the right tools — SQL queries, aggregations, visualizations — to answer any question.",
    hint: `Try: "Who are the top 3 spenders this quarter?" or "Show me all policy violations for the Operations team"`,
    route: "/query",
    isRequired: true,
  },
  {
    id: "compliance",
    feature: "FEATURE_02 — COMPLIANCE",
    featureColor: "#22D3EE",
    title: "Contextual Policy Compliance",
    description: "Goes beyond rule matching — AI understands intent. A $200 team dinner with 4 people is fine; the same amount for a solo meal is a violation. Flags issues by severity with full reasoning.",
    hint: `Try: Amount $280, Merchant "STK Steakhouse", Category "meals", Attendees 1. Watch it flag a per-person limit violation.`,
    route: "/compliance",
    isRequired: true,
  },
  {
    id: "approvals",
    feature: "FEATURE_03 — APPROVALS",
    featureColor: "#A78BFA",
    title: "AI Pre-Approval Workflow",
    description: "Every pending expense comes with an AI recommendation (approve/deny), the employee's spend history, current budget headroom, and clear reasoning. One-click decisions.",
    hint: "Each card shows the AI's recommendation with confidence reasoning. Try approving or denying a real pending expense.",
    route: "/approvals",
    isRequired: true,
  },
  {
    id: "reports",
    feature: "FEATURE_04 — REPORTS",
    featureColor: "#34D399",
    title: "Automated Expense Reports",
    description: "Select any employee. Claude groups their transactions by trip or project, writes an executive narrative, and adds policy annotations — all automatically, in seconds.",
    hint: "Select an employee from the dropdown and click Generate Report. Claude will write a real narrative from their actual transaction data.",
    route: "/reports",
    isRequired: true,
  },
  {
    id: "anomalies",
    feature: "OPTIONAL — ANOMALY DETECTION",
    featureColor: "#EF4444",
    title: "Fraud & Anomaly Detection",
    description: "Statistical analysis of the real Brim transaction dataset detects: split charges (avoiding approval thresholds), duplicate transactions, round-number patterns, and velocity spikes.",
    hint: "These anomalies were detected automatically on seed. Critical = suspected fraud. High = needs review.",
    route: "/anomalies",
  },
  {
    id: "budgets",
    feature: "OPTIONAL — BUDGET TRACKING",
    featureColor: SKY,
    title: "Department Budget Tracking",
    description: "Actual Q3 2025 spend for each department vs their allocated budget. Operations runs lean; other departments show projected overruns. Data is derived directly from the real XLSX export.",
    hint: "Bars turn orange at 60% utilization and red at 80%. Hover each department to see remaining headroom.",
    route: "/budgets",
  },
  {
    id: "complete",
    feature: "DEMO COMPLETE",
    featureColor: "#22C55E",
    title: "Built with Claude API",
    description: "All 4 required Brim challenge features implemented. The AI agent in lib/claude/agent.ts uses multi-step tool calling — it chains SQL queries, aggregations, and analysis to answer complex financial questions.",
    hint: "For the best demo: seed Brim data → ask a complex query → run a compliance check → approve a real expense → generate a report.",
    route: "/query",
  },
];

export function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"intro" | "explore">("intro");
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("expense-ai-tour-v4");
    if (!hasSeenTour) {
      const timer = setTimeout(() => setActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const currentStep = tourSteps[step];
    if (currentStep && pathname !== currentStep.route) {
      setIsNavigating(true);
      router.push(currentStep.route);
      const timer = setTimeout(() => setIsNavigating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [step, active, router, pathname]);

  useEffect(() => { setPhase("intro"); }, [step]);

  const completeTour = useCallback(() => {
    setActive(false);
    localStorage.setItem("expense-ai-tour-v4", "true");
  }, []);

  const handleNext = useCallback(() => {
    if (phase === "intro") {
      setPhase("explore");
    } else {
      if (step < tourSteps.length - 1) setStep((s) => s + 1);
      else completeTour();
    }
  }, [phase, step, completeTour]);

  const prevStep = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const restartTour = useCallback(() => {
    localStorage.removeItem("expense-ai-tour-v4");
    setStep(0);
    setPhase("intro");
    setActive(true);
    router.push("/dashboard");
  }, [router]);

  if (!active) {
    return (
      <button
        onClick={restartTour}
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-all duration-300 hover:opacity-90 active:scale-95 cursor-pointer"
        title="Restart Demo Tour"
        style={{
          background: SKY_DIM,
          border: `1px solid ${SKY_BORDER}`,
          borderRadius: "10px",
          color: SKY,
        }}
      >
        <span className="inline-flex w-1.5 h-1.5 rounded-full" style={{ background: SKY, boxShadow: `0 0 6px ${SKY}` }} />
        <span className="font-mono tracking-widest uppercase text-[10px]">Demo Tour</span>
      </button>
    );
  }

  const currentStep = tourSteps[step];
  const showBlur = phase === "intro";
  const accentColor = currentStep.featureColor;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] transition-all duration-500 ease-out ${
          showBlur ? "bg-black/55 backdrop-blur-sm" : "bg-transparent pointer-events-none"
        }`}
        onClick={() => showBlur && completeTour()}
      />

      {/* Tour panel */}
      <div
        className={`fixed z-[9999] transition-all duration-500 ease-out ${
          showBlur
            ? "bottom-1/2 translate-y-1/2 left-1/2 -translate-x-1/2"
            : "bottom-6 right-6 translate-y-0 translate-x-0 left-auto"
        }`}
      >
        <div
          className={`transition-all duration-500 ease-out ${showBlur ? "w-[92vw] max-w-[520px]" : "w-[360px]"}`}
          style={{
            background: "rgba(9,11,20,0.97)",
            border: `1px solid ${showBlur ? `rgba(56,189,248,0.2)` : "rgba(255,255,255,0.1)"}`,
            borderRadius: "16px",
            boxShadow: showBlur
              ? `0 32px 80px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px -20px ${accentColor}30`
              : "0 16px 48px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Top accent line */}
          <div className="rounded-t-2xl overflow-hidden">
            <div className="h-[2px]" style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColor}40, transparent)` }} />
          </div>

          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex w-1.5 h-1.5 rounded-full"
                style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
              />
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: accentColor, opacity: 0.85 }}>
                {currentStep.feature}
              </span>
              {currentStep.isRequired && (
                <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30`, borderRadius: "4px", color: accentColor, opacity: 0.7 }}>
                  REQUIRED
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Progress dots */}
              <div className="hidden sm:flex items-center gap-1">
                {tourSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className="transition-all duration-300 rounded-full cursor-pointer"
                    style={{
                      width: i === step ? "16px" : "5px",
                      height: "5px",
                      background: i === step ? SKY : i < step ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.15)",
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                {step + 1}/{tourSteps.length}
              </span>
              <button
                onClick={completeTour}
                className="text-[11px] cursor-pointer hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className={`px-5 transition-all duration-300 ${showBlur ? "pb-5" : "pb-4"}`}>
            <h3 className={`font-semibold tracking-tight text-white mb-2 transition-all duration-300 ${showBlur ? "text-lg" : "text-sm"}`}>
              {currentStep.title}
            </h3>
            <p className={`leading-relaxed transition-all duration-300 ${showBlur ? "text-sm" : "text-xs"}`}
              style={{ color: "rgba(255,255,255,0.5)" }}>
              {currentStep.description}
            </p>

            {/* Demo hint callout */}
            {currentStep.hint && showBlur && (
              <div className="mt-4 px-4 py-3 rounded-xl"
                style={{
                  background: SKY_DIM,
                  border: `1px solid ${SKY_BORDER}`,
                }}>
                <p className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: SKY, opacity: 0.7 }}>
                  TRY THIS
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {currentStep.hint}
                </p>
              </div>
            )}

            {/* Collapsed hint indicator when in explore mode */}
            {currentStep.hint && !showBlur && (
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="inline-flex w-1 h-1 rounded-full" style={{ background: SKY, opacity: 0.6 }} />
                <p className="text-[10px] leading-relaxed line-clamp-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {currentStep.hint}
                </p>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-4 mb-3.5 h-px rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${((step + 1) / tourSteps.length) * 100}%`,
                  background: `linear-gradient(to right, ${accentColor}, ${accentColor}80)`,
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={prevStep}
                className={`text-sm cursor-pointer px-3 py-2 transition-all duration-200 rounded-lg hover:bg-white/5 ${
                  step > 0 ? "opacity-100" : "opacity-20 pointer-events-none"
                }`}
                style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={isNavigating}
                className="flex items-center gap-2 font-medium text-sm px-5 py-2.5 transition-all duration-200 hover:opacity-90 active:scale-95 cursor-pointer"
                style={{
                  background: isNavigating ? "rgba(255,255,255,0.1)" : phase === "intro" ? SKY : "white",
                  color: isNavigating ? "rgba(255,255,255,0.4)" : phase === "intro" ? "#000" : "#000",
                  borderRadius: "10px",
                  fontSize: "13px",
                }}
              >
                {isNavigating ? (
                  "Loading..."
                ) : phase === "intro" ? (
                  <>View Page <span style={{ opacity: 0.6 }}>→</span></>
                ) : step === tourSteps.length - 1 ? (
                  "Finish"
                ) : (
                  <>Next <span style={{ opacity: 0.6 }}>→</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
