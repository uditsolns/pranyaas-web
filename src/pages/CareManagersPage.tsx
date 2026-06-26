import { useState } from "react";
import { toast } from "sonner";
import { ExportButton } from "@/components/ExportButton";
import { CareManager, ApiUser } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

type CMFormState = Partial<CareManager> & { phone?: string; email?: string; password?: string };

const emptyCM: CMFormState = {
  name: "", phone: "", email: "", password: "",
  qualification: "", assigned_zone: "", availability_type: "",
  registration_number: "", languages_known: "", cpr_certified: "",
  aadhaar_no: "", pan_no: "", years_of_experience: "",
  police_verification_status: "", background_verification_status: "",
  supervisor_id: "", region: "",
};

export default function CareManagersPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const hasEdit = canEdit(role, "care-managers");
  const { data: cms = [], isLoading } = useApiList<CareManager>("care-managers", "/care-managers");
  const { data: users = [] } = useApiList<ApiUser>("users", "/users");
  const adminUsers = users.filter(u => String(u.role_id) === "1");
  const createMutation = useApiCreate<any>("care-managers", "/care-managers", "Care Manager");
  const updateMutation = useApiUpdate<any>("care-managers", "/care-managers", "Care Manager");
  const deleteMutation = useApiDelete("care-managers", "/care-managers", "Care Manager");

  const [search, setSearch] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingCM, setEditingCM] = useState<CMFormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewingCM, setViewingCM] = useState<CareManager | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [patientsModalOpen, setPatientsModalOpen] = useState(false);
  const [viewingPatientsCM, setViewingPatientsCM] = useState<CareManager | null>(null);

  const filtered = cms.filter(cm => {
    const matchesSearch = (cm.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (cm.assigned_zone || "").toLowerCase().includes(search.toLowerCase());
    const matchesAvailability = filterAvailability === "all" || cm.availability_type === filterAvailability;
    return matchesSearch && matchesAvailability;
  });

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered, 9);

  const openCreate = () => { setEditingCM({ ...emptyCM }); setErrors({}); setDialogOpen(true); };
  const openEdit = (cm: CareManager) => {
    setEditingCM({
      ...cm,
      phone: cm.user?.phone || "",
      email: cm.user?.email || ""
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!editingCM) return false;

    if (!editingCM.name?.trim()) newErrors.name = "Name is required";
    
    if (!editingCM.phone?.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(editingCM.phone)) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    if (!editingCM.email?.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingCM.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!editingCM.id && (!editingCM.password || editingCM.password.length < 6)) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (editingCM.aadhaar_no && !/^\d{12}$/.test(editingCM.aadhaar_no)) {
      newErrors.aadhaar_no = "Aadhaar Number must be 12 digits";
    }

    if (editingCM.pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editingCM.pan_no.toUpperCase())) {
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
    
    // Deconstruct and clean up the object for the API payload
    const { id, user, created_at, updated_at, password, ...cmData } = editingCM as any;
    
    // Ensure numeric fields are cast correctly
    const sanitizedCM = {
      ...cmData,
      years_of_experience: editingCM.years_of_experience ? parseInt(String(editingCM.years_of_experience)) : 0
    };

    if (id) {
      updateMutation.mutate({ id, data: sanitizedCM }, { 
        onSuccess: () => { setDialogOpen(false); toast.success("Care manager updated successfully"); } 
      });
    } else {
      createMutation.mutate({ ...sanitizedCM, password: editingCM.password }, { 
        onSuccess: () => { setDialogOpen(false); toast.success("Care manager added successfully"); } 
      });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof CMFormState, value: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setEditingCM(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Care Managers" subtitle={`${total} care managers`} actionLabel={hasEdit ? "Add Care Manager" : undefined} onAction={hasEdit ? openCreate : undefined}>
        <ExportButton filename="care-managers" title="Care Managers Report" columns={[
          { key: "name", label: "Name" }, { key: "qualification", label: "Qualification" }, { key: "assigned_zone", label: "Zone" },
          { key: "availability_type", label: "Availability" }, { key: "cpr_certified", label: "CPR Certified" },
        ]} data={filtered} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search care managers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterAvailability} onValueChange={v => { setFilterAvailability(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Availability" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Availability</SelectItem>
            <SelectItem value="Full Time">Full Time</SelectItem>
            <SelectItem value="Part Time">Part Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paged.length === 0 ? (
        <EmptyState title="No care managers found" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map(cm => (
            <div key={cm.id} className="bg-card rounded-xl p-5 card-shadow border border-border/50 hover:card-shadow-lg transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {(cm.name || "").split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cm.name}</p>
                    <p className="text-xs text-muted-foreground">{cm.qualification}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewingCM(cm); setDetailOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                  {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cm)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
                  {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(cm.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Zone</p><p className="text-sm font-medium text-foreground">{cm.assigned_zone}</p></div>
                <div><p className="text-xs text-muted-foreground">Experience</p><p className="text-sm font-medium text-foreground">{cm.years_of_experience} yrs</p></div>
                <div><p className="text-xs text-muted-foreground">Availability</p><StatusBadge status={cm.availability_type || "Full Time"} /></div>
                <div><p className="text-xs text-muted-foreground">Region</p><p className="text-sm font-medium text-foreground">{cm.region}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground">Patients</p>
                  <p 
                    className="text-sm font-medium text-primary cursor-pointer hover:underline" 
                    onClick={() => { setViewingPatientsCM(cm); setPatientsModalOpen(true); }}
                  >
                    {Array.isArray(cm.patient_id) ? cm.patient_id.length : (cm.patient_id ? 1 : 0)}
                  </p>
                </div>
              </div>
              {cm.cpr_certified === "Yes" && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle className="h-3.5 w-3.5" /> CPR Certified
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TablePagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Care Manager Details</DialogTitle></DialogHeader>
          {viewingCM && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {(viewingCM.name || "").split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-lg font-semibold">{viewingCM.name}</p>
                  <p className="text-sm text-muted-foreground">{viewingCM.qualification} · {viewingCM.years_of_experience || "—"} years exp</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Registration #</p><p className="text-sm font-medium">{viewingCM.registration_number || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Zone</p><p className="text-sm font-medium">{viewingCM.assigned_zone}</p></div>
                <div><p className="text-xs text-muted-foreground">Languages</p><p className="text-sm font-medium">{viewingCM.languages_known || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Region</p><p className="text-sm font-medium">{viewingCM.region}</p></div>
                <div><p className="text-xs text-muted-foreground">Availability</p><StatusBadge status={viewingCM.availability_type} /></div>
                <div><p className="text-xs text-muted-foreground">CPR Certified</p><p className="text-sm font-medium">{viewingCM.cpr_certified}</p></div>
                <div><p className="text-xs text-muted-foreground">Police Verification</p><p className="text-sm font-medium">{viewingCM.police_verification_status || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Background Check</p><p className="text-sm font-medium">{viewingCM.background_verification_status || "—"}</p></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                <Button onClick={() => { setDetailOpen(false); openEdit(viewingCM); }}>Edit</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCM?.id ? "Edit Care Manager" : "Add Care Manager"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label className={errors.name ? "text-destructive" : ""}>Name <span className="text-destructive">*</span></Label>
              <Input 
                value={editingCM?.name || ""} 
                onChange={e => updateField("name", e.target.value)} 
                placeholder="Full Name" 
                className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.name && <p className="text-[10px] text-destructive font-medium">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.phone ? "text-destructive" : ""}>Phone <span className="text-destructive">*</span></Label>
              <Input 
                value={editingCM?.phone || ""} 
                onChange={e => updateField("phone", e.target.value)} 
                placeholder="e.g. 9876543212" 
                className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.phone && <p className="text-[10px] text-destructive font-medium">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.email ? "text-destructive" : ""}>Email <span className="text-destructive">*</span></Label>
              <Input 
                type="email" 
                value={editingCM?.email || ""} 
                onChange={e => updateField("email", e.target.value)} 
                placeholder="e.g. raj@gmail.com" 
                className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.email && <p className="text-[10px] text-destructive font-medium">{errors.email}</p>}
            </div>
            {!editingCM?.id && (
              <div className="space-y-2">
                <Label className={errors.password ? "text-destructive" : ""}>Password <span className="text-destructive">*</span></Label>
                <Input 
                  type="password" 
                  value={editingCM?.password || ""} 
                  onChange={e => updateField("password", e.target.value)} 
                  placeholder="Minimum 6 characters" 
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.password && <p className="text-[10px] text-destructive font-medium">{errors.password}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label className={errors.aadhaar_no ? "text-destructive" : ""}>Aadhaar No</Label>
              <Input 
                value={editingCM?.aadhaar_no || ""} 
                onChange={e => updateField("aadhaar_no", e.target.value)} 
                placeholder="e.g. 333344445555" 
                className={errors.aadhaar_no ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.aadhaar_no && <p className="text-[10px] text-destructive font-medium">{errors.aadhaar_no}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.pan_no ? "text-destructive" : ""}>PAN No</Label>
              <Input 
                value={editingCM?.pan_no || ""} 
                onChange={e => updateField("pan_no", e.target.value)} 
                placeholder="e.g. LMNO1234F" 
                className={errors.pan_no ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.pan_no && <p className="text-[10px] text-destructive font-medium">{errors.pan_no}</p>}
            </div>
            <div className="space-y-2">
              <Label>Qualification</Label>
              <Input value={editingCM?.qualification || ""} onChange={e => updateField("qualification", e.target.value)} placeholder="e.g. B.Sc Nursing" />
            </div>
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input value={editingCM?.registration_number || ""} onChange={e => updateField("registration_number", e.target.value)} placeholder="e.g. REG123456" />
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input 
                type="number" 
                min="0"
                value={editingCM?.years_of_experience || ""} 
                onChange={e => updateField("years_of_experience", e.target.value)} 
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-2">
              <Label>Languages Known</Label>
              <Input value={editingCM?.languages_known || ""} onChange={e => updateField("languages_known", e.target.value)} placeholder="e.g. Hindi,English" />
            </div>
            <div className="space-y-2">
              <Label>CPR Certified</Label>
              <Select value={editingCM?.cpr_certified || ""} onValueChange={v => updateField("cpr_certified", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Zone</Label>
              <Input value={editingCM?.assigned_zone || ""} onChange={e => updateField("assigned_zone", e.target.value)} placeholder="e.g. South Zone" />
            </div>
            <div className="space-y-2">
              <Label>Availability</Label>
              <Select value={editingCM?.availability_type || ""} onValueChange={v => updateField("availability_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select Availability..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Time">Full Time</SelectItem>
                  <SelectItem value="Part Time">Part Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Police Verification</Label>
              <Select value={editingCM?.police_verification_status || ""} onValueChange={v => updateField("police_verification_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Background Verification</Label>
              <Select value={editingCM?.background_verification_status || ""} onValueChange={v => updateField("background_verification_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supervisor (Admin)</Label>
              <Select value={editingCM?.supervisor_id || ""} onValueChange={v => updateField("supervisor_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select supervisor..." /></SelectTrigger>
                <SelectContent>
                  {adminUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Input value={editingCM?.region || ""} onChange={e => updateField("region", e.target.value)} placeholder="e.g. Indian" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingCM?.id ? "Update" : "Add"} Care Manager
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Care Manager?" />

      {/* Patients Dialog */}
      <Dialog open={patientsModalOpen} onOpenChange={setPatientsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Patients Assigned to {viewingPatientsCM?.name}</DialogTitle></DialogHeader>
          <div className="mt-4">
            {viewingPatientsCM && Array.isArray(viewingPatientsCM.patient_id) && viewingPatientsCM.patient_id.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Patient ID</th>
                      <th className="px-4 py-3 font-medium">Patient Name</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewingPatientsCM.patient_id.map((p: any) => (
                      <tr key={p.id || p.patient_id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">{p.patient_id}</td>
                        <td className="px-4 py-3 font-medium">{p.patient_name}</td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/seniors/${p.patient_id}`)}>
                            View Profile
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : viewingPatientsCM && viewingPatientsCM.patient_id ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Patient ID</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-muted/50">
                      <td className="px-4 py-3">{viewingPatientsCM.patient_id}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/seniors/${viewingPatientsCM.patient_id}`)}>
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No patients assigned.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
