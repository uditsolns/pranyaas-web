import { useState } from "react";
import { ExportButton } from "@/components/ExportButton";
import { Patient, CareManager } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TablePagination } from "@/components/TablePagination";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import { useApiList, useApiCreate, useApiUpdatePost, useApiDelete } from "@/hooks/useApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

type PatientForm = Partial<Patient> & { name?: string; email?: string; phone?: string; password?: string };

const emptyPatient: PatientForm = {
  full_name: "", name: "", email: "", phone: "", password: "", dob: "", age: "", gender: "", blood_group: "",
  primary_diagnosis: "", risk_category: "", address: "", landmark: "",
  aadhaar_no: "", pan_no: "", primary_language: "Hindi",
  secondary_diagnosis: "", allergies: "", current_medications: "",
  treating_doctor_name: "", preferred_hospital: "", past_surgeries: "",
  mobility_status: "", fall_risk_level: "", mental_health_status: "",
  baseline_bp: "", baseline_sugar: "", baseline_spo2: "",
  weight: "", height: "", insurance_policy_name: "", insurance_policy_number: "",
  risk_score: "", last_visit_date: "", kyc_status: "", care_manager_id: "",
};

export default function PatientsPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "patients");
  const { data: patients = [], isLoading } = useApiList<Patient>("patients", "/patients");
  const { data: cms = [] } = useApiList<CareManager>("care-managers", "/care-managers");
  const createMutation = useApiCreate<Patient>("patients", "/patients", "Patient");
  const updateMutation = useApiUpdatePost<Patient>("patients", "/patients", "Patient");
  const deleteMutation = useApiDelete("patients", "/patients", "Patient");

  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const navigate = useNavigate();

  const filtered = patients.filter(p => {
    const matchesSearch = (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.primary_diagnosis || "").toLowerCase().includes(search.toLowerCase());
    const matchesRisk = filterRisk === "all" || p.risk_category === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => { setEditingPatient({ ...emptyPatient }); setDialogOpen(true); };
  const openEdit = (p: Patient) => { setEditingPatient({ ...p, name: p.user?.name || p.full_name, email: p.user?.email || "", phone: p.user?.phone || "" }); setDialogOpen(true); };

  const handleSave = () => {
    if (!editingPatient?.full_name?.trim()) return;
    if (!editingPatient.id && (!editingPatient.name?.trim() || !editingPatient.email?.trim() || !editingPatient.phone?.trim())) return;
    const payload = { ...editingPatient };
    if (editingPatient.id) {
      updateMutation.mutate({ id: editingPatient.id, data: payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: string, value: string | number) => {
    setEditingPatient(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Patients" subtitle={`${total} registered patients`} actionLabel={hasEdit ? "Add Patient" : undefined} onAction={hasEdit ? openCreate : undefined}>
        <ExportButton filename="patients" title="Patients Report" columns={[
          { key: "full_name", label: "Name" }, { key: "age", label: "Age" }, { key: "gender", label: "Gender" },
          { key: "blood_group", label: "Blood Group" }, { key: "primary_diagnosis", label: "Diagnosis" }, { key: "risk_category", label: "Risk" },
          { key: "kyc_status", label: "KYC Status" },
        ]} data={filtered} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patients..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterRisk} onValueChange={v => { setFilterRisk(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Patient</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Age</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Diagnosis</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Risk</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Gender</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">KYC Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6}><EmptyState title="No patients found" description="Try adjusting your search or filters" /></td></tr>
              ) : paged.map(p => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                        {(p.full_name || "").split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">{p.user?.email || `ID: ${p.id}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground">{p.age ? `${p.age}y` : "NA"}</td>
                  <td className="p-4 text-sm text-foreground">{p.primary_diagnosis}</td>
                  <td className="p-4"><StatusBadge status={p.risk_category || "Low"} /></td>
                  <td className="p-4 text-sm text-foreground">{p.gender}</td>
                  <td className="p-4 text-sm">
                    {p.kyc_status ? (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                        p.kyc_status.toLowerCase() === 'verified' ? 'bg-green-100 text-green-700' : 
                        p.kyc_status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {p.kyc_status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Not Set</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/patients/${p.id}`)}><Eye className="h-4 w-4" /></Button>
                      </TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                      {hasEdit && <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
                      {hasEdit && <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPatient?.id ? "Edit Patient" : "Add New Patient"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {!editingPatient?.id && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:col-span-2 pt-1">User Account</p>
                <div className="space-y-2">
                  <Label>Name <span className="text-destructive">*</span></Label>
                  <Input value={editingPatient?.name || ""} onChange={e => updateField("name", e.target.value)} placeholder="Login display name" />
                </div>
                <div className="space-y-2">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={editingPatient?.email || ""} onChange={e => updateField("email", e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone <span className="text-destructive">*</span></Label>
                  <Input value={editingPatient?.phone || ""} onChange={e => updateField("phone", e.target.value)} placeholder="9876543210" />
                </div>
                <div className="space-y-2">
                  <Label>Password <span className="text-destructive">*</span></Label>
                  <Input type="password" value={editingPatient?.password || ""} onChange={e => updateField("password", e.target.value)} />
                </div>
                <div className="sm:col-span-2"><hr className="border-border/50" /></div>
              </>
            )}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:col-span-2 pt-1">Patient Details</p>
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input value={editingPatient?.full_name || ""} onChange={e => updateField("full_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={editingPatient?.dob || ""} onChange={e => updateField("dob", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input value={editingPatient?.age || ""} onChange={e => updateField("age", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={editingPatient?.gender || ""} onValueChange={v => updateField("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select Gender..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Select value={editingPatient?.blood_group || ""} onValueChange={v => updateField("blood_group", v)}>
                <SelectTrigger><SelectValue placeholder="Select Blood Group..." /></SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aadhaar No</Label>
              <Input value={editingPatient?.aadhaar_no || ""} onChange={e => updateField("aadhaar_no", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>PAN No</Label>
              <Input value={editingPatient?.pan_no || ""} onChange={e => updateField("pan_no", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Primary Language</Label>
              <Input value={editingPatient?.primary_language || ""} onChange={e => updateField("primary_language", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Primary Diagnosis</Label>
              <Input value={editingPatient?.primary_diagnosis || ""} onChange={e => updateField("primary_diagnosis", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Secondary Diagnosis</Label>
              <Input value={editingPatient?.secondary_diagnosis || ""} onChange={e => updateField("secondary_diagnosis", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Allergies</Label>
              <Input value={editingPatient?.allergies || ""} onChange={e => updateField("allergies", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Current Medications</Label>
              <Input value={editingPatient?.current_medications || ""} onChange={e => updateField("current_medications", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Treating Doctor</Label>
              <Input value={editingPatient?.treating_doctor_name || ""} onChange={e => updateField("treating_doctor_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Preferred Hospital</Label>
              <Input value={editingPatient?.preferred_hospital || ""} onChange={e => updateField("preferred_hospital", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Past Surgeries</Label>
              <Input value={editingPatient?.past_surgeries || ""} onChange={e => updateField("past_surgeries", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mobility Status</Label>
              <Input value={editingPatient?.mobility_status || ""} onChange={e => updateField("mobility_status", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fall Risk Level</Label>
              <Input value={editingPatient?.fall_risk_level || ""} onChange={e => updateField("fall_risk_level", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mental Health Status</Label>
              <Input value={editingPatient?.mental_health_status || ""} onChange={e => updateField("mental_health_status", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Baseline BP</Label>
              <Input value={editingPatient?.baseline_bp || ""} onChange={e => updateField("baseline_bp", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Baseline Sugar</Label>
              <Input value={editingPatient?.baseline_sugar || ""} onChange={e => updateField("baseline_sugar", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Baseline SpO2</Label>
              <Input value={editingPatient?.baseline_spo2 || ""} onChange={e => updateField("baseline_spo2", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Risk Category</Label>
              <Select value={editingPatient?.risk_category || ""} onValueChange={v => updateField("risk_category", v)}>
                <SelectTrigger><SelectValue placeholder="Select Risk..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>KYC Status</Label>
              <Select value={editingPatient?.kyc_status || ""} onValueChange={v => updateField("kyc_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input value={editingPatient?.address || ""} onChange={e => updateField("address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Landmark</Label>
              <Input value={editingPatient?.landmark || ""} onChange={e => updateField("landmark", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Weight</Label>
              <Input value={editingPatient?.weight || ""} onChange={e => updateField("weight", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Height</Label>
              <Input value={editingPatient?.height || ""} onChange={e => updateField("height", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Insurance Policy Name</Label>
              <Input value={editingPatient?.insurance_policy_name || ""} onChange={e => updateField("insurance_policy_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Insurance Policy Number</Label>
              <Input value={editingPatient?.insurance_policy_number || ""} onChange={e => updateField("insurance_policy_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Care Manager</Label>
              <Select value={editingPatient?.care_manager_id || ""} onValueChange={v => updateField("care_manager_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{cms.map(cm => <SelectItem key={cm.id} value={String(cm.user_id)}>{cm.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingPatient?.id ? "Update" : "Create"} Patient
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Patient?" description="This will permanently remove the patient record." />
    </div>
  );
}
