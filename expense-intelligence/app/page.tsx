"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const BLUE = "#38BDF8";
const BLUE_DIM = "rgba(56,189,248,0.15)";
const BLUE_GLOW = "rgba(56,189,248,0.25)";

// Inline SVG icon components
function IconTerminal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <polyline points="4 17 10 11 4 5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="19" x2="20" y2="19" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function IconShieldCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="9 12 11 14 15 10" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconZap(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconFileChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="17" x2="8" y2="13" strokeWidth={1.5} strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="11" strokeWidth={1.5} strokeLinecap="round" />
      <line x1="16" y1="17" x2="16" y2="15" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

const features = [
  {
    num: "01",
    title: "Natural Language Queries",
    desc: "Ask questions in plain English. Get charts, tables, and AI-powered insights with multi-step reasoning.",
    stat: "TOOLS_INVOKED: 8",
    href: "/query",
    icon: IconTerminal,
  },
  {
    num: "02",
    title: "Policy Compliance",
    desc: "AI understands context — a $200 team dinner differs from a $200 solo expense. Automatic enforcement.",
    stat: "ACCURACY: 99.2%",
    href: "/compliance",
    icon: IconShieldCheck,
  },
  {
    num: "03",
    title: "Smart Pre-Approvals",
    desc: "One-click decisions with AI recommendations, spend history context, and real-time budget impact.",
    stat: "DECISION_TIME: <2s",
    href: "/approvals",
    icon: IconZap,
  },
  {
    num: "04",
    title: "Auto Reports",
    desc: "Transactions grouped by trip, event, or project with policy checks. Ready for CFO review instantly.",
    stat: "REPORT_GEN: AUTO",
    href: "/reports",
    icon: IconFileChart,
  },
];

const pipeline = [
  {
    step: "01",
    title: "Expense Submitted",
    desc: "Employee submits expense with receipt. AI extracts merchant, amount, category, and policy context automatically.",
    cardLabel: "UPLOAD_STATUS",
    cardContent: "progress",
  },
  {
    step: "02",
    title: "AI Classification",
    desc: "Claude API classifies spend category, identifies policy violations, and flags anomalies with multi-step reasoning.",
    cardLabel: "CLASSIFY_STATUS",
    cardContent: "chips",
  },
  {
    step: "03",
    title: "Compliance Check",
    desc: "Multi-step reasoning validates against company policy with full contextual understanding of purpose and attendees.",
    cardLabel: "POLICY_CHECK",
    cardContent: "checks",
  },
  {
    step: "04",
    title: "Smart Approval",
    desc: "Manager receives AI recommendation with spend history, budget status, and risk score for one-click decisions.",
    cardLabel: "APPROVAL_STATUS",
    cardContent: "approval",
  },
  {
    step: "05",
    title: "Report Generated",
    desc: "Expenses auto-grouped by trip or project. Complete narrative report ready for finance review in seconds.",
    cardLabel: "REPORT_STATUS",
    cardContent: "report",
  },
];

function PipelineCard({ step }: { step: typeof pipeline[number] }) {
  const contents: Record<string, React.ReactNode> = {
    progress: (
      <div>
        <div className="h-1.5 w-full rounded-full overflow-hidden mb-2.5" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full" style={{ width: "100%", background: BLUE, boxShadow: `0 0 8px ${BLUE}` }} />
        </div>
        <span className="text-[9px] font-mono" style={{ color: BLUE, opacity: 0.7 }}>INPUT_RATE: COMPLETE</span>
      </div>
    ),
    chips: (
      <div className="flex gap-1.5 flex-wrap">
        {["CATEGORY: MEALS", "POLICY: OK", "ANOMALY: NONE"].map((t) => (
          <span key={t} className="px-2 py-1 rounded text-[9px] font-mono"
            style={{ background: BLUE_DIM, border: `1px solid rgba(56,189,248,0.25)`, color: BLUE }}>{t}</span>
        ))}
      </div>
    ),
    checks: (
      <div className="space-y-2">
        {[["AMOUNT_LIMIT", "PASS"], ["CATEGORY_RULE", "PASS"], ["RECEIPTS", "PASS"]].map(([label, status]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-zinc-600">{label}</span>
            <span className="text-[9px] font-mono" style={{ color: BLUE }}>{status}</span>
          </div>
        ))}
      </div>
    ),
    approval: (
      <div>
        <div className="text-[9px] font-mono text-zinc-600 mb-2.5 uppercase tracking-widest">AI_RECOMMENDATION</div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full text-[9px] font-mono font-semibold"
            style={{ background: BLUE_DIM, border: `1px solid rgba(56,189,248,0.4)`, color: BLUE }}>
            APPROVE
          </span>
          <span className="text-[9px] font-mono text-zinc-600">confidence: 94%</span>
        </div>
      </div>
    ),
    report: (
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-lg font-normal text-zinc-100" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>12</div>
          <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">TRANSACTIONS</div>
        </div>
        <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="text-center">
          <div className="text-lg font-normal" style={{ fontFamily: "var(--font-display), Georgia, serif", color: BLUE }}>$3,420</div>
          <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">TOTAL</div>
        </div>
      </div>
    ),
  };

  return (
    <div className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background: "#10121c", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[11px] font-mono"
        style={{ background: BLUE_DIM, border: `1px solid rgba(56,189,248,0.2)`, color: BLUE }}>
        {step.step}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-mono uppercase tracking-widest mb-3 text-zinc-600">{step.cardLabel}</div>
        {contents[step.cardContent]}
      </div>
    </div>
  );
}

function DotStatCard({
  target,
  suffix = "",
  label,
  duration = 2000,
}: {
  target: number;
  suffix?: string;
  label: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.4 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / (duration / 50)));
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(current);
      if (current >= target) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  const display = count < 1000 ? count : `${Math.floor(count / 1000)}k`;

  return (
    <div
      ref={ref}
      className="inline-flex items-center gap-2.5 rounded-full relative overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-white/5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "0.55rem 1.25rem",
      }}
    >
      {/* Subtle ray sweep */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `conic-gradient(from 0deg at 50% 0%, transparent 0deg, rgba(56,189,248,0.04) 30deg, transparent 60deg)`,
        animation: "ray-spin 4s linear infinite",
      }} />
      {/* Pulsing dot */}
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 relative z-10"
        style={{ background: BLUE, boxShadow: `0 0 6px ${BLUE}`, animation: "dot-pulse 2s ease-in-out infinite" }} />
      {/* Value */}
      <span className="text-lg tracking-tight relative z-10"
        style={{ color: BLUE, fontFamily: "var(--font-display), Georgia, serif" }}>
        {display}{suffix}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 relative z-10">{label}</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-[#07090f] text-zinc-400 antialiased overflow-x-hidden" style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}>
      {/* Ambient dot grid */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-[0.35]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* ── NAVBAR — pill glass ── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-5">
        <div
          className="max-w-4xl mx-auto rounded-full px-6 py-3"
          style={{
            background: "linear-gradient(180deg, rgba(14,16,26,0.55), rgba(14,16,26,0.35)) padding-box, linear-gradient(120deg, rgba(255,255,255,0.35), rgba(255,255,255,0.08)) border-box",
            border: "1px solid transparent",
            backdropFilter: "blur(16px) saturate(120%)",
            WebkitBackdropFilter: "blur(16px) saturate(120%)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
              <span className="text-white text-[15px]" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 600 }}>
                Expense Intelligence
              </span>
            </Link>

            {/* Nav links */}
            <ul className="hidden md:flex items-center gap-1 text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
              {[
                { label: "Features", href: "#features" },
                { label: "How It Works", href: "#pipeline" },
                { label: "Preview", href: "#preview" },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="px-4 py-2 rounded-full transition-colors duration-300 hover:text-white hover:bg-white/5 block"
                    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Log in — desktop */}
              <Link
                href="/sign-in"
                className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 hover:bg-white/5 border"
                style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
                title="Log in"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
              {/* Launch Demo */}
              <Link
                href="/dashboard"
                className="rounded-full bg-white text-[#07090f] text-sm font-semibold px-5 py-2 transition-all hover:bg-zinc-100 active:scale-[0.97] hidden md:inline-flex"
                style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.3)" }}
              >
                Launch Demo
              </Link>
              {/* Hamburger — mobile */}
              <button
                className="inline-flex md:hidden items-center justify-center w-9 h-9 rounded-full transition-all duration-300 hover:bg-white/5 border"
                style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
                aria-label="Menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20 overflow-hidden">
        {/* Video background */}
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.18, minHeight: "100vh", zIndex: 0 }}
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4" type="video/mp4" />
        </video>
        {/* Blue ambient glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${BLUE_GLOW}, transparent 65%)`, filter: "blur(60px)", zIndex: 1 }} />
        <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none bg-gradient-to-t from-[#07090f] to-transparent" style={{ zIndex: 1 }} />

        <div className="relative text-center max-w-4xl px-6" style={{ zIndex: 2 }}>
          <BlurFade delay={0.0} duration={0.8}>
            <h1 className="text-[clamp(2.75rem,7vw,6rem)] leading-[0.93] tracking-[-0.04em] text-zinc-50 mb-8"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
              The Intelligence Layer
              <span className="block" style={{ color: "rgba(255,255,255,0.22)" }}>
                for Expense Management.
              </span>
            </h1>
          </BlurFade>

          <BlurFade delay={0.1} duration={0.7}>
            <p className="mx-auto max-w-lg text-[15px] text-zinc-500 leading-relaxed mb-10">
              Deploy AI-powered expense intelligence for SMBs. Natural language queries,
              smart compliance, and automated approvals — powered by Claude&apos;s multi-step reasoning.
            </p>
          </BlurFade>

          <BlurFade delay={0.2} duration={0.7}>
            <div className="flex items-center justify-center gap-3">
              <Link href="/dashboard"
                className="rounded-full bg-white text-[#07090f] px-8 py-3 text-sm font-semibold flex items-center gap-2 transition-all hover:bg-zinc-100 active:scale-[0.97]"
                style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 8px 30px rgba(0,0,0,0.5)" }}>
                Launch Demo
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a href="#features"
                className="rounded-full px-8 py-3 text-sm font-medium text-zinc-400 transition-all hover:text-zinc-200"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Explore Features
              </a>
            </div>
          </BlurFade>
        </div>

        {/* Stats row — pill counters */}
        <BlurFade delay={0.35} duration={0.8} className="relative z-10 mt-16 w-full max-w-3xl px-6">
          <style>{`
            @keyframes ray-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes dot-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
          `}</style>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {[
              { target: 6, suffix: "mo", label: "Transaction Data" },
              { target: 50, suffix: "+",  label: "Employees" },
              { target: 8, suffix: "",    label: "Claude Tools" },
              { target: 4, suffix: "",    label: "Core Features" },
            ].map((s) => (
              <DotStatCard key={s.label} target={s.target} suffix={s.suffix} label={s.label} />
            ))}
          </div>
        </BlurFade>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 relative z-10 border-t" style={{ background: "#09090e", borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="mx-auto max-w-6xl px-6">
          <BlurFade delay={0} duration={0.7} inView className="max-w-xl mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8" style={{ background: BLUE, opacity: 0.5 }} />
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: BLUE, opacity: 0.7 }}>
                Brim Challenge · Required Features
              </span>
            </div>
            <p className="text-3xl font-normal tracking-tight text-zinc-100"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
              Engineered for financial intelligence
            </p>
            <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
              Four core capabilities built on Claude API for multi-step reasoning and agentic workflows.
            </p>
          </BlurFade>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <BlurFade key={f.num} delay={i * 0.1} duration={0.65} inView>
                <Link href={f.href} className="block group h-full">
                  <div className="relative rounded-2xl border p-px h-full" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <GlowingEffect spread={25} glow={false} disabled={false} proximity={0} inactiveZone={0.4} borderWidth={2} />
                    <div className="relative rounded-[calc(1rem-1px)] p-6 h-full min-h-[200px] flex flex-col"
                      style={{ background: "#10121a" }}>
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 flex-shrink-0"
                        style={{ background: `rgba(56,189,248,0.1)`, border: `1px solid rgba(56,189,248,0.2)` }}>
                        <f.icon className="w-5 h-5" style={{ color: BLUE }} />
                      </div>
                      {/* Text */}
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-white mb-2 tracking-tight">{f.title}</h3>
                        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{f.desc}</p>
                      </div>
                      {/* Bottom tag */}
                      <div className="mt-4 flex items-center gap-1.5">
                        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: BLUE, opacity: 0.55 }}>FEATURE_{f.num}</span>
                        <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: BLUE }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIPELINE ── */}
      <section id="pipeline" className="py-28 relative border-y" style={{ background: "#07090f", borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="mx-auto max-w-5xl px-6">
          <BlurFade delay={0} duration={0.7} inView className="text-center max-w-2xl mx-auto mb-24">
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-0.03em] text-white mb-4"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
              The AI expense pipeline
            </h2>
            <p className="text-[15px] text-zinc-500 leading-relaxed">
              A staged intelligent workflow — from submission to approved report, every step automated by Claude.
            </p>
          </BlurFade>

          <div className="relative">
            {/* Vertical spine line */}
            <div className="absolute left-1/2 top-4 bottom-4 -translate-x-px w-px pointer-events-none"
              style={{ background: `linear-gradient(to bottom, transparent, rgba(56,189,248,0.18) 8%, rgba(56,189,248,0.18) 92%, transparent)` }} />

            {/* Animated beam */}
            <div className="absolute left-1/2 -translate-x-px w-px overflow-hidden pointer-events-none"
              style={{ top: "4%", bottom: "4%" }}>
              <div className="absolute w-full"
                style={{
                  height: "120px",
                  background: `linear-gradient(to bottom, transparent, ${BLUE}90, ${BLUE}, ${BLUE}90, transparent)`,
                  animation: "pipeline-beam 4s linear infinite",
                }} />
            </div>

            <div className="space-y-16">
              {pipeline.map((step, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <BlurFade key={step.step} delay={i * 0.1} duration={0.65} inView>
                    <div className="relative flex items-center">
                      {/* Left slot */}
                      <div className="flex-1 pr-12">
                        {isLeft ? (
                          <div className="text-right">
                            <span className="text-[10px] font-mono uppercase tracking-widest mb-2 block"
                              style={{ color: BLUE, opacity: 0.55 }}>
                              STEP_{step.step}
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-normal tracking-tight text-zinc-100 mb-3"
                              style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
                              {step.title}
                            </h3>
                            <p className="text-sm text-zinc-500 leading-relaxed ml-auto max-w-[280px]">
                              {step.desc}
                            </p>
                          </div>
                        ) : (
                          <PipelineCard step={step} />
                        )}
                      </div>

                      {/* Center node */}
                      <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center -mx-[18px]"
                        style={{
                          background: "#0d0f1a",
                          border: `1.5px solid rgba(56,189,248,0.4)`,
                          boxShadow: `0 0 0 6px rgba(56,189,248,0.06), 0 0 20px ${BLUE}30`,
                        }}>
                        <div className="w-2.5 h-2.5 rounded-full"
                          style={{ background: BLUE, boxShadow: `0 0 10px ${BLUE}` }} />
                      </div>

                      {/* Right slot */}
                      <div className="flex-1 pl-12">
                        {!isLeft ? (
                          <div className="text-left">
                            <span className="text-[10px] font-mono uppercase tracking-widest mb-2 block"
                              style={{ color: BLUE, opacity: 0.55 }}>
                              STEP_{step.step}
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-normal tracking-tight text-zinc-100 mb-3"
                              style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
                              {step.title}
                            </h3>
                            <p className="text-sm text-zinc-500 leading-relaxed max-w-[280px]">
                              {step.desc}
                            </p>
                          </div>
                        ) : (
                          <PipelineCard step={step} />
                        )}
                      </div>
                    </div>
                  </BlurFade>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section id="preview" className="py-28 relative border-b" style={{ background: "#09090e", borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="mx-auto max-w-6xl px-6">
          <BlurFade delay={0} duration={0.7} inView className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-normal tracking-tight text-zinc-100"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
              Command your finances.
            </h2>
            <p className="mt-4 text-sm text-zinc-500">
              Real-time KPIs, violation alerts, and budget health — all in one intelligent dashboard.
            </p>
          </BlurFade>

          <BlurFade delay={0.2} duration={0.8} inView>
            {/* Mock dashboard shell */}
            <div className="rounded-3xl p-3 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] border"
              style={{ background: "#0d0f1a", borderColor: "rgba(255,255,255,0.07)" }}>
              {/* Browser chrome */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "#090b12", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="h-10 border-b flex items-center gap-3 px-4"
                  style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.5)" }}>
                  <div className="flex gap-1.5">
                    {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
                      <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.35 }} />
                    ))}
                  </div>
                  <div className="px-3 py-0.5 rounded text-[10px] font-mono text-zinc-600 tracking-widest"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    expense_intelligence · dashboard
                  </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-4 gap-px" style={{ background: "rgba(255,255,255,0.04)" }}>
                  {[
                    { tag: "SPEND_QTD", val: "$247,832" },
                    { tag: "PENDING", val: "12" },
                    { tag: "VIOLATIONS", val: "3" },
                    { tag: "OVER_BUDGET", val: "2" },
                  ].map((k) => (
                    <div key={k.tag} className="py-5 px-5 relative overflow-hidden"
                      style={{ background: "#090b12", borderTop: `2px solid ${BLUE}` }}>
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: `radial-gradient(circle at 50% 0%, ${BLUE}0d, transparent 60%)` }} />
                      <span className="block text-[9px] font-mono uppercase tracking-widest mb-3"
                        style={{ color: BLUE, opacity: 0.55 }}>
                        {k.tag}
                      </span>
                      <span className="text-2xl"
                        style={{ color: BLUE, fontFamily: "var(--font-display), Georgia, serif", textShadow: `0 0 20px ${BLUE}50` }}>
                        {k.val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Charts area */}
                <div className="grid grid-cols-2 gap-px mt-px" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="p-5" style={{ background: "#090b12" }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-mono uppercase tracking-widest"
                        style={{ color: BLUE, opacity: 0.55 }}>BUDGET_UTILIZATION</span>
                      <span className="text-[9px] font-mono text-zinc-700">5 DEPTS</span>
                    </div>
                    {[
                      { dept: "Engineering", pct: 72 },
                      { dept: "Marketing", pct: 91 },
                      { dept: "Sales", pct: 55 },
                      { dept: "Operations", pct: 83 },
                    ].map((b) => (
                      <div key={b.dept} className="mb-3">
                        <div className="flex justify-between text-[10px] mb-1.5">
                          <span className="text-zinc-500">{b.dept}</span>
                          <span className="font-mono" style={{ color: b.pct > 80 ? "#ef4444" : BLUE }}>{b.pct}%</span>
                        </div>
                        <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${b.pct}%`, background: b.pct > 80 ? "#ef4444" : BLUE, boxShadow: b.pct > 80 ? "0 0 6px #ef4444" : `0 0 6px ${BLUE}` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-5" style={{ background: "#090b12" }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-mono uppercase tracking-widest"
                        style={{ color: "#ef4444", opacity: 0.7 }}>RECENT_VIOLATIONS</span>
                      <span className="text-[9px] font-mono text-zinc-700">3 OPEN</span>
                    </div>
                    {[
                      { type: "OVER_LIMIT", sev: "critical", desc: "Solo dinner $284 > $150 limit" },
                      { type: "SPLIT_CHARGE", sev: "high", desc: "Suspicious split: 3 × $49.99" },
                      { type: "MISSING_RECEIPT", sev: "medium", desc: "Travel expense no receipt" },
                    ].map((v, i) => (
                      <div key={i} className="py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`badge badge-${v.sev}`}>{v.sev.toUpperCase()}</span>
                          <span className="text-[9px] font-mono text-zinc-600">{v.type}</span>
                        </div>
                        <p className="text-[11px] text-zinc-700 truncate">{v.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* ── FOOTER / CTA ── */}
      <footer className="relative pt-28 pb-16 overflow-hidden border-t"
        style={{ background: "#05060c", borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 pointer-events-none"
          style={{ background: `radial-gradient(ellipse, ${BLUE}10, transparent 70%)`, filter: "blur(60px)" }} />

        <BlurFade delay={0} duration={0.8} inView className="mx-auto max-w-3xl px-6 text-center relative z-10">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-8"
            style={{ background: BLUE_DIM, border: `1px solid rgba(56,189,248,0.2)` }}>
            <div className="w-1.5 h-7 rounded-full" style={{ background: BLUE, boxShadow: `0 0 14px ${BLUE}` }} />
          </div>

          <h2 className="text-4xl font-normal tracking-tight text-zinc-100 mb-6"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
            Initialize your intelligence layer.
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-10 leading-relaxed">
            Built for the Claude Builders Hackathon at McGill. Brim Financial Sub-Challenge.
            Multi-step reasoning. Agentic workflows. Zero operational overhead.
          </p>

          <Link href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-white text-[#07090f] px-8 py-3 text-sm font-semibold transition-all hover:bg-zinc-100 active:scale-[0.97]"
            style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 8px 30px rgba(0,0,0,0.5)" }}>
            Launch Demo
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </BlurFade>

        <div className="mx-auto max-w-6xl px-6 mt-24 pt-8 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2 text-xs text-zinc-700">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            All systems operational
          </div>
          <span className="text-xs text-zinc-700">© 2026 Expense Intelligence · McGill Hackathon</span>
        </div>
      </footer>
    </div>
  );
}
