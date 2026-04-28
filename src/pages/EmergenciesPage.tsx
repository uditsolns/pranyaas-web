import { useState } from "react";
import { ExportButton } from "@/components/ExportButton";
import { EmergencyAlert, Patient } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertTriangle, CheckCircle, Clock, Eye, Loader2, Search, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { useApiList, useApiUpdate, useApiCreate } from "@/hooks/useApi";
import { AddressDisplay } from "@/components/AddressDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

export default function EmergenciesPage() {
  const { data: emergencies = [], isLoading } = useApiList<EmergencyAlert>("emergency-alerts", "/emergency-alerts");
  const { data: patients = [] } = useApiList<Patient>("patients", "/patients");
  const { role } = useAuth();
  const hasEdit = canEdit(role, "emergencies");
  const updateMutation = useApiUpdate<EmergencyAlert>("emergency-alerts", "/emergency-alerts", "Emergency");
  const createMutation = useApiCreate<EmergencyAlert>("emergency-alerts", "/emergency-alerts", "Emergency");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewing, setViewing] = useState<EmergencyAlert | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<EmergencyAlert> | null>(null);

  const handleStatusUpdate = (id: number, status: string) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const openCreate = () => {
    setEditingItem({ triggered_by: "Manual SOS", status: "active", patient_id: "" });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (e: EmergencyAlert) => {
    setEditingItem({ ...e });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingItem?.patient_id || !editingItem?.triggered_by) return;
    if (isEditing && editingItem.id) {
      updateMutation.mutate({ id: editingItem.id, data: editingItem }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(editingItem, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const getPatientName = (id: string) => patients.find(p => String(p.user_id) === String(id))?.full_name || `Patient #${id}`;

  const filtered = emergencies.filter(e => {
    const matchesSearch = String(e.id).includes(search) ||
      (e.triggered_by || "").toLowerCase().includes(search.toLowerCase()) ||
      getPatientName(e.patient_id).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || e.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const triggered = emergencies.filter(e => e.status === "active" || e.status === "Triggered");
  const acknowledged = emergencies.filter(e => e.status === "acknowledged" || e.status === "Acknowledged");
  const resolved = emergencies.filter(e => e.status === "resolved" || e.status === "Resolved");

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Emergencies" subtitle="Emergency response tracking" actionLabel={hasEdit ? "Add Emergency" : undefined} onAction={hasEdit ? openCreate : undefined}>
        <ExportButton filename="emergencies" title="Emergencies Report" columns={[
          { key: "id", label: "ID" }, { key: "triggered_by", label: "Triggered By" }, { key: "status", label: "Status" },
          { key: "created_at", label: "Time" },
        ]} data={filtered.map(e => ({ ...e, status: e.status === "active" ? "Need Action" : e.status }))} />
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-xs font-medium text-destructive uppercase">Need Action</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{triggered.length}</p>
        </div>
        <div className="bg-warning/5 rounded-xl p-4 border border-warning/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-xs font-medium text-warning uppercase">Acknowledged</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{acknowledged.length}</p>
        </div>
        <div className="bg-success/5 rounded-xl p-4 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-xs font-medium text-success uppercase">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{resolved.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by ID, trigger, or patient..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Need Action</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paged.length === 0 ? (
        <EmptyState title="No emergencies" description="No emergency alerts match your criteria." />
      ) : (
        <div className="space-y-4">
          {paged.map(e => (
            <div key={e.id} className={`bg-card rounded-xl p-5 card-shadow border ${e.status === "active" ? "border-destructive/30" : "border-border/50"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${e.status === "active" ? "bg-destructive/10" : e.status === "acknowledged" ? "bg-warning/10" : "bg-success/10"}`}>
                    <AlertTriangle className={`h-5 w-5 ${e.status === "active" ? "text-destructive" : e.status === "acknowledged" ? "text-warning" : "text-success"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Emergency #{e.id}</p>
                    <p className="text-xs text-muted-foreground">Triggered by: {e.triggered_by} · {getPatientName(e.patient_id)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={e.status === "active" ? "Need Action" : e.status} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(e); setDetailOpen(true); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {hasEdit && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEdit(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">Care Manager</p>
                  <p className="text-sm font-semibold text-foreground">{e.patient?.care_manager?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{e.patient?.care_manager?.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Relative</p>
                  <p className="text-sm font-semibold text-foreground">{e.patient?.relative?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{e.patient?.relative?.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">{new Date(e.created_at).toLocaleString('en-GB')}</p>
                </div>
                {e.latitude && (
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <AddressDisplay lat={e.latitude} lon={e.longitude} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TablePagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Emergency Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Emergency #{viewing.id}</p>
                  <StatusBadge status={viewing.status === "active" ? "Need Action" : viewing.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Triggered By</p><p className="text-sm font-medium">{viewing.triggered_by}</p></div>
                <div><p className="text-xs text-muted-foreground">Patient</p><p className="text-sm font-medium">{getPatientName(viewing.patient_id)}</p></div>
                <div><p className="text-xs text-muted-foreground">Care Manager</p><p className="text-sm font-medium">{viewing.patient?.care_manager?.name || "—"} ({viewing.patient?.care_manager?.phone || "—"})</p></div>
                <div><p className="text-xs text-muted-foreground">Relative</p><p className="text-sm font-medium">{viewing.patient?.relative?.name || "—"} ({viewing.patient?.relative?.phone || "—"})</p></div>
                <div><p className="text-xs text-muted-foreground">Created</p><p className="text-sm font-medium">{new Date(viewing.created_at).toLocaleString('en-GB')}</p></div>
                {viewing.latitude && <div><p className="text-xs text-muted-foreground">Location</p><AddressDisplay lat={viewing.latitude} lon={viewing.longitude} /></div>}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isEditing ? "Edit Emergency" : "Add Emergency"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Patient <span className="text-destructive">*</span></Label>
              <Select value={editingItem?.patient_id || ""} onValueChange={v => setEditingItem(prev => ({ ...prev!, patient_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Patient..." /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={String(p.user_id)}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Triggered By <span className="text-destructive">*</span></Label>
              <Input value={editingItem?.triggered_by || ""} onChange={e => setEditingItem(prev => ({ ...prev!, triggered_by: e.target.value }))} placeholder="e.g. Manual SOS, Smart Watch" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editingItem?.status || "active"} onValueChange={v => setEditingItem(prev => ({ ...prev!, status: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Need Action</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {isEditing ? "Update" : "Create"} Emergency
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
