import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { NavLinks } from "@/components/ui/NavLinks";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col relative"
        style={{ background: "var(--bg)", borderRight: "1px solid var(--borderline)" }}
      >
        {/* Subtle top glow */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(245,158,11,0.4), transparent)" }} />

        {/* Logo */}
        <div
          className="px-5 py-5 flex items-center gap-3"
          style={{ borderBottom: "1px solid var(--borderline)" }}
        >
          <div
            className="h-5 w-5 flex-shrink-0"
            style={{ background: "var(--accent-gold)", boxShadow: "0 0 12px rgba(245,158,11,0.5)" }}
          />
          <div>
            <div
              className="font-semibold text-[13px] tracking-tight"
              style={{ color: "var(--text-main)" }}
            >
              Brim
            </div>
            <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "var(--text-sec)", opacity: 0.6 }}>
              Expense Intel
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* User */}
        <div
          className="px-4 py-4 flex items-center gap-3"
          style={{ borderTop: "1px solid var(--borderline)" }}
        >
          <UserButton />
          <div
            className="text-xs truncate"
            style={{ color: "var(--text-sec)" }}
          >
            {user?.firstName ?? "Finance Manager"}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ background: "var(--bg)" }}
      >
        {children}
      </main>
    </div>
  );
}
