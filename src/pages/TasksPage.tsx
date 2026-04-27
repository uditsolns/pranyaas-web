import { useState } from "react";
import { ExportButton } from "@/components/ExportButton";
import { Task, Patient, CareManager } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
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

const emptyTask: Partial<Task> = {
  title: "", description: "", patient_id: "", care_manager_id: "",
  due_date: "", priority: "", status: "", remark: "",
};

export default function TasksPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "tasks");
  const { data: tasks = [], isLoading, isError, error } = useApiList<Task>("tasks", "/tasks");
  const { data: patients = [] } = useApiList<Patient>("patients", "/patients");
  const { data: cms = [] } = useApiList<CareManager>("care-managers", "/care-managers");
  const createMutation = useApiCreate<Task>("tasks", "/tasks", "Task");
  const updateMutation = useApiUpdate<Task>("tasks", "/tasks", "Task");
  const deleteMutation = useApiDelete("tasks", "/tasks", "Task");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const filtered = tasks.filter(t => {
    const matchesSearch = (t.title || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingTask({ ...emptyTask }); setDialogOpen(true); };
  const openEdit = (t: Task) => { setEditingTask({ ...t }); setDialogOpen(true); };

  const getPatientName = (id: string) => patients.find(p => String(p.user_id) === String(id))?.full_name || `Patient #${id}`;
  const getCMName = (id: string) => cms.find(c => String(c.user_id) === String(id))?.name || `CM #${id}`;

  const handleSave = () => {
    if (!editingTask?.title?.trim()) return;
    if (editingTask.id) {
      updateMutation.mutate({ id: editingTask.id, data: editingTask }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(editingTask, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof Task, value: string) => {
    setEditingTask(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (isError) return (
    <div className="space-y-6">
      <PageHeader title="Tasks" subtitle="Task management" actionLabel={hasEdit ? "Create Task" : undefined} onAction={hasEdit ? openCreate : undefined} />
      <div className="bg-destructive/5 rounded-xl p-6 border border-destructive/20 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Unable to load tasks</p>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error)?.message || "The tasks API is currently unavailable."}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" subtitle={`${total} total tasks`} actionLabel={hasEdit ? "Create Task" : undefined} onAction={hasEdit ? openCreate : undefined} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Task</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Patient</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Care Manager</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Due Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Priority</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No tasks found" /></td></tr>
              ) : paged.map(t => (
                <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-4 text-sm font-medium text-foreground">{t.title}</td>
                  <td className="p-4 text-sm text-foreground">{t.patient_id ? getPatientName(t.patient_id) : "—"}</td>
                  <td className="p-4 text-sm text-foreground">{t.care_manager_id ? getCMName(t.care_manager_id) : "—"}</td>
                  <td className="p-4 text-sm text-foreground">{formatDate(t.due_date)}</td>
                  <td className="p-4"><StatusBadge status={t.priority || "1"} /></td>
                  <td className="p-4"><StatusBadge status={t.status || "pending"} /></td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingTask(t); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t.id)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>}
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
          <DialogHeader><DialogTitle>Task Details</DialogTitle></DialogHeader>
          {viewingTask && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Title</p><p className="text-sm font-medium">{viewingTask.title}</p></div>
                <div><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm font-medium">{formatDate(viewingTask.due_date)}</p></div>
                <div><p className="text-xs text-muted-foreground">Patient</p><p className="text-sm font-medium">{viewingTask.patient_id ? getPatientName(viewingTask.patient_id) : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Care Manager</p><p className="text-sm font-medium">{viewingTask.care_manager_id ? getCMName(viewingTask.care_manager_id) : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Priority</p><StatusBadge status={viewingTask.priority} /></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={viewingTask.status} /></div>
              </div>
              {viewingTask.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm mt-1">{viewingTask.description}</p></div>}
              {viewingTask.remark && <div><p className="text-xs text-muted-foreground">Remark</p><p className="text-sm mt-1">{viewingTask.remark}</p></div>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {hasEdit && <Button onClick={() => { setDetailOpen(false); openEdit(viewingTask); }}>Edit Task</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTask?.id ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input value={editingTask?.title || ""} onChange={e => updateField("title", e.target.value)} placeholder="Task Title" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={editingTask?.description || ""} onChange={e => updateField("description", e.target.value)} rows={3} placeholder="Describe the task details..." />
            </div>
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={editingTask?.patient_id || ""} onValueChange={v => updateField("patient_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={String(p.user_id)}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Care Manager</Label>
              <Select value={editingTask?.care_manager_id || ""} onValueChange={v => updateField("care_manager_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{cms.map(cm => <SelectItem key={cm.id} value={String(cm.user_id)}>{cm.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={editingTask?.due_date || ""} onChange={e => updateField("due_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={editingTask?.priority || "3"} onValueChange={v => updateField("priority", v)}>
                <SelectTrigger><SelectValue placeholder="Select Priority..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">High</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editingTask?.status || "pending"} onValueChange={v => updateField("status", v)}>
                <SelectTrigger><SelectValue placeholder="Select Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Remark</Label>
              <Textarea value={editingTask?.remark || ""} onChange={e => updateField("remark", e.target.value)} rows={2} placeholder="Add any additional remarks..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingTask?.id ? "Update" : "Create"} Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Task?" />
    </div>
  );
}
