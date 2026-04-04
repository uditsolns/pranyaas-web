import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

const emptyCM: Partial<CareManager> & { phone?: string; email?: string; password?: string } = {
  name: "", phone: "", email: "", password: "",
  qualification: "", assigned_zone: "", availability_type: "Full Time",
  registration_number: "", languages_known: "", cpr_certified: "No",
  aadhaar_no: "", pan_no: "", years_of_experience: "",
  police_verification_status: "Pending", background_verification_status: "Pending",
  supervisor_id: "", region: "",
};

export default function CareManagersPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "care-managers");
  const { data: cms = [], isLoading } = useApiList<CareManager>("care-managers", "/care-managers");
  const { data: users = [] } = useApiList<ApiUser>("users", "/users");
  const adminUsers = users.filter(u => String(u.role_id) === "1");
  const createMutation = useApiCreate<CareManager>("care-managers", "/care-managers", "Care Manager");
  const updateMutation = useApiUpdate<CareManager>("care-managers", "/care-managers", "Care Manager");
  const deleteMutation = useApiDelete("care-managers", "/care-managers", "Care Manager");

  const [search, setSearch] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingCM, setEditingCM] = useState<Partial<CareManager> | null>(null);
  const [viewingCM, setViewingCM] = useState<CareManager | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const filtered = cms.filter(cm => {
    const matchesSearch = (cm.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (cm.assigned_zone || "").toLowerCase().includes(search.toLowerCase());
    const matchesAvailability = filterAvailability === "all" || cm.availability_type === filterAvailability;
    return matchesSearch && matchesAvailability;
  });

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered, 9);

  const openCreate = () => { setEditingCM({ ...emptyCM }); setDialogOpen(true); };
  const openEdit = (cm: CareManager) => { setEditingCM({ ...cm }); setDialogOpen(true); };

  const handleSave = () => {
    if (!editingCM?.name?.trim()) return;
    if (editingCM.id) {
      updateMutation.mutate({ id: editingCM.id, data: editingCM }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(editingCM, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: string, value: string) => {
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
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editingCM?.name || ""} onChange={e => updateField("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input value={(editingCM as any)?.phone || ""} onChange={e => updateField("phone", e.target.value)} placeholder="e.g. 9876543212" />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={(editingCM as any)?.email || ""} onChange={e => updateField("email", e.target.value)} placeholder="e.g. raj@gmail.com" />
            </div>
            {!editingCM?.id && (
              <div className="space-y-2">
                <Label>Password <span className="text-destructive">*</span></Label>
                <Input type="password" value={(editingCM as any)?.password || ""} onChange={e => updateField("password", e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Aadhaar No</Label>
              <Input value={editingCM?.aadhaar_no || ""} onChange={e => updateField("aadhaar_no", e.target.value)} placeholder="e.g. 333344445555" />
            </div>
            <div className="space-y-2">
              <Label>PAN No</Label>
              <Input value={editingCM?.pan_no || ""} onChange={e => updateField("pan_no", e.target.value)} placeholder="e.g. LMNO1234F" />
            </div>
            <div className="space-y-2">
              <Label>Qualification</Label>
              <Input value={editingCM?.qualification || ""} onChange={e => updateField("qualification", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input value={editingCM?.registration_number || ""} onChange={e => updateField("registration_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input value={editingCM?.years_of_experience || ""} onChange={e => updateField("years_of_experience", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Languages Known</Label>
              <Input value={editingCM?.languages_known || ""} onChange={e => updateField("languages_known", e.target.value)} placeholder="e.g. Hindi,English" />
            </div>
            <div className="space-y-2">
              <Label>CPR Certified</Label>
              <Select value={editingCM?.cpr_certified || "No"} onValueChange={v => updateField("cpr_certified", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Zone</Label>
              <Input value={editingCM?.assigned_zone || ""} onChange={e => updateField("assigned_zone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Availability</Label>
              <Select value={editingCM?.availability_type || "Full Time"} onValueChange={v => updateField("availability_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Time">Full Time</SelectItem>
                  <SelectItem value="Part Time">Part Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Police Verification</Label>
              <Select value={editingCM?.police_verification_status || "Pending"} onValueChange={v => updateField("police_verification_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Background Verification</Label>
              <Select value={editingCM?.background_verification_status || "Pending"} onValueChange={v => updateField("background_verification_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input value={editingCM?.region || ""} onChange={e => updateField("region", e.target.value)} />
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
    </div>
  );
}
