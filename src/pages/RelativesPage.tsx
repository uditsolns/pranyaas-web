import { useState } from "react";
import { ExportButton } from "@/components/ExportButton";
import { Relative, Patient } from "@/types";
import { Input } from "@/components/ui/input";
import { Search, Pencil, Trash2, Loader2 } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

type RelativeForm = Partial<Relative> & { password?: string };

const emptyRelative: RelativeForm = {
  relative_name: "", patient_id: "", password: "", relationship: "", location_type: "",
  country: "India", phone_number: "", whatsapp_number: "", email: "",
  aadhaar_no: "", pan_no: "", preferred_update_mode: "",
  secondary_escalation_contact: "",
};

export default function RelativesPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "relatives");
  const { data: relatives = [], isLoading } = useApiList<Relative>("relatives", "/relatives");
  const { data: patients = [] } = useApiList<Patient>("patients", "/patients");
  const createMutation = useApiCreate<Relative>("relatives", "/relatives", "Relative");
  const updateMutation = useApiUpdatePost<Relative>("relatives", "/relatives", "Relative");
  const deleteMutation = useApiDelete("relatives", "/relatives", "Relative");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RelativeForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const filtered = relatives.filter(r =>
    (r.relative_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.patient?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingItem({ ...emptyRelative }); setDialogOpen(true); };
  const openEdit = (r: Relative) => { setEditingItem({ ...r }); setDialogOpen(true); };

  const handleSave = () => {
    if (!editingItem?.relative_name?.trim()) return;
    if (editingItem.id) {
      updateMutation.mutate({ id: editingItem.id, data: editingItem }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(editingItem as Partial<Relative>, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: string, value: string) => {
    setEditingItem(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Relatives" subtitle={`${total} registered relatives`} actionLabel={hasEdit ? "Add Relative" : undefined} onAction={hasEdit ? openCreate : undefined}>
        <ExportButton filename="relatives" title="Relatives Report" columns={[
          { key: "relative_name", label: "Name" }, { key: "relationship", label: "Relationship" },
          { key: "phone_number", label: "Phone" }, { key: "email", label: "Email" }, { key: "location_type", label: "Location" },
        ]} data={filtered} />
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search relatives..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Patient</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Relationship</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Location</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Phone</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Update Mode</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No relatives found" /></td></tr>
              ) : paged.map(r => (
                <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-4 text-sm font-medium text-foreground">{r.relative_name}</td>
                  <td className="p-4 text-sm text-foreground">{r.patient?.full_name || `Patient #${r.patient_id}`}</td>
                  <td className="p-4 text-sm text-foreground">{r.relationship}</td>
                  <td className="p-4 text-sm text-foreground">{r.location_type} {r.country ? `(${r.country})` : ""}</td>
                  <td className="p-4 text-sm text-foreground">{r.phone_number}</td>
                  <td className="p-4 text-sm text-foreground">{r.preferred_update_mode}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(r.id)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>}
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
          <DialogHeader><DialogTitle>{editingItem?.id ? "Edit Relative" : "Add Relative"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Relative Name <span className="text-destructive">*</span></Label>
              <Input value={editingItem?.relative_name || ""} onChange={e => updateField("relative_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Patient <span className="text-destructive">*</span></Label>
              <Select value={editingItem?.patient_id || ""} onValueChange={v => updateField("patient_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!editingItem?.id && (
              <div className="space-y-2">
                <Label>Password <span className="text-destructive">*</span></Label>
                <Input type="password" value={editingItem?.password || ""} onChange={e => updateField("password", e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Input value={editingItem?.relationship || ""} onChange={e => updateField("relationship", e.target.value)} placeholder="e.g. Brother, Sister, Wife" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editingItem?.phone_number || ""} onChange={e => updateField("phone_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={editingItem?.whatsapp_number || ""} onChange={e => updateField("whatsapp_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editingItem?.email || ""} onChange={e => updateField("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Aadhaar No</Label>
              <Input value={editingItem?.aadhaar_no || ""} onChange={e => updateField("aadhaar_no", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>PAN No</Label>
              <Input value={editingItem?.pan_no || ""} onChange={e => updateField("pan_no", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={editingItem?.location_type || ""} onValueChange={v => updateField("location_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select Location..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="NRI">NRI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={editingItem?.country || ""} onChange={e => updateField("country", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Preferred Update Mode</Label>
              <Select value={editingItem?.preferred_update_mode || ""} onValueChange={v => updateField("preferred_update_mode", v)}>
                <SelectTrigger><SelectValue placeholder="Select Mode..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="Call">Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Secondary Escalation Contact</Label>
              <Input value={editingItem?.secondary_escalation_contact || ""} onChange={e => updateField("secondary_escalation_contact", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingItem?.id ? "Update" : "Add"} Relative
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Relative?" />
    </div>
  );
}
