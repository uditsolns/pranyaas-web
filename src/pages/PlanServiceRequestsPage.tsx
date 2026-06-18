import { useState, useMemo } from "react";
import { PlanServiceRequest, ApiUser } from "@/types";
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
  plan_id: "", user_id: "", subject: "", description: "", priority: "medium"
};

export default function PlanServiceRequestsPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "plan-service-requests");
  const { data: requests = [], isLoading, isError, error } = useApiList<PlanServiceRequest>("plan-service-requests", "/plan-service-requests");
  const { data: users = [] } = useApiList<ApiUser>("users", "/users");

  const createMutation = useApiCreate<PlanServiceRequest>("plan-service-requests", "/plan-service-requests", "Plan Service Request");
  const updateMutation = useApiUpdate<PlanServiceRequest>("plan-service-requests", "/plan-service-requests", "Plan Service Request");
  const deleteMutation = useApiDelete("plan-service-requests", "/plan-service-requests", "Plan Service Request");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Partial<PlanServiceRequest> | null>(null);
  const [viewingRequest, setViewingRequest] = useState<PlanServiceRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const getUserName = (id: string | number) => {
    if (!id) return "N/A";
    const u = users.find(u => String(u.id) === String(id));
    return u?.name || `User #${id}`;
  };

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const uName = r.user_id ? getUserName(r.user_id) : "";
      return (r.subject || "").toLowerCase().includes(search.toLowerCase()) ||
             uName.toLowerCase().includes(search.toLowerCase());
    });
  }, [requests, search, users]);

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
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Subject</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Plan ID</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Priority</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={5}><EmptyState title="No requests found" /></td></tr>
              ) : paged.map(r => (
                <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-4 text-sm font-medium text-foreground">{r.subject}</td>
                  <td className="p-4 text-sm text-foreground">{r.user_id ? getUserName(r.user_id) : "—"}</td>
                  <td className="p-4 text-sm text-foreground">{r.plan_id || "—"}</td>
                  <td className="p-4"><StatusBadge status={r.priority || "medium"} /></td>
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
                <div><p className="text-xs text-muted-foreground">User</p><p className="text-sm font-medium">{viewingRequest.user_id ? getUserName(viewingRequest.user_id) : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Plan ID</p><p className="text-sm font-medium">{viewingRequest.plan_id || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Priority</p><StatusBadge status={viewingRequest.priority} /></div>
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
              <Select value={String(editingRequest?.user_id || "")} onValueChange={v => updateField("user_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select User..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan ID</Label>
              <Input value={editingRequest?.plan_id || ""} onChange={e => updateField("plan_id", e.target.value)} placeholder="e.g. 1" />
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
