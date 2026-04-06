import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/context/AuthContext";
import { Bell } from "lucide-react";
import { NotificationModal } from "./NotificationModal";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();

  const roleLabel = role === "ADMIN" ? "Admin Dashboard" : role === "CARE_MANAGER" ? "Care Manager Portal" : role === "PATIENT_RELATIVE" ? "Relative Portal" : "Patient Portal";
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 card-shadow">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h2 className="text-sm font-semibold text-foreground">{roleLabel}</h2>
            </div>
            <div className="flex items-center gap-4">
              <NotificationModal />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                  {initials}
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:inline">{user?.name}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
