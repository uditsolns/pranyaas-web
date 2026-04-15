import { Heart, Calendar, ClipboardList, Activity, Phone } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useApiGet, useApiList } from "@/hooks/useApi";
import { QuoteCard } from "@/components/QuoteCard";
import { Patient, CareVisit, Task, VitalRecord } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface PatientDashboardData {
  patient?: Patient;
  visits_count?: number;
  tasks_count?: number;
  [key: string]: unknown;
}

export default function PatientDashboard() {
  const { user } = useAuth();

  const { data: dashboard, isLoading: ld } = useApiGet<PatientDashboardData>("patient-dashboard", "/patient/dashboard");
  const { data: patients = [], isLoading: lp } = useApiList<Patient>("patients", "/patients");
  const { data: visits = [], isLoading: lv } = useApiList<CareVisit>("care-visits", "/care-visits");
  const { data: tasks = [], isLoading: lt } = useApiList<Task>("tasks", "/tasks");
  const { data: vitals = [], isLoading: lvt } = useApiList<VitalRecord>("vitals", "/vitals");

  const isLoading = ld || lp || lv || lt || lvt;

  const patient = dashboard?.patient || patients.find(p => p.user_id === String(user?.id)) || patients[0];
  const latestVital = vitals[0];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No patient profile found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 card-shadow border border-border/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
            {patient.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{patient.full_name}</h1>
            <p className="text-sm text-muted-foreground">{patient.age} years · {patient.gender} · {patient.blood_group}</p>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={patient.risk_category || "Low"} />
            </div>
          </div>
          <button className="flex items-center gap-2 bg-destructive text-destructive-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-destructive/90 transition-colors">
            <Phone className="h-5 w-5" />
            SOS Emergency
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Health Status" value={patient.risk_category || "N/A"} icon={Heart} variant={patient.risk_category === "High" ? "warning" : "success"} />
        <StatCard title="Total Visits" value={dashboard?.visits_count ?? visits.length} icon={Calendar} variant="accent" />
        <StatCard title="Pending Tasks" value={tasks.filter(t => t.status === "pending").length} icon={ClipboardList} variant="primary" />
        <StatCard title="Latest Heart Rate" value={latestVital ? `${latestVital.heart_rate} bpm` : "N/A"} icon={Activity} variant="success" />
      </div>

      {latestVital && (
        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Latest Vitals Snapshot</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Temperature", value: latestVital.temperature || "—" },
              { label: "Heart Rate", value: `${latestVital.heart_rate || "—"} bpm` },
              { label: "Blood Pressure", value: latestVital.bp || "—" },
              { label: "Sugar Level", value: latestVital.sugar_level || "—" },
            ].map(v => (
              <div key={v.label} className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">{v.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{v.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QuoteCard />

        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Visits</h3>
          <div className="space-y-3">
            {visits.slice(0, 5).map(v => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{v.visit_type}</p>
                  <p className="text-xs text-muted-foreground">{v.visit_time}</p>
                </div>
                <StatusBadge status={v.status || "pending"} />
              </div>
            ))}
            {visits.length === 0 && <p className="text-sm text-muted-foreground">No visits recorded</p>}
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pending Tasks</h3>
          <div className="space-y-3">
            {tasks.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">Due: {t.due_date}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks assigned</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
