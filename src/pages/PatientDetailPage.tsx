import { useParams, useNavigate } from "react-router-dom";
import { useApiGet, useApiList } from "@/hooks/useApi";
import { Patient, VitalRecord, CareVisit, Task } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: patient, isLoading: lp } = useApiGet<Patient>(`patient-${id}`, `/patients/${id}`, !!id);
  const { data: vitals = [], isLoading: lv } = useApiList<VitalRecord>("vitals", "/vitals");
  const { data: visits = [], isLoading: lvs } = useApiList<CareVisit>("visits", "/care-visits");
  const { data: tasks = [], isLoading: lt } = useApiList<Task>("tasks", "/tasks");

  const isLoading = lp || lv || lvs || lt;

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
      </Tabs>
    </div>
  );
}
