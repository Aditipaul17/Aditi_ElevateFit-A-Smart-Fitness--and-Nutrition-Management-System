import { Sidebar } from "@/components/Sidebar";
import { RequireAuth } from "@/components/RequireAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-surface dark:bg-surface-dark">
        <Sidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </RequireAuth>
  );
}
