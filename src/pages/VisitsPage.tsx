import { useState } from "react";
import { ExportButton } from "@/components/ExportButton";
import { CareVisit, Patient, CareManager } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
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
  patient_id: "", care_manager_id: "", visit_type: "Home Visit", notes: "",
  visit_time: "", due_date: "", status: "",
};

export default function VisitsPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "visits");
  const { data: visits = [], isLoading } = useApiList<CareVisit>("care-visits", "/care-visits");
  const { data: patients = [] } = useApiList<Patient>("patients", "/patients");
  const { data: cms = [] } = useApiList<CareManager>("care-managers", "/care-managers");
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

  const filtered = visits.filter(v => {
    const matchesSearch = (v.visit_type || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.notes || "").toLowerCase().includes(search.toLowerCase()) ||
      getPatientName(v.patient_id).toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || v.visit_type === filterType;
    return matchesSearch && matchesType;
  });

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

  const getPatientName = (id: string) => patients.find(p => String(p.id) === id)?.full_name || `Patient #${id}`;
  const getCMName = (id: string) => cms.find(c => String(c.id) === id)?.name || `CM #${id}`;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Visits" subtitle={`${total} total visits`} actionLabel={hasEdit ? "Schedule Visit" : undefined} onAction={hasEdit ? openCreate : undefined}>
        <ExportButton filename="visits" title="Visits Report" columns={[
          { key: "visit_type", label: "Type" }, { key: "visit_time", label: "Time" }, { key: "due_date", label: "Due Date" },
          { key: "status", label: "Status" }, { key: "notes", label: "Notes" },
        ]} data={filtered} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search visits..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Visit Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Home Visit">Home Visit</SelectItem>
            <SelectItem value="Clinic Visit">Clinic Visit</SelectItem>
            <SelectItem value="Emergency Visit">Emergency Visit</SelectItem>
            <SelectItem value="Follow-up">Follow-up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Patient</th>
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
                  <td className="p-4 text-sm font-medium text-foreground">{getPatientName(v.patient_id)}</td>
                  <td className="p-4 text-sm text-foreground">{getCMName(v.care_manager_id)}</td>
                  <td className="p-4 text-sm text-foreground">{v.visit_time ? new Date(v.visit_time).toLocaleString() : "—"}</td>
                  <td className="p-4 text-sm text-foreground">{v.due_date || "—"}</td>
                  <td className="p-4"><StatusBadge status={v.visit_type} /></td>
                  <td className="p-4"><StatusBadge status={v.status || "pending"} /></td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingVisit(v); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Visit Details</DialogTitle></DialogHeader>
          {viewingVisit && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Patient</p><p className="text-sm font-medium">{getPatientName(viewingVisit.patient_id)}</p></div>
                <div><p className="text-xs text-muted-foreground">Care Manager</p><p className="text-sm font-medium">{getCMName(viewingVisit.care_manager_id)}</p></div>
                <div><p className="text-xs text-muted-foreground">Visit Time</p><p className="text-sm font-medium">{viewingVisit.visit_time ? new Date(viewingVisit.visit_time).toLocaleString() : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm font-medium">{viewingVisit.due_date || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Type</p><StatusBadge status={viewingVisit.visit_type} /></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={viewingVisit.status || "pending"} /></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{viewingVisit.notes || "—"}</p></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {hasEdit && <Button onClick={() => { setDetailOpen(false); openEdit(viewingVisit); }}>Edit Visit</Button>}
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
              <Label>Patient <span className="text-destructive">*</span></Label>
              <Select value={editingVisit?.patient_id || ""} onValueChange={v => updateField("patient_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Care Manager</Label>
              <Select value={editingVisit?.care_manager_id || ""} onValueChange={v => updateField("care_manager_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{cms.map(cm => <SelectItem key={cm.id} value={String(cm.id)}>{cm.name}</SelectItem>)}</SelectContent>
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
              <Select value={editingVisit?.visit_type || "Home Visit"} onValueChange={v => updateField("visit_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
