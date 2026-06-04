import { useState } from "react";
import { toast } from "sonner";
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const filtered = relatives.filter(r =>
    (r.relative_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.patient?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingItem({ ...emptyRelative }); setErrors({}); setDialogOpen(true); };
  const openEdit = (r: Relative) => { setEditingItem({ ...r }); setErrors({}); setDialogOpen(true); };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!editingItem) return false;

    if (!editingItem.relative_name?.trim()) newErrors.relative_name = "Relative Name is required";
    if (!editingItem.patient_id) newErrors.patient_id = "Patient selection is required";
    
    if (!editingItem.id && (!editingItem.password || editingItem.password.length < 6)) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (editingItem.phone_number && !/^\d{10}$/.test(editingItem.phone_number)) {
      newErrors.phone_number = "Phone number must be 10 digits";
    }

    if (editingItem.whatsapp_number && !/^\d{10}$/.test(editingItem.whatsapp_number)) {
      newErrors.whatsapp_number = "WhatsApp number must be 10 digits";
    }

    if (editingItem.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingItem.email)) {
      newErrors.email = "Invalid email format";
    }

    if (editingItem.aadhaar_no && !/^\d{12}$/.test(editingItem.aadhaar_no)) {
      newErrors.aadhaar_no = "Aadhaar Number must be 12 digits";
    }

    if (editingItem.pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editingItem.pan_no.toUpperCase())) {
      newErrors.pan_no = "Invalid PAN format";
    }

    setErrors(newErrors);
    const errorMessages = Object.values(newErrors);
    if (errorMessages.length > 0) {
      toast.error(errorMessages[0]);
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    if (editingItem.id) {
      updateMutation.mutate({ id: editingItem.id, data: editingItem }, { 
        onSuccess: () => { setDialogOpen(false); toast.success("Relative updated successfully"); } 
      });
    } else {
      createMutation.mutate(editingItem as Partial<Relative>, { 
        onSuccess: () => { setDialogOpen(false); toast.success("Relative added successfully"); } 
      });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: string, value: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
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
              <Label className={errors.relative_name ? "text-destructive" : ""}>Relative Name <span className="text-destructive">*</span></Label>
              <Input 
                value={editingItem?.relative_name || ""} 
                onChange={e => updateField("relative_name", e.target.value)} 
                className={errors.relative_name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.relative_name && <p className="text-[10px] text-destructive font-medium">{errors.relative_name}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.patient_id ? "text-destructive" : ""}>Patient <span className="text-destructive">*</span></Label>
              <Select 
                value={editingItem?.patient_id ? (() => {
                  const p = patients.find(p => String(p.id) === String(editingItem.patient_id) || String(p.user_id) === String(editingItem.patient_id));
                  return p ? String(p.user_id) : String(editingItem.patient_id);
                })() : ""} 
                onValueChange={v => updateField("patient_id", v)}
              >
                <SelectTrigger className={errors.patient_id ? "border-destructive focus:ring-destructive" : ""}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.user_id} value={String(p.user_id)}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.patient_id && <p className="text-[10px] text-destructive font-medium">{errors.patient_id}</p>}
            </div>
            {!editingItem?.id && (
              <div className="space-y-2">
                <Label className={errors.password ? "text-destructive" : ""}>Password <span className="text-destructive">*</span></Label>
                <Input 
                  type="password" 
                  value={editingItem?.password || ""} 
                  onChange={e => updateField("password", e.target.value)} 
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.password && <p className="text-[10px] text-destructive font-medium">{errors.password}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Input value={editingItem?.relationship || ""} onChange={e => updateField("relationship", e.target.value)} placeholder="e.g. Brother, Sister, Wife" />
            </div>
            <div className="space-y-2">
              <Label className={errors.phone_number ? "text-destructive" : ""}>Phone</Label>
              <Input 
                value={editingItem?.phone_number || ""} 
                onChange={e => updateField("phone_number", e.target.value)} 
                className={errors.phone_number ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.phone_number && <p className="text-[10px] text-destructive font-medium">{errors.phone_number}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.whatsapp_number ? "text-destructive" : ""}>WhatsApp</Label>
              <Input 
                value={editingItem?.whatsapp_number || ""} 
                onChange={e => updateField("whatsapp_number", e.target.value)} 
                className={errors.whatsapp_number ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.whatsapp_number && <p className="text-[10px] text-destructive font-medium">{errors.whatsapp_number}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.email ? "text-destructive" : ""}>Email</Label>
              <Input 
                type="email" 
                value={editingItem?.email || ""} 
                onChange={e => updateField("email", e.target.value)} 
                className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.email && <p className="text-[10px] text-destructive font-medium">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.aadhaar_no ? "text-destructive" : ""}>Aadhaar No</Label>
              <Input 
                value={editingItem?.aadhaar_no || ""} 
                onChange={e => updateField("aadhaar_no", e.target.value)} 
                className={errors.aadhaar_no ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.aadhaar_no && <p className="text-[10px] text-destructive font-medium">{errors.aadhaar_no}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.pan_no ? "text-destructive" : ""}>PAN No</Label>
              <Input 
                value={editingItem?.pan_no || ""} 
                onChange={e => updateField("pan_no", e.target.value)} 
                className={errors.pan_no ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.pan_no && <p className="text-[10px] text-destructive font-medium">{errors.pan_no}</p>}
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
