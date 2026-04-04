"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/", label: "Overview", tag: "00" },
  { href: "/query", label: "AI Query", tag: "01" },
  { href: "/compliance", label: "Compliance", tag: "02" },
  { href: "/approvals", label: "Approvals", tag: "03" },
  { href: "/reports", label: "Reports", tag: "04" },
  { href: "/forecast", label: "Forecasting", tag: "05" },
  { href: "/autopilot", label: "Autopilot", tag: "06" },
  { href: "/insights", label: "Insights", tag: "07" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar fixed top-0 left-0 h-screen flex flex-col" id="sidebar-nav">
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-3 border-b" style={{ borderColor: "var(--borderline)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" stroke="white" strokeWidth="2.5" />
          <circle cx="12" cy="12" r="4" fill="white" />
        </svg>
        <span className="font-semibold text-sm tracking-tight uppercase" style={{ color: "var(--text-main)" }}>
          Lucid
        </span>
      </div>

      {/* Section label */}
      <div className="px-6 pt-6 pb-3">
        <span className="mono-label">Navigation</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="font-mono text-xs" style={{ color: pathname === item.href ? "var(--text-main)" : "rgba(255,255,255,0.2)" }}>
              {item.tag}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-5 border-t flex items-center gap-3" style={{ borderColor: "var(--borderline)" }}>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-7 h-7",
            },
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: "var(--text-main)" }}>
            Demo Corp
          </p>
          <p className="mono-label" style={{ fontSize: "0.6rem" }}>
            SYSTEM_ACTIVE
          </p>
        </div>
      </div>
    </aside>
  );
}
