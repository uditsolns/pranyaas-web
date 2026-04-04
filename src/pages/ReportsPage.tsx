import { useState } from "react";
import { useApiList } from "@/hooks/useApi";
import { Patient, CareVisit, Task, EmergencyAlert } from "@/types";
import { taskCompletionData, visitActivityData, emergencyTrendsData } from "@/data/mock";
import { PageHeader } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(160, 60%, 45%)", "hsl(40, 90%, 54%)", "hsl(24, 90%, 54%)", "hsl(0, 84%, 60%)"];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("overview");

  const { data: patients = [], isLoading: lp } = useApiList<Patient>("patients", "/patients");
  const { data: visits = [], isLoading: lv } = useApiList<CareVisit>("visits", "/care-visits");
  const { data: tasks = [], isLoading: lt } = useApiList<Task>("tasks", "/tasks");
  const { data: emergencies = [], isLoading: le } = useApiList<EmergencyAlert>("emergencies", "/emergency-alerts");

  const isLoading = lp || lv || lt || le;

  const riskDistribution = [
    { name: "Low", value: patients.filter(p => p.risk_category === "Low").length },
    { name: "Medium", value: patients.filter(p => p.risk_category === "Medium").length },
    { name: "High", value: patients.filter(p => p.risk_category === "High").length },
    { name: "Critical", value: patients.filter(p => p.risk_category === "Critical").length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Analytics and reports">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">Overview</SelectItem>
            <SelectItem value="visits">Visit Reports</SelectItem>
            <SelectItem value="tasks">Task Reports</SelectItem>
            <SelectItem value="emergencies">Emergency Logs</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          <>
            <div className="bg-card rounded-xl p-4 card-shadow border border-border/50">
              <p className="text-xs text-muted-foreground uppercase">Total Patients</p>
              <p className="text-2xl font-bold text-foreground mt-1">{patients.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 card-shadow border border-border/50">
              <p className="text-xs text-muted-foreground uppercase">Total Visits</p>
              <p className="text-2xl font-bold text-foreground mt-1">{visits.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 card-shadow border border-border/50">
              <p className="text-xs text-muted-foreground uppercase">Completed Tasks</p>
              <p className="text-2xl font-bold text-foreground mt-1">{tasks.filter(t => t.status === "Completed").length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 card-shadow border border-border/50">
              <p className="text-xs text-muted-foreground uppercase">Emergencies</p>
              <p className="text-2xl font-bold text-foreground mt-1">{emergencies.length}</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Patient Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {riskDistribution.map((_, idx) => <Cell key={idx} fill={COLORS[idx]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Task Completion Rate</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={taskCompletionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Visit Activity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={visitActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Completed" />
              <Bar dataKey="scheduled" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Scheduled" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Emergency Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
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
    </div>
  );
}
