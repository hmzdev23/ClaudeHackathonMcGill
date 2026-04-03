import { Navbar } from "../components/Navbar";
import { OnboardingTour } from "../components/OnboardingTour";
import { ScrollReset } from "../components/ScrollReset";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ScrollReset />
      <Navbar />
      <main className="w-full min-h-screen">
        {children}
      </main>
      <OnboardingTour />
    </>
  );
}
