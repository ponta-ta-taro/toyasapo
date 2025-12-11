import { Dashboard } from "@/components/dashboard";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Dashboard />
      <Toaster />
    </main>
  );
}
