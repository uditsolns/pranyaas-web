import { useState, useRef } from "react";
import { Event } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, Loader2, AlertCircle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TablePagination } from "@/components/TablePagination";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import { useApiList, useApiDelete } from "@/hooks/useApi";
import { api, getStorageUrl } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const emptyEvent: Partial<Event> = {
  event_name: "", event_date: "", event_time: "", location: "",
  description: "", banner_image: "", organizer_name: "",
  organizer_phone: "", status: "active", meet_link: "",
};

export default function EventsPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "events");
  const queryClient = useQueryClient();
  const { data: events = [], isLoading, isError, error } = useApiList<Event>("events", "/events");
  const deleteMutation = useApiDelete("events", "/events", "Event");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = events.filter(e => {
    const matchesSearch = (e.event_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || e.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => {
    setEditingEvent({ ...emptyEvent });
    setBannerFile(null);
    setBannerPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (e: Event) => {
    setEditingEvent({ ...e });
    setBannerFile(null);
    setBannerPreview(e.banner_image ? getStorageUrl(e.banner_image) : null);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setEditingEvent(prev => prev ? { ...prev, banner_image: "" } : prev);
  };

  const handleSave = async () => {
    if (!editingEvent?.event_name?.trim()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("event_name", editingEvent.event_name || "");
      formData.append("event_date", editingEvent.event_date || "");
      formData.append("event_time", editingEvent.event_time || "");
      formData.append("location", editingEvent.location || "");
      formData.append("description", editingEvent.description || "");
      formData.append("organizer_name", editingEvent.organizer_name || "");
      formData.append("organizer_phone", editingEvent.organizer_phone || "");
      formData.append("status", editingEvent.status || "active");
      formData.append("meet_link", editingEvent.meet_link || "");
      if (bannerFile) {
        formData.append("banner_image", bannerFile);
      }

      if (editingEvent.id) {
        await api.postFormData<Event>(`/events/${editingEvent.id}`, formData);
        toast.success("Event updated successfully");
      } else {
        await api.postFormData<Event>("/events", formData);
        toast.success("Event created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof Event, value: string) => {
    setEditingEvent(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (isError) return (
    <div className="space-y-6">
      <PageHeader title="Events" subtitle="Event management" actionLabel={hasEdit ? "Create Event" : undefined} onAction={hasEdit ? openCreate : undefined} />
      <div className="bg-destructive/5 rounded-xl p-6 border border-destructive/20 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Unable to load events</p>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error)?.message || "The events API is currently unavailable."}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Events" subtitle={`${total} total events`} actionLabel={hasEdit ? "Create Event" : undefined} onAction={hasEdit ? openCreate : undefined} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search events..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Banner</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Event Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Location</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Organizer</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No events found" /></td></tr>
              ) : paged.map(e => (
                <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-4">
                    {e.banner_image ? (
                      <img src={getStorageUrl(e.banner_image)!} alt={e.event_name} className="h-10 w-16 object-cover rounded" />
                    ) : (
                      <div className="h-10 w-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">No img</div>
                    )}
                  </td>
                  <td className="p-4 text-sm font-medium text-foreground">{e.event_name}</td>
                  <td className="p-4 text-sm text-foreground">{e.event_date || "—"}</td>
                  <td className="p-4 text-sm text-foreground">{e.location || "—"}</td>
                  <td className="p-4 text-sm text-foreground">{e.organizer_name || "—"}</td>
                  <td className="p-4"><StatusBadge status={e.status || "active"} /></td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingEvent(e); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(e.id)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Event Details</DialogTitle></DialogHeader>
          {viewingEvent && (
            <div className="space-y-4 mt-2">
              {viewingEvent.banner_image && (
                <img src={getStorageUrl(viewingEvent.banner_image)!} alt={viewingEvent.event_name} className="w-full h-40 object-cover rounded-lg" />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Event Name</p><p className="text-sm font-medium">{viewingEvent.event_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm font-medium">{viewingEvent.event_date || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Time</p><p className="text-sm font-medium">{viewingEvent.event_time || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium">{viewingEvent.location || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Organizer</p><p className="text-sm font-medium">{viewingEvent.organizer_name || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{viewingEvent.organizer_phone || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={viewingEvent.status} /></div>
                {viewingEvent.meet_link && <div><p className="text-xs text-muted-foreground">Meet Link</p><a href={viewingEvent.meet_link} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{viewingEvent.meet_link}</a></div>}
              </div>
              {viewingEvent.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm mt-1">{viewingEvent.description}</p></div>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {hasEdit && <Button onClick={() => { setDetailOpen(false); openEdit(viewingEvent); }}>Edit Event</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEvent?.id ? "Edit Event" : "Create Event"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Event Name <span className="text-destructive">*</span></Label>
              <Input value={editingEvent?.event_name || ""} onChange={e => updateField("event_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Event Date</Label>
              <Input type="date" value={editingEvent?.event_date || ""} onChange={e => updateField("event_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Event Time</Label>
              <Input type="time" value={editingEvent?.event_time || ""} onChange={e => updateField("event_time", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Location</Label>
              <Input value={editingEvent?.location || ""} onChange={e => updateField("location", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={editingEvent?.description || ""} onChange={e => updateField("description", e.target.value)} rows={3} />
            </div>

            {/* Banner Image Upload */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Banner Image</Label>
              {bannerPreview ? (
                <div className="relative">
                  <img src={bannerPreview} alt="Banner preview" className="w-full h-40 object-cover rounded-lg border border-border" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={clearBanner}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-secondary/20 transition-colors"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload banner image</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-2">
              <Label>Organizer Name</Label>
              <Input value={editingEvent?.organizer_name || ""} onChange={e => updateField("organizer_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Organizer Phone</Label>
              <Input value={editingEvent?.organizer_phone || ""} onChange={e => updateField("organizer_phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editingEvent?.status || "active"} onValueChange={v => updateField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meet Link</Label>
              <Input value={editingEvent?.meet_link || ""} onChange={e => updateField("meet_link", e.target.value)} placeholder="https://meet.google.com/..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingEvent?.id ? "Update" : "Create"} Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Event?" />
    </div>
  );
}
