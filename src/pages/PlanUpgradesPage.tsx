import { useState, useMemo } from "react";
import { PlanUpgrade, Senior, ApiUser, Family, CareManager } from "@/types";
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
import { formatDate } from "@/lib/utils";

const emptyUpgrade: Partial<PlanUpgrade> = {
  patient_id: "", current_plan_id: "", requested_plan_id: "", description: "", status: "Pending"
};

export default function PlanUpgradesPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "plan-upgrades");
  const { data: upgrades = [], isLoading, isError, error } = useApiList<PlanUpgrade>("plan-upgrades", "/plan-upgrade");
  
  const { data: plans = [] } = useApiList<any>("plans", "/plans");
  const { data: seniors = [] } = useApiList<Senior>("patients", "/patients");

  const createMutation = useApiCreate<PlanUpgrade>("plan-upgrades", "/plan-upgrade", "Plan Upgrade");
  const updateMutation = useApiUpdate<PlanUpgrade>("plan-upgrades", "/plan-upgrade", "Plan Upgrade");
  const deleteMutation = useApiDelete("plan-upgrades", "/plan-upgrade", "Plan Upgrade");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingUpgrade, setEditingUpgrade] = useState<Partial<PlanUpgrade> | null>(null);
  const [viewingUpgrade, setViewingUpgrade] = useState<PlanUpgrade | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const getSeniorName = (id: string | number) => {
    if (!id) return "—";
    const senior = seniors.find(s => String(s.user_id) === String(id) || String(s.id) === String(id));
    return senior?.full_name || `Senior #${id}`;
  };

  const getPlanName = (id: string | number) => {
    if (!id) return "—";
    const p = plans.find((p: any) => String(p.id) === String(id));
    return p?.plan_name || String(id);
  };

  const filtered = useMemo(() => {
    return upgrades.filter(u => {
      const sName = getSeniorName(u.patient_id);
      return sName.toLowerCase().includes(search.toLowerCase());
    });
  }, [upgrades, search, seniors]);

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingUpgrade({ ...emptyUpgrade }); setDialogOpen(true); };
  const openEdit = (u: PlanUpgrade) => { setEditingUpgrade({ ...u }); setDialogOpen(true); };

  const handleSave = () => {
    if (!editingUpgrade?.patient_id || !editingUpgrade?.current_plan_id || !editingUpgrade?.requested_plan_id) return;

    if (editingUpgrade.id) {
      updateMutation.mutate({ id: editingUpgrade.id, data: editingUpgrade }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(editingUpgrade, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof PlanUpgrade, value: string) => {
    setEditingUpgrade(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (isError) return (
    <div className="space-y-6">
      <PageHeader title="Plan Upgrades" subtitle="Manage plan upgrade requests" actionLabel={hasEdit ? "Request Upgrade" : undefined} onAction={hasEdit ? openCreate : undefined} />
      <div className="bg-destructive/5 rounded-xl p-6 border border-destructive/20 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Unable to load upgrades</p>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error)?.message || "The API is currently unavailable."}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Plan Upgrades" subtitle={`${total} total requests`} actionLabel={hasEdit ? "Request Upgrade" : undefined} onAction={hasEdit ? openCreate : undefined} />

      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by Senior Name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Senior</th>
                <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Plan</th>
                <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Requested Plan</th>
                <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center"><EmptyState icon={Search} title="No upgrade requests found" description="Adjust your search or create a new request." /></td></tr>
              ) : (
                paged.map(u => (
                  <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4 text-sm text-muted-foreground">{u.created_at ? formatDate(u.created_at) : "—"}</td>
                    <td className="p-4 text-sm font-medium text-foreground">{getSeniorName(u.patient_id)}</td>
                    <td className="p-4 text-sm text-muted-foreground">{getPlanName(u.current_plan_id)}</td>
                    <td className="p-4 text-sm font-medium text-primary">{getPlanName(u.requested_plan_id)}</td>
                    <td className="p-4"><StatusBadge status={u.status || "Pending"} /></td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingUpgrade(u); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                        {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
                        {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(u.id)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upgrade Request Details</DialogTitle></DialogHeader>
          {viewingUpgrade && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Senior</p><p className="text-sm font-medium">{getSeniorName(viewingUpgrade.patient_id)}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={viewingUpgrade.status || "Pending"} /></div>
                <div><p className="text-xs text-muted-foreground">Current Plan</p><p className="text-sm font-medium">{getPlanName(viewingUpgrade.current_plan_id)}</p></div>
                <div><p className="text-xs text-muted-foreground">Requested Plan</p><p className="text-sm font-medium text-primary">{getPlanName(viewingUpgrade.requested_plan_id)}</p></div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <div className="bg-secondary/20 p-3 rounded-md text-sm mt-1 whitespace-pre-wrap">{viewingUpgrade.description || "No description provided."}</div>
              </div>
              <div className="flex justify-end gap-2 mt-4 border-t pt-4">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {hasEdit && <Button onClick={() => { setDetailOpen(false); openEdit(viewingUpgrade); }}>Edit</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingUpgrade?.id ? "Update Request" : "Request Plan Upgrade"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            {!editingUpgrade?.id && (
              <>
                <div className="space-y-2">
                  <Label>Senior <span className="text-destructive">*</span></Label>
                  <Select value={String(editingUpgrade?.patient_id || "")} onValueChange={v => {
                    updateField("patient_id", v);
                    const selectedSenior = seniors.find(s => String(s.user_id || s.id) === v);
                    const currentPlanId = (selectedSenior as any)?.plan_id || (selectedSenior as any)?.current_plan_id || (selectedSenior as any)?.care_plans?.[0]?.plan_id;
                    if (currentPlanId) {
                      updateField("current_plan_id", String(currentPlanId));
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select senior..." /></SelectTrigger>
                    <SelectContent>
                      {seniors.map(s => <SelectItem key={s.id} value={String(s.user_id || s.id)}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current Plan <span className="text-destructive">*</span></Label>
                    <Select value={String(editingUpgrade?.current_plan_id || "")} onValueChange={v => updateField("current_plan_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Current plan..." /></SelectTrigger>
                      <SelectContent>
                        {plans.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.plan_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Requested Plan <span className="text-destructive">*</span></Label>
                    <Select value={String(editingUpgrade?.requested_plan_id || "")} onValueChange={v => updateField("requested_plan_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Target plan..." /></SelectTrigger>
                      <SelectContent>
                        {plans.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.plan_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Reason for upgrade..." value={editingUpgrade?.description || ""} onChange={e => updateField("description", e.target.value)} rows={3} />
                </div>
              </>
            )}
            {editingUpgrade?.id && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editingUpgrade?.status || "Pending"} onValueChange={v => updateField("status", v)}>
                  <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!editingUpgrade?.patient_id || !editingUpgrade?.current_plan_id || !editingUpgrade?.requested_plan_id}>
              {updateMutation.isPending || createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Upgrade Request?" />
    </div>
  );
}
