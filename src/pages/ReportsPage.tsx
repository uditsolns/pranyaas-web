import { useState, useMemo } from "react";
import { useApiList } from "@/hooks/useApi";
import { Senior, CareVisit, Task, EmergencyAlert, Plan, Vendor, CareManager } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(160, 60%, 45%)", "hsl(40, 90%, 54%)", "hsl(24, 90%, 54%)", "hsl(0, 84%, 60%)", "#8884d8", "#82ca9d", "#ffc658"];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("overview");
  const [selectedCareManager, setSelectedCareManager] = useState("all");
  const [vendorCategory, setVendorCategory] = useState("all");

  const { data: seniors = [], isLoading: lp } = useApiList<Senior>("patients", "/patients");
  const { data: visits = [], isLoading: lv } = useApiList<CareVisit>("visits", "/care-visits");
  const { data: tasks = [], isLoading: lt } = useApiList<Task>("tasks", "/tasks");
  const { data: emergencies = [], isLoading: le } = useApiList<EmergencyAlert>("emergencies", "/emergency-alerts");
  const { data: careManagers = [], isLoading: lcm } = useApiList<CareManager>("care-managers", "/care-managers");
  const { data: plans = [], isLoading: lpl } = useApiList<Plan>("plans", "/plans");
  const { data: vendors = [], isLoading: lvd } = useApiList<Vendor>("vendors", "/vendors");

  const isLoading = lp || lv || lt || le || lcm || lpl || lvd;

  // OVERVIEW DATA
  const riskDistribution = useMemo(() => {
    return [
      { name: "Low", value: seniors.filter(p => p.risk_category === "Low").length },
      { name: "Medium", value: seniors.filter(p => p.risk_category === "Medium").length },
      { name: "High", value: seniors.filter(p => p.risk_category === "High").length },
      { name: "Critical", value: seniors.filter(p => p.risk_category === "Critical").length },
    ].filter(d => d.value > 0);
  }, [seniors]);

  const planUserWiseData = useMemo(() => {
    const planCounts: Record<string, number> = {};
    seniors.forEach(senior => {
      senior.care_plans?.forEach(cp => {
        if (cp.plan_id) {
          planCounts[cp.plan_id] = (planCounts[cp.plan_id] || 0) + 1;
        }
      });
    });
    return Object.entries(planCounts).map(([planId, count]) => {
      const plan = plans.find(p => String(p.id) === planId);
      return { name: plan ? plan.plan_name : `Plan ${planId}`, count };
    });
  }, [seniors, plans]);

  const cmSeniorCountData = useMemo(() => {
    const cmCounts: Record<string, number> = {};
    seniors.forEach(senior => {
      if (senior.care_manager_id) {
        cmCounts[senior.care_manager_id] = (cmCounts[senior.care_manager_id] || 0) + 1;
      }
    });
    return Object.entries(cmCounts).map(([cmId, count]) => {
      const cm = careManagers.find(c => String(c.id) === cmId);
      return { name: cm ? cm.name : `CM ${cmId}`, count };
    });
  }, [seniors, careManagers]);

  // TASKS DATA (Filtered by selectedCareManager)
  const taskCompletionData = useMemo(() => {
    const filteredTasks = selectedCareManager === "all" ? tasks : tasks.filter(t => String(t.care_manager_id) === selectedCareManager);
    const completed = filteredTasks.filter(t => t.status === "Completed" || t.status === "completed").length;
    const inProgress = filteredTasks.filter(t => t.status === "In Progress" || t.status === "in_progress").length;
    const pending = filteredTasks.filter(t => t.status === "Pending" || t.status === "pending").length;
    return [
      { name: "Completed", value: completed },
      { name: "In Progress", value: inProgress },
      { name: "Pending", value: pending },
    ].filter(d => d.value > 0);
  }, [tasks, selectedCareManager]);

  // VISITS DATA (Filtered by selectedCareManager)
  const visitActivityData = useMemo(() => {
    const filteredVisits = selectedCareManager === "all" ? visits : visits.filter(v => String(v.care_manager_id) === selectedCareManager);
    const monthCounts: Record<string, { completed: number, scheduled: number }> = {};
    
    filteredVisits.forEach(v => {
       const date = new Date(v.created_at || v.visit_time || Date.now());
       const month = date.toLocaleString('default', { month: 'short' });
       if (!monthCounts[month]) monthCounts[month] = { completed: 0, scheduled: 0 };
       if (v.status === "Completed" || v.status === "completed") monthCounts[month].completed++;
       else monthCounts[month].scheduled++;
    });

    return Object.entries(monthCounts).map(([month, counts]) => ({ month, ...counts }));
  }, [visits, selectedCareManager]);

  // EMERGENCIES DATA
  const emergencySolvedData = useMemo(() => {
    const resolved = emergencies.filter(e => e.status === "Resolved" || e.status === "resolved").length;
    const active = emergencies.length - resolved;
    return [
      { name: "Resolved", value: resolved },
      { name: "Active/Pending", value: active }
    ].filter(d => d.value > 0);
  }, [emergencies]);

  // VENDORS DATA
  const vendorLocationData = useMemo(() => {
    let filteredVendors = vendors;
    if (vendorCategory !== "all") {
      filteredVendors = vendors.filter(v => v.type === vendorCategory);
    }
    const locationCounts: Record<string, number> = {};
    filteredVendors.forEach(v => {
      const loc = v.coverage_area || v.address || "Unknown";
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    return Object.entries(locationCounts).map(([loc, count]) => ({ name: loc, count }));
  }, [vendors, vendorCategory]);

  const uniqueVendorCategories = useMemo(() => {
    return Array.from(new Set(vendors.map(v => v.type).filter(Boolean)));
  }, [vendors]);

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
            <SelectItem value="vendors">Vendors Report</SelectItem>
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
              <p className="text-xs text-muted-foreground uppercase">Total Seniors</p>
              <p className="text-2xl font-bold text-foreground mt-1">{seniors.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 card-shadow border border-border/50">
              <p className="text-xs text-muted-foreground uppercase">Total Visits</p>
              <p className="text-2xl font-bold text-foreground mt-1">{visits.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 card-shadow border border-border/50">
              <p className="text-xs text-muted-foreground uppercase">Completed Tasks</p>
              <p className="text-2xl font-bold text-foreground mt-1">{tasks.filter(t => t.status === "Completed" || t.status === "completed").length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 card-shadow border border-border/50">
              <p className="text-xs text-muted-foreground uppercase">Emergencies</p>
              <p className="text-2xl font-bold text-foreground mt-1">{emergencies.length}</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reportType === "overview" && (
          <>
            <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
              <h3 className="text-sm font-semibold text-foreground mb-4">Senior Risk Distribution</h3>
              {riskDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                      {riskDistribution.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>}
            </div>

            <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
              <h3 className="text-sm font-semibold text-foreground mb-4">Plan User Wise Graph</h3>
              {planUserWiseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={planUserWiseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Seniors" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>}
            </div>

            <div className="bg-card rounded-xl p-5 card-shadow border border-border/50 lg:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-4">Care Manager vs Senior Count</h3>
              {cmSeniorCountData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={cmSeniorCountData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Seniors Assigned" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>}
            </div>
          </>
        )}

        {(reportType === "tasks" || reportType === "visits") && (
          <div className="lg:col-span-2 bg-card rounded-xl p-5 card-shadow border border-border/50 flex items-center gap-4">
            <span className="text-sm font-medium">Filter by Care Manager:</span>
            <Select value={selectedCareManager} onValueChange={setSelectedCareManager}>
              <SelectTrigger className="w-[250px]"><SelectValue placeholder="All Care Managers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Care Managers</SelectItem>
                {careManagers.map(cm => (
                  <SelectItem key={cm.id} value={String(cm.id)}>{cm.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {reportType === "tasks" && (
          <div className="bg-card rounded-xl p-5 card-shadow border border-border/50 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Task Completion Rate</h3>
            {taskCompletionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={taskCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>}
          </div>
        )}

        {reportType === "visits" && (
          <div className="bg-card rounded-xl p-5 card-shadow border border-border/50 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Visit Activity</h3>
            {visitActivityData.length > 0 ? (
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
            ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>}
          </div>
        )}

        {reportType === "emergencies" && (
          <div className="bg-card rounded-xl p-5 card-shadow border border-border/50 lg:col-span-2 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-foreground mb-4 self-start">Emergency Solved Rate</h3>
            {emergencySolvedData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={emergencySolvedData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                    {emergencySolvedData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.name === "Resolved" ? "hsl(160, 60%, 45%)" : "hsl(0, 84%, 60%)"} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>}
          </div>
        )}

        {reportType === "vendors" && (
          <div className="lg:col-span-2 bg-card rounded-xl p-5 card-shadow border border-border/50">
             <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-medium">Filter by Category:</span>
                <Select value={vendorCategory} onValueChange={setVendorCategory}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueVendorCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
            
            <h3 className="text-sm font-semibold text-foreground mb-4">Vendors Count (Location Wise)</h3>
            {vendorLocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendorLocationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} name="Vendors" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>}
          </div>
        )}

      </div>
    </div>
  );
}
