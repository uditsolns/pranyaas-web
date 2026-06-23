import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import CareManagerDashboard from "./pages/CareManagerDashboard";
import SeniorDashboard from "./pages/SeniorDashboard";
import SeniorsPage from "./pages/SeniorsPage";
import SeniorDetailPage from "./pages/SeniorDetailPage";
import TasksPage from "./pages/TasksPage";
import VisitsPage from "./pages/VisitsPage";
import VitalsPage from "./pages/VitalsPage";
import EmergenciesPage from "./pages/EmergenciesPage";
import CareManagersPage from "./pages/CareManagersPage";
import FamiliesPage from "./pages/FamiliesPage";
import VendorsPage from "./pages/VendorsPage";
import EventsPage from "./pages/EventsPage";
import MedicationRemindersPage from "./pages/MedicationRemindersPage";
import QuotesPage from "./pages/QuotesPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import PlanServiceRequestsPage from "./pages/PlanServiceRequestsPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleDashboard() {
  const { role } = useAuth();
  if (role === "CARE_MANAGER") return <CareManagerDashboard />;
  if (role === "PATIENT" || role === "PATIENT_FAMILY") return <SeniorDashboard />;
  return <AdminDashboard />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="*" element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<RoleDashboard />} />
                <Route path="/seniors" element={<SeniorsPage />} />
                <Route path="/seniors/:id" element={<SeniorDetailPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/visits" element={<VisitsPage />} />
                <Route path="/vitals" element={<VitalsPage />} />
                <Route path="/medications" element={<MedicationRemindersPage />} />
                <Route path="/emergencies" element={<EmergenciesPage />} />
                <Route path="/care-managers" element={<CareManagersPage />} />
                <Route path="/relatives" element={<FamiliesPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/quotes" element={<QuotesPage />} />
                <Route path="/plan-service-requests" element={<PlanServiceRequestsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
