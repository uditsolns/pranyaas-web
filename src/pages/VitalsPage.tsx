import { useState } from "react";
import { ExportButton } from "@/components/ExportButton";
import { VitalRecord, Patient, CareVisit, ApiUser } from "@/types";
import { Input } from "@/components/ui/input";
import { Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TablePagination } from "@/components/TablePagination";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

const emptyVital: Partial<VitalRecord> = {
  patient_id: "", recorded_by: "", care_visits_id: "", bp: "", heart_rate: "",
  sugar_level: "", temperature: "", recorded_at: "",
};

export default function VitalsPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "vitals");
  const { data: vitals = [], isLoading } = useApiList<VitalRecord>("vitals", "/vitals");
  const { data: patients = [] } = useApiList<Patient>("patients", "/patients");
  const { data: users = [] } = useApiList<ApiUser>("users", "/users");
  const { data: careVisits = [] } = useApiList<CareVisit>("care-visits", "/care-visits");
  const recorders = users.filter(u => String(u.role_id) === "1" || String(u.role_id) === "2");
  const createMutation = useApiCreate<VitalRecord>("vitals", "/vitals", "Vital Record");
  const updateMutation = useApiUpdate<VitalRecord>("vitals", "/vitals", "Vital Record");
  const deleteMutation = useApiDelete("vitals", "/vitals", "Vital Record");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVital, setEditingVital] = useState<Partial<VitalRecord> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const filtered = vitals.filter(v => {
    const pName = patients.find(p => String(p.user_id) === String(v.patient_id))?.full_name || "";
    return pName.toLowerCase().includes(search.toLowerCase());
  });
  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingVital({ ...emptyVital }); setDialogOpen(true); };
  const openEdit = (v: VitalRecord) => { setEditingVital({ ...v }); setDialogOpen(true); };

  const handleSave = () => {
    if (!editingVital?.patient_id) return;
    if (editingVital.id) {
      updateMutation.mutate({ id: editingVital.id, data: editingVital }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(editingVital, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof VitalRecord, value: string) => {
    setEditingVital(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const getPatientName = (id: string) => patients.find(p => String(p.user_id) === String(id))?.full_name || `Patient #${id}`;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Vitals" subtitle={`${total} recorded vitals`} actionLabel={hasEdit ? "Record Vitals" : undefined} onAction={hasEdit ? openCreate : undefined}>
        <ExportButton filename="vitals" title="Vitals Report" columns={[
          { key: "temperature", label: "Temp" }, { key: "heart_rate", label: "Heart Rate" }, { key: "bp", label: "BP" },
          { key: "sugar_level", label: "Sugar Level" },
        ]} data={filtered} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by patient..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                {["Patient", "Temperature", "Heart Rate", "BP", "Sugar Level", "Recorded At", "Actions"].map(h => (
                  <th key={h} className={`text-xs font-medium text-muted-foreground p-3 ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No vitals recorded" /></td></tr>
              ) : paged.map(v => (
                <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-3 text-sm font-medium text-foreground">{getPatientName(v.patient_id)}</td>
                  <td className="p-3 text-sm">{v.temperature || "—"}</td>
                  <td className="p-3 text-sm">{v.heart_rate || "—"}</td>
                  <td className="p-3 text-sm">{v.bp || "—"}</td>
                  <td className="p-3 text-sm">{v.sugar_level || "—"}</td>
                  <td className="p-3 text-sm">{formatDate(v.recorded_at || v.created_at)}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingVital?.id ? "Edit Vitals" : "Record Vitals"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Patient <span className="text-destructive">*</span></Label>
              <Select value={editingVital?.patient_id || ""} onValueChange={v => updateField("patient_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={String(p.user_id)}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recorded By</Label>
              <Select value={editingVital?.recorded_by || ""} onValueChange={v => updateField("recorded_by", v)}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {recorders.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name} ({String(u.role_id) === "1" ? "Admin" : "Care Manager"})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Care Visit</Label>
              <Select value={editingVital?.care_visits_id || ""} onValueChange={v => updateField("care_visits_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select visit..." /></SelectTrigger>
                <SelectContent>
                  {careVisits.map(cv => <SelectItem key={cv.id} value={String(cv.id)}>Visit #{cv.id} - {cv.visit_type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input value={editingVital?.temperature || ""} onChange={e => updateField("temperature", e.target.value)} placeholder="e.g. 36.6" />
            </div>
            <div className="space-y-2">
              <Label>Heart Rate</Label>
              <Input value={editingVital?.heart_rate || ""} onChange={e => updateField("heart_rate", e.target.value)} placeholder="e.g. 72" />
            </div>
            <div className="space-y-2">
              <Label>Blood Pressure</Label>
              <Input value={editingVital?.bp || ""} onChange={e => updateField("bp", e.target.value)} placeholder="e.g. 120/80" />
            </div>
            <div className="space-y-2">
              <Label>Sugar Level</Label>
              <Input value={editingVital?.sugar_level || ""} onChange={e => updateField("sugar_level", e.target.value)} placeholder="e.g. 98.5" />
            </div>
            <div className="space-y-2">
              <Label>Recorded At</Label>
              <Input type="datetime-local" value={editingVital?.recorded_at?.replace(" ", "T") || ""} onChange={e => updateField("recorded_at", e.target.value.replace("T", " "))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingVital?.id ? "Update" : "Record"} Vitals
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Vital Record?" />
    </div>
  );
}
