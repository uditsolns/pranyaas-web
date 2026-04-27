import { useState } from "react";
import { ExportButton } from "@/components/ExportButton";
import { MedicationReminder, Patient } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, Loader2, Pill } from "lucide-react";
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

const emptyMedication: Partial<MedicationReminder> = {
  patient_id: "",
  medicine_name: "",
  dosage: "",
  frequency: "",
  start_date: "",
  end_date: "",
  status: "pending",
};

export default function MedicationRemindersPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "medications");
  
  const { data: medications = [], isLoading } = useApiList<MedicationReminder>("medication-reminders", "/medication-reminders");
  const { data: patients = [] } = useApiList<Patient>("patients", "/patients");
  
  const createMutation = useApiCreate<MedicationReminder>("medication-reminders", "/medication-reminders", "Medication Reminder");
  const updateMutation = useApiUpdate<MedicationReminder>("medication-reminders", "/medication-reminders", "Medication Reminder");
  const deleteMutation = useApiDelete("medication-reminders", "/medication-reminders", "Medication Reminder");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MedicationReminder> | null>(null);
  const [viewingItem, setViewingItem] = useState<MedicationReminder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const getPatientName = (id: string | number) => {
    const p = patients.find(p => String(p.user_id) === String(id) || String(p.id) === String(id));
    return p?.full_name || `Patient #${id}`;
  };

  const filtered = medications.filter(m => {
    const pName = getPatientName(m.patient_id);
    return (
      (m.medicine_name || "").toLowerCase().includes(search.toLowerCase()) ||
      pName.toLowerCase().includes(search.toLowerCase())
    );
  });
  
  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingItem({ ...emptyMedication }); setDialogOpen(true); };
  const openEdit = (m: MedicationReminder) => { setEditingItem({ ...m }); setDialogOpen(true); };

  const handleSave = () => {
    if (!editingItem?.medicine_name?.trim() || !editingItem?.patient_id) return;
    
    if (editingItem.id) {
      updateMutation.mutate({ id: editingItem.id, data: editingItem }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(editingItem, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof MedicationReminder, value: string) => {
    setEditingItem(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Medication Reminders" 
        subtitle={`${total} medication reminders`} 
        actionLabel={hasEdit ? "Add Medication" : undefined} 
        onAction={hasEdit ? openCreate : undefined}
      >
        <ExportButton filename="medications" title="Medications Report" columns={[
          { key: "medicine_name", label: "Medicine" }, 
          { key: "dosage", label: "Dosage" }, 
          { key: "frequency", label: "Frequency" },
          { key: "start_date", label: "Start Date" }, 
          { key: "end_date", label: "End Date" },
          { key: "status", label: "Status" },
        ]} data={filtered} />
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search medications or patients..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Patient</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Medicine</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Dosage / Freq</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Period</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6}><EmptyState title="No medications found" icon={Pill} /></td></tr>
              ) : paged.map(m => (
                <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-4 text-sm font-medium text-foreground">{getPatientName(m.patient_id)}</td>
                  <td className="p-4 text-sm text-foreground">{m.medicine_name}</td>
                  <td className="p-4 text-sm text-foreground">{m.dosage} <span className="text-muted-foreground text-xs ml-1">({m.frequency})</span></td>
                  <td className="p-4 text-sm text-foreground">
                    <div className="text-xs">{m.start_date} to</div>
                    <div className="text-xs font-medium">{m.end_date}</div>
                  </td>
                  <td className="p-4"><StatusBadge status={m.status || "pending"} /></td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingItem(m); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(m.id)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Medication Details</DialogTitle></DialogHeader>
          {viewingItem && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Patient</p><p className="text-sm font-medium">{getPatientName(viewingItem.patient_id)}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={viewingItem.status || "pending"} /></div>
                <div><p className="text-xs text-muted-foreground">Medicine</p><p className="text-sm font-medium">{viewingItem.medicine_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Dosage</p><p className="text-sm font-medium">{viewingItem.dosage}</p></div>
                <div><p className="text-xs text-muted-foreground">Frequency</p><p className="text-sm font-medium">{viewingItem.frequency}</p></div>
                <div><p className="text-xs text-muted-foreground">Period</p><p className="text-sm font-medium">{viewingItem.start_date} to {viewingItem.end_date}</p></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {hasEdit && <Button onClick={() => { setDetailOpen(false); openEdit(viewingItem); }}>Edit</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingItem?.id ? "Edit Medication" : "Add Medication"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Patient <span className="text-destructive">*</span></Label>
              <Select value={editingItem?.patient_id ? String(editingItem.patient_id) : ""} onValueChange={v => updateField("patient_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={String(p.user_id || p.id)}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Medicine Name <span className="text-destructive">*</span></Label>
              <Input value={editingItem?.medicine_name || ""} onChange={e => updateField("medicine_name", e.target.value)} placeholder="e.g. Metformin" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dosage</Label>
                <Input value={editingItem?.dosage || ""} onChange={e => updateField("dosage", e.target.value)} placeholder="e.g. 500mg" />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Input value={editingItem?.frequency || ""} onChange={e => updateField("frequency", e.target.value)} placeholder="e.g. Twice a day" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={editingItem?.start_date || ""} onChange={e => updateField("start_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={editingItem?.end_date || ""} onChange={e => updateField("end_date", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editingItem?.status ? String(editingItem.status).toLowerCase() : "pending"} onValueChange={v => updateField("status", v)}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || !editingItem?.patient_id || !editingItem?.medicine_name}>
              {editingItem?.id ? "Update" : "Save"} Medication
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Medication?" />
    </div>
  );
}
