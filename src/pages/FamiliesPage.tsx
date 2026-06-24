import { useState } from "react";
import { toast } from "sonner";
import { ExportButton } from "@/components/ExportButton";
import { Family, Senior } from "@/types";
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

type FamilyForm = Partial<Family> & { password?: string; patients?: any[] };

const emptyFamily: FamilyForm = {
  relative_name: "", patients: [], password: "", relationship: "", location_type: "",
  country: "India", phone_number: "", whatsapp_number: "", email: "",
  aadhaar_no: "", pan_no: "", preferred_update_mode: "",
  secondary_escalation_contact: "",
};

export default function FamiliesPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "relatives");
  const { data: relatives = [], isLoading } = useApiList<Family>("relatives", "/relatives");
  const { data: seniors = [] } = useApiList<Senior>("patients", "/patients");
  const createMutation = useApiCreate<Family>("relatives", "/relatives", "Family");
  const updateMutation = useApiUpdatePost<Family>("relatives", "/relatives", "Family");
  const deleteMutation = useApiDelete("relatives", "/relatives", "Family");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FamilyForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const filtered = relatives.filter(r =>
    (r.relative_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.patient?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingItem({ ...emptyFamily }); setErrors({}); setDialogOpen(true); };
  const openEdit = (r: Family) => { 
    const sourcePatients = r.patients || (r as any).seniors || [];
    const mappedSeniors = sourcePatients.map((p: any) => ({
      user_id: String(p.user_id),
      patient_id: String(p.patient_id),
      patient_name: p.patient_name || p.senior_name || p.patient?.full_name || p.senior?.full_name || `Senior #${p.patient_id}`
    }));
    
    if (r.patient_id && !mappedSeniors.some(mp => mp.patient_id === String(r.patient_id))) {
      const p = seniors.find(pat => String(pat.id) === String(r.patient_id) || String(pat.user_id) === String(r.patient_id));
      if (p) {
        mappedSeniors.push({ user_id: String(p.user_id), patient_id: String(p.id), patient_name: p.full_name });
      }
    }

    setEditingItem({ ...r, patients: mappedSeniors }); 
    setErrors({}); 
    setDialogOpen(true); 
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!editingItem) return false;

    if (!editingItem.relative_name?.trim()) newErrors.relative_name = "Family Name is required";
    if (!editingItem.patients || editingItem.patients.length === 0) newErrors.patients = "At least one senior must be selected";
    
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
    
    const payload: any = { ...editingItem };

    if (payload.id) {
      updateMutation.mutate({ id: payload.id, data: payload }, { 
        onSuccess: () => { setDialogOpen(false); toast.success("Family updated successfully"); } 
      });
    } else {
      createMutation.mutate(payload as Partial<Family>, { 
        onSuccess: () => { setDialogOpen(false); toast.success("Family added successfully"); } 
      });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: string, value: any) => {
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
      <PageHeader title="Families" subtitle={`${total} registered relatives`} actionLabel={hasEdit ? "Add Family" : undefined} onAction={hasEdit ? openCreate : undefined}>
        <ExportButton filename="relatives" title="Families Report" columns={[
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
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Senior</th>
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
                  <td className="p-4 text-sm text-foreground">
                    {r.patients && r.patients.length > 0 
                      ? r.patients.map((p: any) => p.patient_name || p.senior_name || `Senior #${p.patient_id}`).join(", ") 
                      : (r.patient?.full_name || (r as any).senior?.full_name || `Senior #${r.patient_id}`)
                    }
                  </td>
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
          <DialogHeader><DialogTitle>{editingItem?.id ? "Edit Family" : "Add Family"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label className={errors.relative_name ? "text-destructive" : ""}>Family Name <span className="text-destructive">*</span></Label>
              <Input 
                value={editingItem?.relative_name || ""} 
                onChange={e => updateField("relative_name", e.target.value)} 
                className={errors.relative_name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.relative_name && <p className="text-[10px] text-destructive font-medium">{errors.relative_name}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.patients ? "text-destructive" : ""}>Seniors <span className="text-destructive">*</span></Label>
              
              {editingItem?.patients && editingItem.patients.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {editingItem.patients.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-secondary/30 px-3 py-2 rounded-md">
                      <span className="text-sm font-medium">{p.patient_name || p.senior_name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                        const newPatients = [...(editingItem.patients || [])];
                        newPatients.splice(idx, 1);
                        updateField("patients", newPatients);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Select 
                value="" 
                onValueChange={v => {
                  const p = seniors.find(senior => String(senior.user_id) === String(v));
                  if (p) {
                    const currentPatients = editingItem?.patients || [];
                    if (!currentPatients.some(cp => String(cp.user_id) === String(p.user_id))) {
                      const newPatient = {
                        user_id: String(p.user_id),
                        patient_id: String(p.id),
                        patient_name: p.full_name
                      };
                      updateField("patients", [...currentPatients, newPatient]);
                    }
                  }
                }}
              >
                <SelectTrigger className={errors.patients ? "border-destructive focus:ring-destructive" : ""}>
                  <SelectValue placeholder="Add Senior..." />
                </SelectTrigger>
                <SelectContent>
                  {seniors.filter(p => !editingItem?.patients?.some(cp => String(cp.user_id) === String(p.user_id))).map(p => (
                    <SelectItem key={p.user_id} value={String(p.user_id)}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.patients && <p className="text-[10px] text-destructive font-medium">{errors.patients}</p>}
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
              {editingItem?.id ? "Update" : "Add"} Family
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Family?" />
    </div>
  );
}
