"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";

const BLUE = "#38BDF8";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/query", label: "AI Query" },
  { href: "/compliance", label: "Compliance" },
  { href: "/approvals", label: "Approvals" },
  { href: "/anomalies", label: "Anomalies" },
  { href: "/budgets", label: "Budgets" },
  { href: "/reports", label: "Reports" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <header
      className="sticky top-0 z-50 w-full border-b"
      id="app-navbar"
      style={{
        background: "rgba(7,9,20,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <nav className="mx-auto flex items-center justify-between px-6 max-w-[100rem]" style={{ height: "60px" }}>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-80 flex-shrink-0">
          <span className="text-white text-[15px] tracking-tight" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 600 }}>Expense Intelligence</span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[9px] font-mono tracking-widest"
            style={{ border: `1px solid rgba(56,189,248,0.25)`, color: BLUE, opacity: 0.7, borderRadius: "4px" }}>
            BRIM
          </span>
        </Link>

        {/* Desktop Nav — centered */}
        <div className="hidden md:flex items-center gap-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 whitespace-nowrap"
                style={{ color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)" }}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-px"
                    style={{ background: BLUE, boxShadow: `0 0 8px ${BLUE}80` }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <Link href="/"
            className="text-[13px] transition-colors hidden lg:block"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            ← Landing
          </Link>
          <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col gap-[5px] p-2 cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-[1.5px] bg-white transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-white transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-white transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40"
          style={{
            top: "60px",
            background: "rgba(7,9,20,0.97)",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}>
          <div className="flex flex-col p-6 gap-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest mb-4"
              style={{ color: BLUE, opacity: 0.5 }}>NAVIGATION</span>
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
            <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <Link href="/" className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                ← Back to Landing
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
