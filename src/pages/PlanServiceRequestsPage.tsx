import { useState, useMemo } from "react";
import { PlanServiceRequest, ApiUser, Senior, Family, CareManager } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

const emptyRequest: Partial<PlanServiceRequest> = {
  plan_id: "", user_id: "", subject: "", description: "", priority: "medium", status: "pending"
};

export default function PlanServiceRequestsPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "plan-service-requests");
  const { data: requests = [], isLoading, isError, error } = useApiList<PlanServiceRequest>("plan-service-requests", "/plan-service-requests");
  const { data: users = [] } = useApiList<ApiUser>("users", "/users");
  const { data: plans = [] } = useApiList<any>("plans", "/plans-with-features");
  const { data: seniors = [] } = useApiList<Senior>("patients", "/patients");
  const { data: families = [] } = useApiList<Family>("relatives", "/relatives");
  const { data: careManagers = [] } = useApiList<CareManager>("care-managers", "/care-managers");

  const createMutation = useApiCreate<PlanServiceRequest>("plan-service-requests", "/plan-service-requests", "Plan Service Request");
  const updateMutation = useApiUpdate<PlanServiceRequest>("plan-service-requests", "/plan-service-requests", "Plan Service Request");
  const deleteMutation = useApiDelete("plan-service-requests", "/plan-service-requests", "Plan Service Request");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Partial<PlanServiceRequest> | null>(null);
  const [viewingRequest, setViewingRequest] = useState<PlanServiceRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [filterCM, setFilterCM] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const getUserInfo = (userId: string | number) => {
    if (!userId) return { name: "—", role: "—", cmName: "—", cmId: "" };
    
    // Check if it's a relative
    const family = families.find(f => String(f.user_id) === String(userId));
    if (family) {
      const patient = family.patient || seniors.find(s => String(s.user_id) === String(family.patient_id) || String(s.id) === String(family.patient_id));
      const cm = patient?.care_manager || careManagers.find(c => String(c.id) === String(patient?.care_manager_id));
      return { name: family.relative_name, role: "Relative", cmName: cm?.name || "—", cmId: cm?.id || "" };
    }
    
    // Check if it's a senior
    const senior = seniors.find(s => String(s.user_id) === String(userId) || String(s.id) === String(userId));
    if (senior) {
      const cm = senior.care_manager || careManagers.find(c => String(c.id) === String(senior.care_manager_id));
      return { name: senior.full_name, role: "Senior", cmName: cm?.name || "—", cmId: cm?.id || "" };
    }
    
    // Fallback to basic user
    const u = users.find(u => String(u.id) === String(userId));
    return { name: u?.name || `User #${userId}`, role: "User", cmName: "—", cmId: "" };
  };

  const getPlanName = (id: string | number) => {
    if (!id) return "—";
    const p = plans.find((p: any) => String(p.id) === String(id));
    return p?.plan_name || String(id);
  };

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const info = r.user_id ? getUserInfo(r.user_id) : null;
      const uName = info ? info.name : "";
      
      const matchesSearch = (r.subject || "").toLowerCase().includes(search.toLowerCase()) ||
                            uName.toLowerCase().includes(search.toLowerCase());
                            
      const matchesCM = filterCM === "all" || (info && String(info.cmId) === filterCM);
      const matchesPriority = filterPriority === "all" || r.priority === filterPriority;
      
      return matchesSearch && matchesCM && matchesPriority;
    });
  }, [requests, search, users, seniors, families, careManagers, filterCM, filterPriority]);

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingRequest({ ...emptyRequest }); setDialogOpen(true); };
  const openEdit = (r: PlanServiceRequest) => { setEditingRequest({ ...r }); setDialogOpen(true); };

  const handleSave = () => {
    if (!editingRequest?.subject?.trim()) return;

    if (editingRequest.id) {
      updateMutation.mutate({ id: editingRequest.id, data: editingRequest }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(editingRequest, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof PlanServiceRequest, value: string) => {
    setEditingRequest(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (isError) return (
    <div className="space-y-6">
      <PageHeader title="Plan Service Requests" subtitle="Manage plan service requests" actionLabel={hasEdit ? "Create Request" : undefined} onAction={hasEdit ? openCreate : undefined} />
      <div className="bg-destructive/5 rounded-xl p-6 border border-destructive/20 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Unable to load requests</p>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error)?.message || "The API is currently unavailable."}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Plan Service Requests" subtitle={`${total} total requests`} actionLabel={hasEdit ? "Create Request" : undefined} onAction={hasEdit ? openCreate : undefined} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search requests..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCM} onValueChange={v => { setFilterCM(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Care Managers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Care Managers</SelectItem>
            {careManagers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Subject</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Care Manager</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Plan</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Priority</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6}><EmptyState title="No requests found" /></td></tr>
              ) : paged.map(r => (
                <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-4 text-sm font-medium text-foreground">{r.subject}</td>
                  <td className="p-4 text-sm text-foreground">
                    {r.user_id ? (() => { const i = getUserInfo(r.user_id); return `${i.name} (${i.role})`; })() : "—"}
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    {r.user_id ? getUserInfo(r.user_id).cmName : "—"}
                  </td>
                  <td className="p-4 text-sm text-foreground">{r.plan_id ? getPlanName(r.plan_id) : "—"}</td>
                  <td className="p-4"><StatusBadge status={r.priority || "medium"} /></td>
                  <td className="p-4"><StatusBadge status={r.status || "pending"} /></td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingRequest(r); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Request Details</DialogTitle></DialogHeader>
          {viewingRequest && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Subject</p><p className="text-sm font-medium">{viewingRequest.subject}</p></div>
                <div><p className="text-xs text-muted-foreground">User</p><p className="text-sm font-medium">{viewingRequest.user_id ? (() => { const i = getUserInfo(viewingRequest.user_id); return `${i.name} (${i.role})`; })() : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Care Manager</p><p className="text-sm font-medium">{viewingRequest.user_id ? getUserInfo(viewingRequest.user_id).cmName : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Plan</p><p className="text-sm font-medium">{viewingRequest.plan_id ? getPlanName(viewingRequest.plan_id) : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Priority</p><StatusBadge status={viewingRequest.priority} /></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={viewingRequest.status || "pending"} /></div>
              </div>
              {viewingRequest.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm mt-1">{viewingRequest.description}</p></div>}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {hasEdit && <Button onClick={() => { setDetailOpen(false); openEdit(viewingRequest); }}>Edit Request</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingRequest?.id ? "Edit Request" : "Create Request"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Input value={editingRequest?.subject || ""} onChange={e => updateField("subject", e.target.value)} placeholder="Subject" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={editingRequest?.description || ""} onChange={e => updateField("description", e.target.value)} rows={3} placeholder="Description..." />
            </div>
            <div className="space-y-2">
              <Label>User</Label>
              <Select disabled={!!editingRequest?.id} value={String(editingRequest?.user_id || "")} onValueChange={v => updateField("user_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select User..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select disabled={!!editingRequest?.id} value={String(editingRequest?.plan_id || "")} onValueChange={v => updateField("plan_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select Plan..." /></SelectTrigger>
                <SelectContent>
                  {plans.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.plan_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={editingRequest?.priority || "medium"} onValueChange={v => updateField("priority", v)}>
                <SelectTrigger><SelectValue placeholder="Select Priority..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editingRequest?.status || "pending"} onValueChange={v => updateField("status", v)}>
                <SelectTrigger><SelectValue placeholder="Select Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(() => {
              const originalStatus = editingRequest?.id ? requests.find(r => r.id === editingRequest.id)?.status : null;
              const statusChanged = editingRequest?.id && originalStatus && editingRequest?.status !== originalStatus;
              
              if (statusChanged) {
                return (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Remark for Status Change <span className="text-destructive">*</span></Label>
                    <Input value={editingRequest?.admin_remark || ""} onChange={e => updateField("admin_remark", e.target.value)} placeholder="Reason for changing status..." />
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingRequest?.id ? "Update" : "Create"} Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Request?" />
    </div>
  );
}
