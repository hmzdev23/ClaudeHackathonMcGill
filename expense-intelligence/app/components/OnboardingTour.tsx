"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const SKY = "#38BDF8";
const TOUR_KEY = "expense-ai-tour-v6";

interface TourStep {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  hint: string;
  route: string;
  required?: boolean;
  icon: React.ReactNode;
}

function HexIcon({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        background: `linear-gradient(135deg, ${color}18, ${color}06)`,
        border: `1px solid ${color}30`,
      }}
    >
      {children}
    </div>
  );
}

const STEPS: TourStep[] = [
  {
    id: "welcome",
    tag: "INITIALIZE",
    tagColor: SKY,
    title: "Welcome to Lucid",
    description: "AI-powered expense management for SMBs. Claude handles what used to take your finance team hours — in seconds.",
    hint: "Start by clicking RELOAD_DATA in the top navbar to seed 6 months of real Brim card transactions.",
    route: "/dashboard",
    icon: <HexIcon color={SKY}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3.5" stroke={SKY} strokeWidth="1.5"/><circle cx="9" cy="9" r="7" stroke={SKY} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2"/></svg></HexIcon>,
  },
  {
    id: "autopilot",
    tag: "AI ADVISOR — AUTOPILOT",
    tagColor: SKY,
    title: "AI Takes the Wheel",
    description: "The AI Advisor scans every pending approval, violation, and budget — then hands you a prioritized action plan. One click to execute.",
    hint: `Hit "Begin Analysis" on the AI Advisor page to watch Claude review everything and tell you exactly what needs your attention.`,
    route: "/autopilot",
    icon: <HexIcon color={SKY}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" stroke={SKY} strokeWidth="1.5"/><path d="M9 2v2M9 14v2M2 9h2M14 9h2" stroke={SKY} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/></svg></HexIcon>,
  },
  {
    id: "dashboard",
    tag: "FEATURE_00 — OVERVIEW",
    tagColor: SKY,
    title: "Live Intelligence Dashboard",
    description: "Real-time KPIs from 4,180 Brim card transactions. Pending approvals, open policy violations, and department budget health at a glance.",
    hint: "SPEND_QTD is the real sum of all Brim transactions. Departments hitting 80%+ budget are flagged red automatically.",
    route: "/dashboard",
    required: true,
    icon: <HexIcon color={SKY}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="8" width="3" height="8" rx="1" fill={SKY} fillOpacity="0.6"/><rect x="7.5" y="5" width="3" height="11" rx="1" fill={SKY} fillOpacity="0.8"/><rect x="13" y="2" width="3" height="14" rx="1" fill={SKY}/></svg></HexIcon>,
  },
  {
    id: "query",
    tag: "FEATURE_01 — AI QUERY",
    tagColor: SKY,
    title: "Talk to Your Data",
    description: "Natural language interface backed by Claude's multi-step reasoning. The agent chains SQL queries, aggregations, and visualizations to answer anything.",
    hint: `Try: "Who are the top 3 spenders this quarter?" or "Show me all policy violations for Operations"`,
    route: "/query",
    required: true,
    icon: <HexIcon color={SKY}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h8M3 13h5" stroke={SKY} strokeWidth="1.5" strokeLinecap="round"/><circle cx="14" cy="13" r="2.5" stroke={SKY} strokeWidth="1.2"/><path d="M16 15l1.5 1.5" stroke={SKY} strokeWidth="1.5" strokeLinecap="round"/></svg></HexIcon>,
  },
  {
    id: "compliance",
    tag: "FEATURE_02 — COMPLIANCE",
    tagColor: "#22D3EE",
    title: "Contextual Policy Compliance",
    description: "Goes beyond rule matching. A $200 dinner for 4 people is fine; the same amount solo is a violation. AI understands intent.",
    hint: `Try: Amount $280, Merchant "STK Steakhouse", Category "meals", Attendees 1 — watch it flag a per-person limit violation.`,
    route: "/compliance",
    required: true,
    icon: <HexIcon color="#22D3EE"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L4 5v4c0 3.3 2.1 6.4 5 7.4C12 15.4 14 12.3 14 9V5L9 2z" stroke="#22D3EE" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6.5 9l2 2 3-3" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></HexIcon>,
  },
  {
    id: "approvals",
    tag: "FEATURE_03 — APPROVALS",
    tagColor: "#A78BFA",
    title: "AI Pre-Approval Workflow",
    description: "Every pending expense gets an AI recommendation with confidence reasoning, card spend history, and budget headroom. One-click decisions.",
    hint: "Each card shows AI confidence and reasoning based on real card data. Try approving or denying a pending expense.",
    route: "/approvals",
    required: true,
    icon: <HexIcon color="#A78BFA"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke="#A78BFA" strokeWidth="1.5"/><path d="M6 9l2.5 2.5 3.5-4" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></HexIcon>,
  },
  {
    id: "reports",
    tag: "FEATURE_04 — REPORTS",
    tagColor: "#34D399",
    title: "Automated Expense Reports",
    description: "Select any card group. Claude groups their transactions by month, writes an executive narrative, and adds policy annotations — in seconds.",
    hint: "Pick a card group from the dropdown, click Generate Report. Claude writes a full narrative from real Brim transaction data.",
    route: "/reports",
    required: true,
    icon: <HexIcon color="#34D399"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 2h8l3 3v11a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#34D399" strokeWidth="1.5"/><path d="M12 2v4h4M6 9h6M6 12h4" stroke="#34D399" strokeWidth="1.2" strokeLinecap="round"/></svg></HexIcon>,
  },
  {
    id: "anomalies",
    tag: "OPTIONAL — ANOMALY DETECTION",
    tagColor: "#EF4444",
    title: "Fraud & Anomaly Detection",
    description: "Statistical analysis detects split charges (avoiding approval thresholds), duplicate transactions, round-number patterns, and velocity spikes.",
    hint: "Anomalies are detected automatically on seed. Critical = suspected fraud. High = needs review.",
    route: "/anomalies",
    icon: <HexIcon color="#EF4444"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3L2 15h14L9 3z" stroke="#EF4444" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 8v3M9 13v.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/></svg></HexIcon>,
  },
  {
    id: "insights",
    tag: "OPTIONAL — INSIGHTS",
    tagColor: "#F59E0B",
    title: "Proactive Financial Insights",
    description: "Vendor consolidation savings, department budget forecasting with overrun dates, and peer benchmarking across employees.",
    hint: "The Vendor tab shows how consolidating suppliers could cut costs 12%. Budget Forecast shows which departments will overrun and when.",
    route: "/insights",
    icon: <HexIcon color="#F59E0B"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 14l4-4 3 3 5-7" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 7h4v4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></HexIcon>,
  },
  {
    id: "complete",
    tag: "TOUR COMPLETE",
    tagColor: "#22C55E",
    title: "You're Ready",
    description: "4 required features + AI Advisor + anomaly detection + insights. Everything a small business needs to stay on top of expenses.",
    hint: "Best path: seed data → run AI Advisor → ask a query → run a compliance check → approve an expense → generate a report.",
    route: "/dashboard",
    icon: <HexIcon color="#22C55E"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#22C55E" strokeWidth="1.5"/><path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></HexIcon>,
  },
];

// ── Typewriter hook ────────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const ref = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    function tick() {
      i++;
      setDisplayed(text.slice(0, i));
      if (i < text.length) {
        ref.current = setTimeout(tick, speed);
      } else {
        setDone(true);
      }
    }
    ref.current = setTimeout(tick, 120); // brief delay before starting
    return () => clearTimeout(ref.current);
  }, [text, speed]);

  return { displayed, done };
}

// ── Welcome screen (full-page immersive) ─────────────────────────────────────
function WelcomeScreen({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const line1 = useTypewriter("Lucid", 38);
  const line2 = useTypewriter(line1.done ? "AI-powered finance for small businesses." : "", 22);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    if (line2.done) {
      const t = setTimeout(() => setShowButtons(true), 300);
      return () => clearTimeout(t);
    }
  }, [line2.done]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "rgba(7,9,20,0.97)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Animated grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "600px",
          height: "600px",
          background: `radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)`,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="relative z-10 text-center px-8 max-w-xl">
        {/* System badge */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: SKY, boxShadow: `0 0 8px ${SKY}` }} />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: SKY, opacity: 0.7 }}>
            BRIM_ADVISORY_SYSTEM
          </span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: SKY, boxShadow: `0 0 8px ${SKY}` }} />
        </div>

        {/* Main heading with typewriter */}
        <h1
          className="text-4xl sm:text-5xl font-semibold text-white mb-5 min-h-[1.2em] tracking-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 500 }}
        >
          {line1.displayed}
          {!line1.done && (
            <span className="inline-block w-0.5 h-8 ml-1 align-middle animate-pulse" style={{ background: SKY }} />
          )}
        </h1>

        <p
          className="text-lg min-h-[1.5em] mb-10"
          style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {line2.displayed}
          {line1.done && !line2.done && (
            <span className="inline-block w-0.5 h-5 ml-0.5 align-middle animate-pulse" style={{ background: "rgba(255,255,255,0.4)" }} />
          )}
        </p>

        {/* Feature pillsÉ */}
        {line2.done && (
          <div
            className="flex flex-wrap justify-center gap-2 mb-10"
            style={{ animation: "fadeInUp 0.4s ease-out" }}
          >
            {["AI Query", "Compliance", "Approvals", "Reports", "AI Advisor"].map((f) => (
              <span
                key={f}
                className="px-3 py-1 text-[11px] font-mono rounded-full"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* CTA buttons */}
        {showButtons && (
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            style={{ animation: "fadeInUp 0.4s ease-out" }}
          >
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-7 py-3 text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 cursor-pointer"
              style={{
                background: SKY,
                color: "#000",
                borderRadius: "12px",
                boxShadow: `0 0 30px rgba(56,189,248,0.25)`,
              }}
            >
              Start Tour
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={onSkip}
              className="px-5 py-3 text-sm transition-all hover:text-white cursor-pointer"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Skip
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Step card (bottom-right) ──────────────────────────────────────────────────
function StepCard({
  step,
  stepIndex,
  total,
  onNext,
  onPrev,
  onClose,
  onJump,
  visible,
}: {
  step: TourStep;
  stepIndex: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onJump: (i: number) => void;
  visible: boolean;
}) {
  const accent = step.tagColor;
  const isLast = stepIndex === total - 1;
  const { displayed: descDisplayed } = useTypewriter(step.description, 14);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "clamp(300px, 90vw, 390px)",
        zIndex: 9999,
        transition: "opacity 0.3s ease, transform 0.3s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          background: "rgba(9,11,20,0.98)",
          border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: "18px",
          boxShadow: "0 24px 64px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          overflow: "hidden",
        }}
      >
        {/* Progress bar — full width at very top */}
        <div className="h-[2px] w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{
              width: `${((stepIndex + 1) / total) * 100}%`,
              background: `linear-gradient(to right, ${accent}, ${accent}60)`,
            }}
          />
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            {step.icon}

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-[9px] font-mono uppercase tracking-widest"
                  style={{ color: accent, opacity: 0.8, transition: "color 0.3s" }}
                >
                  {step.tag}
                </span>
                {step.required && (
                  <span
                    className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: `${accent}18`, border: `1px solid ${accent}25`, color: accent, opacity: 0.7 }}
                  >
                    REQ
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white leading-snug">{step.title}</h3>
            </div>

            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5 cursor-pointer transition-all hover:bg-white/8"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1 1l7 7M8 1l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Description with typewriter */}
          <p className="text-[12px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.5)", minHeight: "3em" }}>
            {descDisplayed}
          </p>

          {/* Hint */}
          <div
            className="rounded-xl px-3 py-2.5 mb-4"
            style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.14)" }}
          >
            <p className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: SKY, opacity: 0.55 }}>
              TRY THIS
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              {step.hint}
            </p>
          </div>

          {/* Bottom: dots + navigation */}
          <div className="flex items-center justify-between gap-3">
            {/* Dot navigation */}
            <div className="flex items-center gap-1 overflow-hidden">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onJump(i)}
                  className="cursor-pointer rounded-full transition-all duration-300"
                  style={{
                    width: i === stepIndex ? "12px" : "4px",
                    height: "4px",
                    background:
                      i === stepIndex
                        ? accent
                        : i < stepIndex
                        ? "rgba(56,189,248,0.3)"
                        : "rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono mr-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                {stepIndex + 1}/{total}
              </span>
              {stepIndex > 0 && (
                <button
                  onClick={onPrev}
                  className="px-3 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all hover:bg-white/5"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  ←
                </button>
              )}
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 cursor-pointer"
                style={{
                  background: isLast ? "#22C55E" : accent,
                  color: "#000",
                  transition: "background 0.4s",
                }}
              >
                {isLast ? "Finish" : "Next"}
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
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function OnboardingTour() {
  const [phase, setPhase] = useState<"welcome" | "steps" | "done">("done");
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  // Show tour on first visit
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      const t = setTimeout(() => setPhase("welcome"), 700);
      return () => clearTimeout(t);
    }
  }, []);

  // Navigate when step changes (non-blocking)
  useEffect(() => {
    if (phase !== "steps") return;
    router.push(STEPS[step].route);
  }, [step, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate card in when steps phase starts or step changes
  useEffect(() => {
    if (phase !== "steps") { setVisible(false); return; }
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, [phase, step]);

  const completeTour = useCallback(() => {
    setVisible(false);
    setTimeout(() => setPhase("done"), 300);
    localStorage.setItem(TOUR_KEY, "true");
  }, []);

  const startSteps = useCallback(() => {
    setStep(0);
    setPhase("steps");
  }, []);

  const skipTour = useCallback(() => {
    setPhase("done");
    localStorage.setItem(TOUR_KEY, "true");
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(TOUR_KEY);
    setStep(0);
    setPhase("welcome");
    router.push(STEPS[0].route);
  }, [router]);

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else completeTour();
  }, [step, completeTour]);

  const goPrev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  // Restart button
  if (phase === "done") {
    return (
      <button
        onClick={restartTour}
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-3.5 py-2 transition-all duration-300 hover:opacity-90 active:scale-95 cursor-pointer"
        title="Restart Demo Tour"
        style={{
          background: "rgba(56,189,248,0.08)",
          border: "1px solid rgba(56,189,248,0.2)",
          borderRadius: "10px",
          color: SKY,
        }}
      >
        <span className="inline-flex w-1.5 h-1.5 rounded-full" style={{ background: SKY, boxShadow: `0 0 6px ${SKY}` }} />
        <span className="font-mono tracking-widest uppercase text-[10px]">Tour</span>
      </button>
    );
  }

  if (phase === "welcome") {
    return <WelcomeScreen onStart={startSteps} onSkip={skipTour} />;
  }

  return (
    <StepCard
      step={STEPS[step]}
      stepIndex={step}
      total={STEPS.length}
      onNext={goNext}
      onPrev={goPrev}
      onClose={completeTour}
      onJump={(i) => setStep(i)}
      visible={visible}
    />
  );
}
