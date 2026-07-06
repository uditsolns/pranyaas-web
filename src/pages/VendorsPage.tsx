import { useState } from "react";
import { toast } from "sonner";
import { ExportButton } from "@/components/ExportButton";
import { Vendor } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TablePagination } from "@/components/TablePagination";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useApi";
import { api, getStorageUrl } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewingItem, setViewingItem] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [rateCardFile, setRateCardFile] = useState<File | null>(null);
  const qc = useQueryClient();

  const filtered = vendors.filter(v =>
    (v.vendor_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (v.type || "").toLowerCase().includes(search.toLowerCase()) ||
    (v.company_name || "").toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingItem({ ...emptyVendor }); setErrors({}); setRateCardFile(null); setDialogOpen(true); };
  const openEdit = (v: Vendor) => { setEditingItem({ ...v }); setErrors({}); setRateCardFile(null); setDialogOpen(true); };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!editingItem) return false;

    if (!editingItem.vendor_name?.trim()) newErrors.vendor_name = "Vendor Name is required";
    
    if (editingItem.mobile && !/^\d{10}$/.test(editingItem.mobile)) {
      newErrors.mobile = "Mobile number must be 10 digits";
    }

    if (editingItem.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingItem.email)) {
      newErrors.email = "Invalid email format";
    }

    if (editingItem.adhar_no && !/^\d{12}$/.test(editingItem.adhar_no)) {
      newErrors.adhar_no = "Aadhaar Number must be 12 digits";
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

  const handleSave = async () => {
    if (!validateForm()) return;
    
    // Deconstruct and clean up the object for the API payload
    const { id, created_at, updated_at, rate_card, ...vData } = editingItem as any;
    
    const formData = new FormData();
    Object.entries(vData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    formData.append("avg_response_time", editingItem?.avg_response_time ? String(parseInt(String(editingItem.avg_response_time))) : "0");
    formData.append("availability_24_7", editingItem?.availability_24_7 ? String(parseInt(String(editingItem.availability_24_7))) : "0");
    formData.append("oxygen_support", editingItem?.oxygen_support ? String(parseInt(String(editingItem.oxygen_support))) : "0");
    formData.append("ventilator_available", editingItem?.ventilator_available ? String(parseInt(String(editingItem.ventilator_available))) : "0");

    if (rateCardFile) {
      formData.append("rate_card", rateCardFile);
    }

    try {
      if (id) {
        formData.append("_method", "PUT");
        await api.postFormData(`/vendors/${id}`, formData);
        toast.success("Vendor updated successfully");
      } else {
        await api.postFormData("/vendors", formData);
        toast.success("Vendor added successfully");
      }
      qc.invalidateQueries({ queryKey: ["vendors"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save vendor");
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof Vendor, value: string) => {
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
                <th className="text-left text-xs font-medium text-muted-foreground p-4">City</th>
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
                <div><p className="text-xs text-muted-foreground">City</p><p className="text-sm font-medium">{viewingItem.coverage_area || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Average Response in minutes</p><p className="text-sm font-medium">{viewingItem.avg_response_time || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">24/7</p><p className="text-sm font-medium">{viewingItem.availability_24_7 || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">O₂ Support</p><p className="text-sm font-medium">{viewingItem.oxygen_support || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Ventilator</p><p className="text-sm font-medium">{viewingItem.ventilator_available || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Agreement</p><StatusBadge status={viewingItem.agreement_status || "—"} /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
                <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{viewingItem.address || "—"}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <div className="text-sm font-medium">
                    {viewingItem.latitude && viewingItem.longitude ? `${viewingItem.latitude}, ${viewingItem.longitude}` : "—"}
                  </div>
                </div>
              </div>
              
              {viewingItem.latitude && viewingItem.longitude && !isNaN(Number(viewingItem.latitude)) && !isNaN(Number(viewingItem.longitude)) && (
                <div className="mt-4">
                  <div className="rounded-md overflow-hidden border border-border/50 h-[250px] relative z-0">
                    <MapContainer 
                      center={[Number(viewingItem.latitude), Number(viewingItem.longitude)]} 
                      zoom={15} 
                      scrollWheelZoom={false}
                      style={{ height: "100%", width: "100%" }}
                      attributionControl={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[Number(viewingItem.latitude), Number(viewingItem.longitude)]}>
                        <Popup>{viewingItem.vendor_name}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </div>
              )}

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
              <Label className={errors.vendor_name ? "text-destructive" : ""}>Vendor Name <span className="text-destructive">*</span></Label>
              <Input 
                value={editingItem?.vendor_name || ""} 
                onChange={e => updateField("vendor_name", e.target.value)} 
                placeholder="Full Name" 
                className={errors.vendor_name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.vendor_name && <p className="text-[10px] text-destructive font-medium">{errors.vendor_name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={editingItem?.company_name || ""} onChange={e => updateField("company_name", e.target.value)} placeholder="Company Name" />
            </div>
            <div className="space-y-2">
              <Label className={errors.mobile ? "text-destructive" : ""}>Mobile</Label>
              <Input 
                value={editingItem?.mobile || ""} 
                onChange={e => updateField("mobile", e.target.value)} 
                placeholder="e.g. 9846878785" 
                className={errors.mobile ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.mobile && <p className="text-[10px] text-destructive font-medium">{errors.mobile}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.email ? "text-destructive" : ""}>Email</Label>
              <Input 
                type="email" 
                value={editingItem?.email || ""} 
                onChange={e => updateField("email", e.target.value)} 
                placeholder="e.g. vendor@gmail.com" 
                className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.email && <p className="text-[10px] text-destructive font-medium">{errors.email}</p>}
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
              <Label className={errors.adhar_no ? "text-destructive" : ""}>Aadhaar No</Label>
              <Input 
                value={editingItem?.adhar_no || ""} 
                onChange={e => updateField("adhar_no", e.target.value)} 
                placeholder="e.g. 123456789012" 
                className={errors.adhar_no ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.adhar_no && <p className="text-[10px] text-destructive font-medium">{errors.adhar_no}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.pan_no ? "text-destructive" : ""}>PAN No</Label>
              <Input 
                value={editingItem?.pan_no || ""} 
                onChange={e => updateField("pan_no", e.target.value)} 
                placeholder="e.g. ABCDE1234F" 
                className={errors.pan_no ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.pan_no && <p className="text-[10px] text-destructive font-medium">{errors.pan_no}</p>}
            </div>
            <div className="space-y-2">
              <Label>Coverage Area</Label>
              <Input value={editingItem?.coverage_area || ""} onChange={e => updateField("coverage_area", e.target.value)} placeholder="e.g. Mumbai South" />
            </div>
            <div className="space-y-2">
              <Label>Avg Response Time (In Minutes)</Label>
              <Input type="number" min="0" value={editingItem?.avg_response_time || ""} onChange={e => updateField("avg_response_time", e.target.value)} placeholder="e.g. 15" />
            </div>
            <div className="space-y-2">
              <Label>24/7 Availability Oxygen Support</Label>
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
              {editingItem?.rate_card && typeof editingItem.rate_card === "string" && (
                <div className="mb-2">
                  <a href={getStorageUrl(editingItem.rate_card) || ""} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    View Current Rate Card
                  </a>
                </div>
              )}
              <Input 
                type="file" 
                accept="image/jpeg,image/png,image/jpg" 
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setRateCardFile(e.target.files[0]);
                  }
                }} 
              />
              <p className="text-[10px] text-muted-foreground">Upload JPG, JPEG, or PNG image.</p>
            </div>
            <div className="space-y-2">
              <Label>Agreement Status</Label>
              <Select value={editingItem?.agreement_status || ""} onValueChange={v => updateField("agreement_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
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
