"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";

const BLUE = "#38BDF8";

const navItems = [
  { href: "/dashboard",  label: "Overview"    },
  { href: "/query",      label: "AI Query"    },
  { href: "/compliance", label: "Compliance"  },
  { href: "/approvals",  label: "Approvals"   },
  { href: "/anomalies",  label: "Anomalies"   },
  { href: "/budgets",    label: "Budgets"     },
  { href: "/reports",    label: "Reports"     },
  { href: "/insights",   label: "Insights"    },
];

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 0.6s", transform: spinning ? "rotate(360deg)" : "rotate(0deg)" }}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleSeed() {
    if (seeding) return;
    setSeeding(true);
    setSeedDone(false);
    try {
      await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "brim" }),
      });
      setSeedDone(true);
      setTimeout(() => setSeedDone(false), 2500);
      // Refresh current page data
      router.refresh();
    } catch {
      console.error("Seed failed");
    }
    setSeeding(false);
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b"
      id="app-navbar"
      style={{
        background: "rgba(7,9,20,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <nav className="mx-auto flex items-center justify-between px-6 max-w-[100rem]" style={{ height: "56px" }}>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-80 flex-shrink-0 mr-4">
          <span className="text-white text-[15px] tracking-tight" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 600 }}>
            Expense Intelligence
          </span>
          <span
            className="hidden sm:inline-flex items-center px-2 py-0.5 text-[9px] font-mono tracking-widest"
            style={{ border: `1px solid rgba(56,189,248,0.25)`, color: BLUE, opacity: 0.7, borderRadius: "4px" }}
          >
            BRIM
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-0 flex-1 overflow-x-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 whitespace-nowrap flex-shrink-0"
                style={{ color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.38)" }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-px"
                    style={{ background: BLUE, boxShadow: `0 0 8px ${BLUE}80` }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {/* Reload demo data */}
          <button
            onClick={handleSeed}
            disabled={seeding}
            title="Reload demo data"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono transition-all duration-200 rounded-lg cursor-pointer"
            style={{
              background: seedDone ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${seedDone ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: seedDone ? "var(--accent-green)" : "rgba(255,255,255,0.35)",
              letterSpacing: "0.04em",
            }}
          >
            <RefreshIcon spinning={seeding} />
            {seedDone ? "LOADED" : "RELOAD_DATA"}
          </button>

          {/* Landing link */}
          <Link
            href="/"
            className="text-[12px] transition-colors hidden xl:block px-2 py-1.5 rounded-lg hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            ← Landing
          </Link>

          <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />

          {/* Hamburger */}
          <button
            className="lg:hidden flex flex-col gap-[5px] p-2 cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-[1.5px] bg-white/70 transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-white/70 transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-white/70 transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-40"
          style={{
            top: "56px",
            background: "rgba(7,9,20,0.97)",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex flex-col p-6 gap-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: BLUE, opacity: 0.5 }}>
              NAVIGATION
            </span>
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-3 text-sm font-medium transition-all"
                  style={{
                    color: active ? "white" : "rgba(255,255,255,0.4)",
                    borderLeft: `2px solid ${active ? BLUE : "transparent"}`,
                    paddingLeft: "calc(1rem - 2px)",
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => { handleSeed(); setMobileOpen(false); }}
                disabled={seeding}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm rounded-lg"
                style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
              >
                <RefreshIcon spinning={seeding} />
                {seeding ? "Reloading data..." : "Reload Demo Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
