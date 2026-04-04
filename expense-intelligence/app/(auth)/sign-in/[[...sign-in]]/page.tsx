import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-main)" }}>
            Brim Lucid
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-sec)" }}>
            AI-powered spend management
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
