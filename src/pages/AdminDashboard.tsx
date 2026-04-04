import { Users, UserCog, ClipboardList, Calendar, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useApiGet, useApiList } from "@/hooks/useApi";
import { CareVisit, EmergencyAlert } from "@/types";
import { patientGrowthData, visitActivityData, emergencyTrendsData } from "@/data/mock";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

interface DashboardCounts {
  patient_count?: number;
  emergency_count?: number;
  missed_caretakers?: number;
  pending_tasks?: number;
  [key: string]: unknown;
}

export default function AdminDashboard() {
  const { data: dashboard, isLoading } = useApiGet<DashboardCounts>("admin-dashboard", "/admin/dashboard");
  const { data: visits = [] } = useApiList<CareVisit>("care-visits", "/care-visits");
  const { data: emergencies = [] } = useApiList<EmergencyAlert>("emergency-alerts", "/emergency-alerts");

  const patientsCount = dashboard?.patient_count ?? 0;
  const cmsCount = dashboard?.missed_caretakers ?? 0;
  const tasksCount = dashboard?.pending_tasks ?? 0;
  const visitsCount = visits.length;
  const emergenciesCount = dashboard?.emergency_count ?? emergencies.filter(e => e.status === "active").length;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Patients" value={patientsCount} icon={Users} variant="primary" />
        <StatCard title="Care Managers" value={cmsCount} icon={UserCog} variant="success" />
        <StatCard title="Tasks" value={tasksCount} icon={ClipboardList} variant="warning" />
        <StatCard title="Visits" value={visitsCount} icon={Calendar} variant="accent" />
        <StatCard title="Active Emergencies" value={emergenciesCount} icon={AlertTriangle} variant="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Patient Growth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={patientGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Area type="monotone" dataKey="patients" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Visit Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={visitActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="scheduled" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Emergency Trends</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={emergencyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="emergencies" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Visits</h3>
            <a href="/visits" className="text-xs font-medium text-primary hover:underline">View All</a>
          </div>
          <div className="space-y-3">
            {visits.slice(0, 4).map(v => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{v.visit_type}</p>
                  <p className="text-xs text-muted-foreground">{v.visit_time ? new Date(v.visit_time).toLocaleDateString() : "—"}</p>
                </div>
                <StatusBadge status={v.status || v.visit_type} />
              </div>
            ))}
            {visits.length === 0 && <p className="text-sm text-muted-foreground">No visits yet</p>}
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Active Emergencies</h3>
            <a href="/emergencies" className="text-xs font-medium text-primary hover:underline">View All</a>
          </div>
          <div className="space-y-3">
            {emergencies.slice(0, 4).map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{e.triggered_by}</p>
                  <p className="text-xs text-muted-foreground">Triggered: {new Date(e.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
            {emergencies.length === 0 && <p className="text-sm text-muted-foreground">No emergencies</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
