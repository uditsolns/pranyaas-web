import { Users, Calendar, ClipboardList, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useApiGet, useApiList } from "@/hooks/useApi";
import { QuoteCard } from "@/components/QuoteCard";
import { CareVisit, Task, EmergencyAlert } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface CMDashboardData {
  patients_count?: number;
  visits_count?: number;
  tasks_count?: number;
  emergencies_count?: number;
  [key: string]: unknown;
}

export default function CareManagerDashboard() {
  const { user } = useAuth();
  const userName = user?.name || "Care Manager";

  const { data: dashboard, isLoading: ld } = useApiGet<CMDashboardData>("cm-dashboard", "/care-manager/dashboard");
  const { data: visits = [], isLoading: lv } = useApiList<CareVisit>("care-visits", "/care-visits");
  const { data: tasks = [], isLoading: lt } = useApiList<Task>("tasks", "/tasks");
  const { data: emergencies = [] } = useApiList<EmergencyAlert>("emergency-alerts", "/emergency-alerts");

  const isLoading = ld || lv || lt;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const patientsCount = dashboard?.patients_count ?? 0;
  const pendingTasks = tasks.filter(t => t.status !== "completed");
  const activeEmergencies = emergencies.filter(e => e.status !== "resolved");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {userName.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's your schedule for today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Assigned Patients" value={patientsCount} icon={Users} variant="primary" />
        <StatCard title="Total Visits" value={dashboard?.visits_count ?? visits.length} icon={Calendar} variant="accent" />
        <StatCard title="Pending Tasks" value={pendingTasks.length} icon={ClipboardList} variant="warning" />
        <StatCard title="Emergency Alerts" value={activeEmergencies.length} icon={AlertTriangle} variant="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QuoteCard />

        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Visits</h3>
          <div className="space-y-3">
            {visits.slice(0, 5).map(v => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{v.visit_type}</p>
                  <p className="text-xs text-muted-foreground">{v.visit_time} · {v.notes?.slice(0, 40)}</p>
                </div>
                <StatusBadge status={v.status || "pending"} />
              </div>
            ))}
            {visits.length === 0 && <p className="text-sm text-muted-foreground">No visits found</p>}
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">My Tasks</h3>
          <div className="space-y-3">
            {tasks.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">Due: {t.due_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks assigned</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
