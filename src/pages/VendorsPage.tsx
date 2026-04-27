import { useState } from "react";
import { ExportButton } from "@/components/ExportButton";
import { Vendor } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

const emptyVendor: Partial<Vendor> = {
  vendor_name: "", mobile: "", email: "", address: "", company_name: "",
  latitude: "", longitude: "",
  adhar_no: "", pan_no: "", type: "", coverage_area: "",
  avg_response_time: "", availability_24_7: "", oxygen_support: "",
  ventilator_available: "", rate_card: "", agreement_status: "",
};

export default function VendorsPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "vendors");
  const { data: vendors = [], isLoading } = useApiList<Vendor>("vendors", "/vendors");
  const createMutation = useApiCreate<Vendor>("vendors", "/vendors", "Vendor");
  const updateMutation = useApiUpdate<Vendor>("vendors", "/vendors", "Vendor");
  const deleteMutation = useApiDelete("vendors", "/vendors", "Vendor");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Vendor> | null>(null);
  const [viewingItem, setViewingItem] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const filtered = vendors.filter(v =>
    (v.vendor_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (v.type || "").toLowerCase().includes(search.toLowerCase()) ||
    (v.company_name || "").toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingItem({ ...emptyVendor }); setDialogOpen(true); };
  const openEdit = (v: Vendor) => { setEditingItem({ ...v }); setDialogOpen(true); };

  const handleSave = () => {
    if (!editingItem?.vendor_name?.trim()) return;
    
    // Deconstruct and clean up the object for the API payload
    const { id, created_at, updated_at, ...vData } = editingItem as any;
    
    // Ensure numeric fields are cast correctly or nullified if empty
    const sanitizedVendor = {
      ...vData,
      avg_response_time: editingItem.avg_response_time ? parseInt(String(editingItem.avg_response_time)) : 0,
      availability_24_7: editingItem.availability_24_7 ? parseInt(String(editingItem.availability_24_7)) : 0,
      oxygen_support: editingItem.oxygen_support ? parseInt(String(editingItem.oxygen_support)) : 0,
      ventilator_available: editingItem.ventilator_available ? parseInt(String(editingItem.ventilator_available)) : 0,
    };

    if (id) {
      updateMutation.mutate({ id, data: sanitizedVendor }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(sanitizedVendor, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof Vendor, value: string) => {
    setEditingItem(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" subtitle={`${total} registered vendors`} actionLabel={hasEdit ? "Add Vendor" : undefined} onAction={hasEdit ? openCreate : undefined}>
        <ExportButton filename="vendors" title="Vendors Report" columns={[
          { key: "vendor_name", label: "Name" }, { key: "company_name", label: "Company" }, { key: "type", label: "Type" },
          { key: "coverage_area", label: "Coverage" }, { key: "agreement_status", label: "Agreement" },
        ]} data={filtered} />
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search vendors..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Vendor</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Company</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Mobile</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Coverage</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Agreement</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No vendors found" /></td></tr>
              ) : paged.map(v => (
                <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-4 text-sm font-medium text-foreground">{v.vendor_name}</td>
                  <td className="p-4 text-sm text-foreground">{v.company_name || "—"}</td>
                  <td className="p-4 text-sm text-foreground">{v.type}</td>
                  <td className="p-4 text-sm text-foreground">{v.mobile}</td>
                  <td className="p-4 text-sm text-foreground">{v.coverage_area || "—"}</td>
                  <td className="p-4"><StatusBadge status={v.agreement_status || "Pending"} /></td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingItem(v); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
                      {hasEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(v.id)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>}
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
          <DialogHeader><DialogTitle>Vendor Details</DialogTitle></DialogHeader>
          {viewingItem && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Vendor Name</p><p className="text-sm font-medium">{viewingItem.vendor_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Company</p><p className="text-sm font-medium">{viewingItem.company_name || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Type</p><p className="text-sm font-medium">{viewingItem.type}</p></div>
                <div><p className="text-xs text-muted-foreground">Mobile</p><p className="text-sm font-medium">{viewingItem.mobile}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{viewingItem.email || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{viewingItem.address || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium">{viewingItem.latitude && viewingItem.longitude ? `${viewingItem.latitude}, ${viewingItem.longitude}` : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Coverage</p><p className="text-sm font-medium">{viewingItem.coverage_area || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Avg Response</p><p className="text-sm font-medium">{viewingItem.avg_response_time || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">24/7</p><p className="text-sm font-medium">{viewingItem.availability_24_7 || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">O₂ Support</p><p className="text-sm font-medium">{viewingItem.oxygen_support || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Ventilator</p><p className="text-sm font-medium">{viewingItem.ventilator_available || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Agreement</p><StatusBadge status={viewingItem.agreement_status || "—"} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {hasEdit && <Button onClick={() => { setDetailOpen(false); openEdit(viewingItem); }}>Edit</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem?.id ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Vendor Name <span className="text-destructive">*</span></Label>
              <Input value={editingItem?.vendor_name || ""} onChange={e => updateField("vendor_name", e.target.value)} placeholder="Full Name" />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={editingItem?.company_name || ""} onChange={e => updateField("company_name", e.target.value)} placeholder="Company Name" />
            </div>
            <div className="space-y-2">
              <Label>Mobile</Label>
              <Input value={editingItem?.mobile || ""} onChange={e => updateField("mobile", e.target.value)} placeholder="e.g. 9846878785" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editingItem?.email || ""} onChange={e => updateField("email", e.target.value)} placeholder="e.g. vendor@gmail.com" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <div className="flex gap-2">
                <Input value={editingItem?.address || ""} onChange={e => updateField("address", e.target.value)} placeholder="Full Address" />
                <Button 
                  type="button"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={!editingItem?.address || isGeocoding}
                  onClick={async () => {
                    if (!editingItem?.address) return;
                    setIsGeocoding(true);
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(editingItem.address)}`);
                      const data = await res.json();
                      if (data && data.length > 0) {
                        updateField("latitude", data[0].lat);
                        updateField("longitude", data[0].lon);
                      } else {
                        alert("Could not find coordinates for this address.");
                      }
                    } catch (err) {
                      console.error(err);
                      alert("Error fetching coordinates.");
                    } finally {
                      setIsGeocoding(false);
                    }
                  }}
                >
                  {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get Lat/Lng"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input value={editingItem?.latitude || ""} onChange={e => updateField("latitude", e.target.value)} placeholder="e.g. 19.218330" />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input value={editingItem?.longitude || ""} onChange={e => updateField("longitude", e.target.value)} placeholder="e.g. 72.978088" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editingItem?.type || ""} onValueChange={v => updateField("type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {["Ambulance", "Pharmacy", "Lab", "Equipment", "Physiotherapy", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aadhaar No</Label>
              <Input value={editingItem?.adhar_no || ""} onChange={e => updateField("adhar_no", e.target.value)} placeholder="e.g. 123456789012" />
            </div>
            <div className="space-y-2">
              <Label>PAN No</Label>
              <Input value={editingItem?.pan_no || ""} onChange={e => updateField("pan_no", e.target.value)} placeholder="e.g. ABCDE1234F" />
            </div>
            <div className="space-y-2">
              <Label>Coverage Area</Label>
              <Input value={editingItem?.coverage_area || ""} onChange={e => updateField("coverage_area", e.target.value)} placeholder="e.g. Mumbai South" />
            </div>
            <div className="space-y-2">
              <Label>Avg Response Time</Label>
              <Input type="number" min="0" value={editingItem?.avg_response_time || ""} onChange={e => updateField("avg_response_time", e.target.value)} placeholder="e.g. 15" />
            </div>
            <div className="space-y-2">
              <Label>24/7 Availability</Label>
              <Input type="number" min="0" value={editingItem?.availability_24_7 || ""} onChange={e => updateField("availability_24_7", e.target.value)} placeholder="e.g. 24" />
            </div>
            <div className="space-y-2">
              <Label>Oxygen Support</Label>
              <Input type="number" min="0" value={editingItem?.oxygen_support || ""} onChange={e => updateField("oxygen_support", e.target.value)} placeholder="e.g. 1" />
            </div>
            <div className="space-y-2">
              <Label>Ventilator Available</Label>
              <Input type="number" min="0" value={editingItem?.ventilator_available || ""} onChange={e => updateField("ventilator_available", e.target.value)} placeholder="e.g. 1" />
            </div>
            <div className="space-y-2">
              <Label>Rate Card</Label>
              <Input value={editingItem?.rate_card || ""} onChange={e => updateField("rate_card", e.target.value)} placeholder="Rate details" />
            </div>
            <div className="space-y-2">
              <Label>Agreement Status</Label>
              <Select value={editingItem?.agreement_status || ""} onValueChange={v => updateField("agreement_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingItem?.id ? "Update" : "Add"} Vendor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Vendor?" />
    </div>
  );
}
