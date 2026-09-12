import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { RequireAuth } from "@/components/RequireAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-surface dark:bg-surface-dark pb-20 lg:pb-0">
        <Sidebar />
        <div className="flex-1 min-w-0">{children}</div>
        <MobileNav />
      </div>
    </RequireAuth>
  );
}

