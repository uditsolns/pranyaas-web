import { useState, useMemo } from "react";
import { ExportButton } from "@/components/ExportButton";
import { CareVisit, Senior, CareManager, Task, VitalRecord } from "@/types";
import { getStorageUrl } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, Calendar as CalendarIcon, Loader2, List, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TablePagination } from "@/components/TablePagination";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import { useApiList, useApiCreate, useApiUpdatePost, useApiDelete } from "@/hooks/useApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

const emptyVisit: Partial<CareVisit> = {
  patient_id: "", care_manager_id: "", visit_type: "", notes: "",
  visit_time: "", due_date: "", status: "",
};

export default function VisitsPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "visits");
  const { data: visits = [], isLoading } = useApiList<CareVisit>("care-visits", "/care-visits");
  const { data: seniors = [] } = useApiList<Senior>("patients", "/patients");
  const { data: cms = [] } = useApiList<CareManager>("care-managers", "/care-managers");
  const { data: tasks = [] } = useApiList<Task>("tasks", "/tasks");
  const { data: vitals = [] } = useApiList<VitalRecord>("vitals", "/vitals");
  const createMutation = useApiCreate<CareVisit>("care-visits", "/care-visits", "Visit");
  const updateMutation = useApiUpdatePost<CareVisit>("care-visits", "/care-visits", "Visit");
  const deleteMutation = useApiDelete("care-visits", "/care-visits", "Visit");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Partial<CareVisit> | null>(null);
  const [viewingVisit, setViewingVisit] = useState<CareVisit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [filterSenior, setFilterSenior] = useState("all");
  const [filterCM, setFilterCM] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getSeniorName = (id: string | number) => {
    if (!id) return "N/A";
    const p = seniors.find(p => String(p.user_id) === String(id) || String(p.id) === String(id));
    return p?.full_name || `Senior #${id}`;
  };

  const getCMName = (id: string | number) => {
    if (!id) return "N/A";
    const c = cms.find(c => String(c.user_id) === String(id) || String(c.id) === String(id));
    return c?.name || `CM #${id}`;
  };

  const filtered = useMemo(() => {
    return visits.filter(v => {
      const pName = getSeniorName(v.patient_id);
      const cmName = getCMName(v.care_manager_id);
      const matchesSearch = 
        (v.visit_type || "").toLowerCase().includes(search.toLowerCase()) ||
        (v.notes || "").toLowerCase().includes(search.toLowerCase()) ||
        pName.toLowerCase().includes(search.toLowerCase()) ||
        cmName.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "all" || v.visit_type === filterType;
      const matchesSenior = filterSenior === "all" || String(v.patient_id) === filterSenior;
      const matchesCM = filterCM === "all" || String(v.care_manager_id) === filterCM;
      
      const visitDate = v.due_date ? v.due_date.split(" ")[0] : "";
      const matchesDateFrom = !filterDateFrom || visitDate >= filterDateFrom;
      const matchesDateTo = !filterDateTo || visitDate <= filterDateTo;

      return matchesSearch && matchesType && matchesSenior && matchesCM && matchesDateFrom && matchesDateTo;
    });
  }, [visits, seniors, cms, search, filterType, filterSenior, filterCM, filterDateFrom, filterDateTo]);

  const cmCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(v => {
      const cmName = getCMName(v.care_manager_id);
      if (cmName && cmName !== "N/A") {
        counts[cmName] = (counts[cmName] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filtered, cms]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingVisit({ ...emptyVisit }); setDialogOpen(true); };
  const openEdit = (v: CareVisit) => { setEditingVisit({ ...v }); setDialogOpen(true); };

  const handleSave = () => {
    if (!editingVisit?.patient_id) return;
    if (editingVisit.id) {
      updateMutation.mutate({ id: editingVisit.id, data: editingVisit }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(editingVisit, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof CareVisit, value: string) => {
    setEditingVisit(prev => prev ? { ...prev, [field]: value } : prev);
  };

  // Helper functions moved above filtered useMemo


  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Visits" subtitle={`${total} total visits`} actionLabel={hasEdit ? "Schedule Visit" : undefined} onAction={hasEdit ? openCreate : undefined}>
        <div className="flex items-center gap-2">
          <div className="bg-secondary/50 p-1 rounded-md flex items-center border border-border/50">
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4 mr-1" /> List
            </Button>
            <Button variant={viewMode === "calendar" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setViewMode("calendar")}>
              <CalendarIcon className="h-4 w-4 mr-1" /> Calendar
            </Button>
          </div>
          <ExportButton filename="visits" title="Visits Report" columns={[
          { key: "visit_type", label: "Type" }, { key: "visit_time", label: "Time" }, { key: "due_date", label: "Due Date" },
          { key: "status", label: "Status" }, { key: "notes", label: "Notes" },
        ]} data={filtered} />
        </div>
      </PageHeader>

      {cmCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cmCounts.map(([cm, count]) => (
            <div key={cm} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-medium">
              {cm}: {count}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search visits..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterSenior} onValueChange={v => { setFilterSenior(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Seniors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seniors</SelectItem>
            {seniors.map(s => <SelectItem key={s.id} value={String(s.user_id)}>{s.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCM} onValueChange={v => { setFilterCM(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Care Managers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Care Managers</SelectItem>
            {cms.map(c => <SelectItem key={c.id} value={String(c.user_id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 bg-card border border-input rounded-md px-2 focus-within:ring-1 focus-within:ring-ring">
          <span className="text-xs text-muted-foreground whitespace-nowrap">From</span>
          <Input 
            type="date" 
            value={filterDateFrom} 
            onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} 
            className="w-[130px] border-0 h-9 p-0 focus-visible:ring-0 shadow-none bg-transparent"
          />
        </div>
        <div className="flex items-center gap-2 bg-card border border-input rounded-md px-2 focus-within:ring-1 focus-within:ring-ring">
          <span className="text-xs text-muted-foreground whitespace-nowrap">To</span>
          <Input 
            type="date" 
            value={filterDateTo} 
            onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} 
            className="w-[130px] border-0 h-9 p-0 focus-visible:ring-0 shadow-none bg-transparent"
          />
        </div>
        <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Visit Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Home Visit">Home Visit</SelectItem>
            <SelectItem value="Clinic Visit">Clinic Visit</SelectItem>
            <SelectItem value="Emergency Visit">Emergency Visit</SelectItem>
            <SelectItem value="Follow-up">Follow-up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {viewMode === "list" ? (
        <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30">
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Senior</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Care Manager</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Visit Time</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Due Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState title="No visits found" /></td></tr>
                ) : paged.map(v => (
                  <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="p-4 text-sm font-medium text-foreground">{getSeniorName(v.patient_id)}</td>
                    <td className="p-4 text-sm text-foreground">{getCMName(v.care_manager_id)}</td>
                    <td className="p-4 text-sm text-foreground">{formatDateTime(v.visit_time)}</td>
                    <td className="p-4 text-sm text-foreground">{v.due_date || "—"}</td>
                    <td className="p-4"><StatusBadge status={v.visit_type} /></td>
                    <td className="p-4"><StatusBadge status={v.status || "pending"} /></td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingVisit(v); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                        {hasEdit && v.status !== "completed" && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
                        {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(v.id)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
        </div>
      ) : (
        <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">{monthName}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="bg-secondary/30 p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-card min-h-[120px] p-2 opacity-50"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
              const dayVisits = filtered.filter(v => v.due_date && v.due_date.startsWith(dateStr));
              
              return (
                <div key={date} className="bg-card min-h-[120px] p-2 border-t border-transparent group hover:bg-secondary/10 transition-colors">
                  <div className="font-medium text-sm text-muted-foreground mb-2">{date}</div>
                  <div className="space-y-1">
                    {dayVisits.map(v => (
                      <div 
                        key={v.id} 
                        onClick={() => { setViewingVisit(v); setDetailOpen(true); }}
                        className="text-[10px] px-1.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 truncate cursor-pointer hover:bg-primary/20 transition-colors"
                        title={`${getSeniorName(v.patient_id)} - ${v.visit_type}`}
                      >
                        {getSeniorName(v.patient_id)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Visit Details</DialogTitle></DialogHeader>
          {viewingVisit && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Senior</p><p className="text-sm font-medium">{getSeniorName(viewingVisit.patient_id)}</p></div>
                <div><p className="text-xs text-muted-foreground">Care Manager</p><p className="text-sm font-medium">{getCMName(viewingVisit.care_manager_id)}</p></div>
                <div><p className="text-xs text-muted-foreground">Visit Time</p><p className="text-sm font-medium">{formatDateTime(viewingVisit.visit_time)}</p></div>
                <div><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm font-medium">{viewingVisit.due_date || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Type</p><StatusBadge status={viewingVisit.visit_type} /></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={viewingVisit.status || "pending"} /></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{viewingVisit.notes || "—"}</p></div>
              </div>

              {viewingVisit.status === "completed" && (
                <div className="mt-6 space-y-6 border-t pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Visit Photo</p>
                    {viewingVisit.visit_photo ? (
                      <img 
                        src={getStorageUrl(viewingVisit.visit_photo) || ""} 
                        alt="Visit" 
                        className="rounded-md max-w-full h-auto max-h-[300px] object-cover" 
                        onError={e => (e.currentTarget.style.display = "none")}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No photo uploaded</p>
                    )}
                  </div>
                  
                  {(() => {
                    const visitTasks = tasks.filter(t => String(t.patient_id) === String(viewingVisit.patient_id) && t.due_date && viewingVisit.due_date && t.due_date.startsWith(viewingVisit.due_date.substring(0, 10)));
                    if (visitTasks.length > 0) {
                      return (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Associated Tasks</p>
                          <div className="space-y-2">
                            {visitTasks.map(t => (
                              <div key={t.id} className="text-sm flex items-center justify-between bg-secondary/30 p-2 rounded-md">
                                <span>{t.title}</span>
                                <StatusBadge status={t.status || "pending"} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {(() => {
                    const visitVitals = vitals.filter(v => String(v.care_visits_id) === String(viewingVisit.id));
                    if (visitVitals.length > 0) {
                      return (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Vitals Recorded</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {visitVitals.map(v => (
                              <div key={v.id} className="col-span-2 grid grid-cols-2 gap-2 bg-secondary/30 p-3 rounded-md">
                                <div><span className="text-muted-foreground text-xs">BP:</span> {v.bp || "—"}</div>
                                <div><span className="text-muted-foreground text-xs">Heart Rate:</span> {v.heart_rate || "—"}</div>
                                <div><span className="text-muted-foreground text-xs">Sugar Level:</span> {v.sugar_level || "—"}</div>
                                <div><span className="text-muted-foreground text-xs">SpO2:</span> {v.spo2 || "—"}</div>
                                <div><span className="text-muted-foreground text-xs">Temp:</span> {v.temperature || "—"}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {hasEdit && viewingVisit.status !== "completed" && <Button onClick={() => { setDetailOpen(false); openEdit(viewingVisit); }}>Edit Visit</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingVisit?.id ? "Edit Visit" : "Schedule Visit"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Senior <span className="text-destructive">*</span></Label>
              <Select value={editingVisit?.patient_id || ""} onValueChange={v => updateField("patient_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{seniors.map(p => <SelectItem key={p.id} value={String(p.user_id)}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Care Manager</Label>
              <Select value={editingVisit?.care_manager_id || ""} onValueChange={v => updateField("care_manager_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{cms.map(cm => <SelectItem key={cm.id} value={String(cm.user_id)}>{cm.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visit Time</Label>
              <Input type="datetime-local" value={editingVisit?.visit_time?.replace(" ", "T") || ""} onChange={e => updateField("visit_time", e.target.value.replace("T", " "))} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={editingVisit?.due_date || ""} onChange={e => updateField("due_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Visit Type</Label>
              <Select value={editingVisit?.visit_type || ""} onValueChange={v => updateField("visit_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Home Visit">Home Visit</SelectItem>
                  <SelectItem value="Clinic Visit">Clinic Visit</SelectItem>
                  <SelectItem value="Emergency Visit">Emergency Visit</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editingVisit?.status || ""} onValueChange={v => updateField("status", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={editingVisit?.notes || ""} onChange={e => updateField("notes", e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingVisit?.id ? "Update" : "Schedule"} Visit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Visit?" />
    </div>
  );
}
