import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useApiGet, useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useApi";
import { Patient, VitalRecord, CareVisit, Task, EmergencyAlert, Relative, EmergencyContact } from "@/types";
import { AddressDisplay } from "@/components/AddressDisplay";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: patient, isLoading: lp } = useApiGet<Patient>(`patient-${id}`, `/patients/${id}`, !!id);
  const { data: vitals = [], isLoading: lv } = useApiList<VitalRecord>("vitals", "/vitals");
  const { data: visits = [], isLoading: lvs } = useApiList<CareVisit>("visits", "/care-visits");
  const { data: tasks = [], isLoading: lt } = useApiList<Task>("tasks", "/tasks");
  const { data: emergencies = [], isLoading: le } = useApiList<EmergencyAlert>("emergency-alerts", "/emergency-alerts");
  const { data: relatives = [], isLoading: lr } = useApiList<Relative>("relatives", "/relatives");
  const { data: contacts = [], isLoading: lc } = useApiList<EmergencyContact>(`emergency-contacts-${id}`, `/emergency-contacts/${id}`);

  const createContact = useApiCreate<EmergencyContact>("emergency-contacts", "/emergency-contacts", "Emergency Contact");
  const updateContact = useApiUpdate<EmergencyContact>("emergency-contacts", "/emergency-contacts", "Emergency Contact");
  const deleteContact = useApiDelete("emergency-contacts", "/emergency-contacts", "Emergency Contact");

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<EmergencyContact> | null>(null);

  const isLoading = lp || lv || lvs || lt || le || lr || lc;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Patient not found</p>
      </div>
    );
  }

  // Filter related data by patient id
  const pid = String(patient.id);
  const myVitals = vitals.filter(v => v.patient_id === pid);
  const myVisits = visits.filter(v => v.patient_id === pid);
  const myTasks = tasks.filter(t => t.patient_id === pid);
  const myEmergencies = emergencies.filter(e => String(e.patient_id) === pid);
  const myRelatives = relatives.filter(r => String(r.patient_id) === String(patient.user_id));
  const myContacts = Array.isArray(contacts) ? contacts : (contacts && typeof contacts === 'object' && Object.keys(contacts).length > 0 ? [contacts] : []);

  const openAddContact = () => {
    setEditingContact({ name: "", relation: "", phone: "", email: "", address: "", patient_id: pid });
    setContactDialogOpen(true);
  };

  const openEditContact = (c: EmergencyContact) => {
    setEditingContact({ ...c });
    setContactDialogOpen(true);
  };

  const handleSaveContact = () => {
    if (!editingContact?.name) return;
    if (editingContact.id) {
      updateContact.mutate({ id: editingContact.id, data: editingContact }, { onSuccess: () => setContactDialogOpen(false) });
    } else {
      createContact.mutate(editingContact, { onSuccess: () => setContactDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{patient.full_name}</h1>
          <p className="text-sm text-muted-foreground">ID: {patient.id} · {patient.age}y · {patient.gender}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={patient.risk_category || "Low"} />
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="bg-card rounded-xl p-6 card-shadow border border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Full Name", value: patient.full_name },
                { label: "Date of Birth", value: patient.dob },
                { label: "Age", value: `${patient.age} years` },
                { label: "Gender", value: patient.gender },
                { label: "Blood Group", value: patient.blood_group },
                { label: "Phone", value: patient.user?.phone || "N/A" },
                { label: "Address", value: patient.address },
                { label: "Primary Language", value: patient.primary_language },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{item.value || "N/A"}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="medical">
          <div className="bg-card rounded-xl p-6 card-shadow border border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-4">Medical Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Primary Diagnosis", value: patient.primary_diagnosis },
                { label: "Secondary Diagnosis", value: patient.secondary_diagnosis },
                { label: "Allergies", value: patient.allergies },
                { label: "Current Medications", value: patient.current_medications },
                { label: "Treating Doctor", value: patient.treating_doctor_name },
                { label: "Preferred Hospital", value: patient.preferred_hospital },
                { label: "Past Surgeries", value: patient.past_surgeries },
                { label: "Mobility Status", value: patient.mobility_status },
                { label: "Fall Risk Level", value: patient.fall_risk_level },
                { label: "Mental Health Status", value: patient.mental_health_status },
                { label: "Risk Category", value: patient.risk_category },
                { label: "Blood Group", value: patient.blood_group },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{item.value || "N/A"}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vitals">
          <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/30">
                    {["Recorded At", "Temperature", "Heart Rate", "BP", "Sugar Level"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-muted-foreground p-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myVitals.map(v => (
                    <tr key={v.id} className="border-b border-border/50 last:border-0">
                      <td className="p-3 text-sm">{v.recorded_at}</td>
                      <td className="p-3 text-sm">{v.temperature || "—"}</td>
                      <td className="p-3 text-sm">{v.heart_rate || "—"}</td>
                      <td className="p-3 text-sm">{v.bp || "—"}</td>
                      <td className="p-3 text-sm">{v.sugar_level || "—"}</td>
                    </tr>
                  ))}
                  {myVitals.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-sm text-muted-foreground">No vitals recorded</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="visits">
          <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
            <div className="space-y-3">
              {myVisits.map(v => (
                <div key={v.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.visit_type}</p>
                    <p className="text-xs text-muted-foreground">{v.visit_time} · {v.notes?.slice(0, 50)}</p>
                  </div>
                </div>
              ))}
              {myVisits.length === 0 && <p className="text-sm text-muted-foreground">No visits recorded</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
            <div className="space-y-3">
              {myTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground">Due: {t.due_date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
              {myTasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks assigned</p>}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="emergency">
          <div className="space-y-6">
            {/* Official Emergency Contacts Section */}
            <div className="bg-destructive/5 rounded-xl p-5 border border-destructive/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-destructive uppercase tracking-wider">Official Emergency Contacts</h3>
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={openAddContact}>
                  <Plus className="h-3.5 w-3.5" /> Add Contact
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myContacts.map(c => (
                  <div key={c.id} className="bg-card p-4 rounded-lg border border-border/50 shadow-sm relative group">
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditContact(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteContact.mutate(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.relation}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-foreground flex items-center gap-2">
                        <span className="text-muted-foreground w-12">Phone:</span> {c.phone}
                      </p>
                      {c.email && (
                        <p className="text-xs font-medium text-foreground flex items-center gap-2">
                          <span className="text-muted-foreground w-12">Email:</span> {c.email}
                        </p>
                      )}
                      {c.address && (
                        <p className="text-xs font-medium text-foreground flex items-center gap-2">
                          <span className="text-muted-foreground w-12">Address:</span> {c.address}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {myContacts.length === 0 && (
                  <p className="text-sm text-muted-foreground italic col-span-2">No official emergency contacts registered.</p>
                )}
              </div>
            </div>

            {/* Relatives Section */}
            <div className="bg-secondary/20 rounded-xl p-5 border border-border/50">
              <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider opacity-70">Associated Relatives</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myRelatives.map(r => (
                  <div key={r.id} className="bg-card p-3 rounded-lg border border-border/50 shadow-sm opacity-80">
                    <p className="text-sm font-semibold text-foreground">{r.relative_name}</p>
                    <p className="text-xs text-muted-foreground">{r.relationship}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-foreground flex items-center gap-2">
                        <span className="text-muted-foreground w-12">Phone:</span> {r.phone_number}
                      </p>
                    </div>
                  </div>
                ))}
                {myRelatives.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No relatives registered.</p>
                )}
              </div>
            </div>

            {/* Emergency History Section */}
            {/* <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
              <h3 className="text-sm font-semibold text-foreground mb-4">Emergency History</h3>
              <div className="space-y-4">
                {myEmergencies.map(e => (
                  <div key={e.id} className="p-4 rounded-lg border border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Emergency #{e.id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('en-GB')}</p>
                      </div>
                      <StatusBadge status={e.status === "active" ? "Need Action" : e.status} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Triggered By</p>
                      <p className="text-sm font-medium">{e.triggered_by}</p>
                    </div>
                    {e.latitude && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Location</p>
                        <AddressDisplay lat={e.latitude} lon={e.longitude} />
                      </div>
                    )}
                  </div>
                ))}
                {myEmergencies.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No emergency alerts recorded for this patient.</p>}
              </div>
            </div> */}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingContact?.id ? "Edit Emergency Contact" : "Add Emergency Contact"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editingContact?.name || ""} onChange={e => setEditingContact(prev => ({ ...prev!, name: e.target.value }))} placeholder="Rahul Sharma" />
            </div>
            <div className="space-y-2">
              <Label>Relationship <span className="text-destructive">*</span></Label>
              <Input value={editingContact?.relation || ""} onChange={e => setEditingContact(prev => ({ ...prev!, relation: e.target.value }))} placeholder="Brother" />
            </div>
            <div className="space-y-2">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input value={editingContact?.phone || ""} onChange={e => setEditingContact(prev => ({ ...prev!, phone: e.target.value }))} placeholder="9876543210" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editingContact?.email || ""} onChange={e => setEditingContact(prev => ({ ...prev!, email: e.target.value }))} placeholder="rahul@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={editingContact?.address || ""} onChange={e => setEditingContact(prev => ({ ...prev!, address: e.target.value }))} placeholder="Pune Maharashtra" />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveContact} disabled={createContact.isPending || updateContact.isPending}>
                {editingContact?.id ? "Update" : "Create"} Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
