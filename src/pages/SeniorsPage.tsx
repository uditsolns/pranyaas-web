import { useState } from "react";
import { toast } from "sonner";
import { ExportButton } from "@/components/ExportButton";
import { Senior, CareManager } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TablePagination } from "@/components/TablePagination";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import {
  useApiList,
  useApiCreate,
  useApiUpdatePost,
  useApiDelete,
} from "@/hooks/useApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

type SeniorForm = Partial<Senior> & {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
};

const emptySenior: SeniorForm = {
  full_name: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  dob: "",
  age: "",
  gender: "",
  blood_group: "",
  primary_diagnosis: "",
  risk_category: "",
  address: "",
  landmark: "",
  aadhaar_no: "",
  pan_no: "",
  primary_language: "Hindi",
  secondary_diagnosis: "",
  allergies: "",
  current_medications: "",
  treating_doctor_name: "",
  preferred_hospital: "",
  past_surgeries: "",
  mobility_status: "",
  fall_risk_level: "",
  mental_health_status: "",
  baseline_bp: "",
  baseline_sugar: "",
  baseline_spo2: "",
  weight: "",
  height: "",
  insurance_policy_name: "",
  insurance_policy_number: "",
  risk_score: "",
  last_visit_date: "",
  kyc_status: "",
  care_manager_id: "",
};

export default function SeniorsPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "seniors");
  const { data: seniors = [], isLoading } = useApiList<Senior>(
    "seniors",
    "/seniors",
  );
  const { data: cms = [] } = useApiList<CareManager>(
    "care-managers",
    "/care-managers",
  );
  const createMutation = useApiCreate<Senior>(
    "seniors",
    "/seniors",
    "Senior",
  );
  const updateMutation = useApiUpdatePost<Senior>(
    "seniors",
    "/seniors",
    "Senior",
  );
  const deleteMutation = useApiDelete("seniors", "/seniors", "Senior");

  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSenior, setEditingSenior] = useState<SeniorForm | null>(
    null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [kycApprovalTarget, setKycApprovalTarget] = useState<Senior | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const navigate = useNavigate();

  const filtered = seniors.filter((p) => {
    const matchesSearch =
      (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.primary_diagnosis || "").toLowerCase().includes(search.toLowerCase());
    const matchesRisk = filterRisk === "all" || p.risk_category === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const { page, setPage, totalPages, paged, total, from, to } =
    usePagination(filtered);

  const openCreate = () => {
    setEditingSenior({ ...emptySenior });
    setErrors({});
    setDialogOpen(true);
  };
  const openEdit = (p: Senior) => {
    setEditingSenior({
      ...p,
      name: p.user?.name || p.full_name,
      email: p.user?.email || "",
      phone: p.user?.phone || "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!editingSenior) return false;

    if (!editingSenior.full_name?.trim())
      newErrors.full_name = "Full Name is required";

    if (!editingSenior.id) {
      if (!editingSenior.name?.trim())
        newErrors.name = "User Account Name is required";
      if (!editingSenior.email?.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingSenior.email)) {
        newErrors.email = "Invalid email format";
      }
      if (!editingSenior.phone?.trim()) {
        newErrors.phone = "Phone number is required";
      } else if (!/^\d{10}$/.test(editingSenior.phone)) {
        newErrors.phone = "Phone number must be 10 digits";
      }
      if (!editingSenior.password?.trim()) {
        newErrors.password = "Password is required";
      } else if (editingSenior.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    } else {
      if (editingSenior.phone && !/^\d{10}$/.test(editingSenior.phone)) {
        newErrors.phone = "Phone number must be 10 digits";
      }
    }

    if (
      editingSenior.aadhaar_no &&
      !/^\d{12}$/.test(editingSenior.aadhaar_no)
    ) {
      newErrors.aadhaar_no = "Aadhaar Number must be 12 digits";
    }

    if (
      editingSenior.pan_no &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editingSenior.pan_no.toUpperCase())
    ) {
      newErrors.pan_no = "Invalid PAN format";
    }

    if (editingSenior.dob) {
      const birthDate = new Date(editingSenior.dob);
      const today = new Date();
      if (birthDate > today) {
        newErrors.dob = "Date of Birth cannot be in the future";
      }
    }

    if (editingSenior.weight && isNaN(Number(editingSenior.weight))) {
      newErrors.weight = "Weight must be a number";
    }
    if (editingSenior.height && isNaN(Number(editingSenior.height))) {
      newErrors.height = "Height must be a number";
    }

    setErrors(newErrors);

    const errorMessages = Object.values(newErrors);
    if (errorMessages.length > 0) {
      toast.error(errorMessages[0]);
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    const payload = { ...editingSenior };
    if (editingSenior.id) {
      updateMutation.mutate(
        { id: editingSenior.id, data: payload },
        {
          onSuccess: () => {
            setDialogOpen(false);
            toast.success("Senior updated successfully");
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setDialogOpen(false);
          toast.success("Senior created successfully");
        },
      });
    }
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  const updateField = (field: string, value: string | number) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setEditingSenior((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };

      if (field === "dob") {
        if (value) {
          const birthDate = new Date(value as string);
          if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            updated.age = Math.max(0, age).toString();
          }
        } else {
          updated.age = "";
        }
      }

      return updated;
    });
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seniors"
        subtitle={`${total} registered seniors`}
        actionLabel={hasEdit ? "Add Senior" : undefined}
        onAction={hasEdit ? openCreate : undefined}
      >
        <ExportButton
          filename="seniors"
          title="Seniors Report"
          columns={[
            { key: "full_name", label: "Name" },
            { key: "age", label: "Age" },
            { key: "gender", label: "Gender" },
            { key: "blood_group", label: "Blood Group" },
            { key: "primary_diagnosis", label: "Diagnosis" },
            { key: "risk_category", label: "Risk" },
            { key: "kyc_status", label: "KYC Status" },
          ]}
          data={filtered}
        />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search seniors..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={filterRisk}
          onValueChange={(v) => {
            setFilterRisk(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
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
                <th className="text-left text-xs font-medium text-muted-foreground p-4">
                  Senior
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">
                  Age
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">
                  Diagnosis
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">
                  Risk
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">
                  Gender
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">
                  KYC Status
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="No seniors found"
                      description="Try adjusting your search or filters"
                    />
                  </td>
                </tr>
              ) : (
                paged.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                          {(p.full_name || "")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {p.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.user?.email || `ID: ${p.id}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-foreground">
                      {p.age ? `${p.age}y` : "NA"}
                    </td>
                    <td className="p-4 text-sm text-foreground">
                      {p.primary_diagnosis}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={p.risk_category || "Low"} />
                    </td>
                    <td className="p-4 text-sm text-foreground">{p.gender}</td>
                    <td className="p-4 text-sm">
                      {p.kyc_status ? (
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                            p.kyc_status.toLowerCase() === "verified"
                              ? "bg-green-100 text-green-700"
                              : p.kyc_status.toLowerCase() === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {p.kyc_status}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">
                          Not Set
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/seniors/${p.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View</TooltipContent>
                        </Tooltip>
                        {hasEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setKycApprovalTarget(p)}
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Review KYC</TooltipContent>
                          </Tooltip>
                        )}
                        {hasEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(p)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        )}
                        {hasEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(p.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page}
          totalPages={totalPages}
          from={from}
          to={to}
          total={total}
          onPageChange={setPage}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSenior?.id ? "Edit Senior" : "Add New Senior"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {!editingSenior?.id && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:col-span-2 pt-1">
                  User Account
                </p>
                <div className="space-y-2">
                  <Label className={errors.name ? "text-destructive" : ""}>
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={editingSenior?.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Login display name"
                    className={
                      errors.name
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  />
                  {errors.name && (
                    <p className="text-[10px] text-destructive font-medium">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className={errors.email ? "text-destructive" : ""}>
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={editingSenior?.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="user@example.com"
                    className={
                      errors.email
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  />
                  {errors.email && (
                    <p className="text-[10px] text-destructive font-medium">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className={errors.phone ? "text-destructive" : ""}>
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={editingSenior?.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="9876543210"
                    className={
                      errors.phone
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  />
                  {errors.phone && (
                    <p className="text-[10px] text-destructive font-medium">
                      {errors.phone}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className={errors.password ? "text-destructive" : ""}>
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={editingSenior?.password || ""}
                    onChange={(e) => updateField("password", e.target.value)}
                    className={
                      errors.password
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  />
                  {errors.password && (
                    <p className="text-[10px] text-destructive font-medium">
                      {errors.password}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <hr className="border-border/50" />
                </div>
              </>
            )}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:col-span-2 pt-1">
              Senior Details
            </p>
            <div className="space-y-2">
              <Label className={errors.full_name ? "text-destructive" : ""}>
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={editingSenior?.full_name || ""}
                onChange={(e) => updateField("full_name", e.target.value)}
                className={
                  errors.full_name
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {errors.full_name && (
                <p className="text-[10px] text-destructive font-medium">
                  {errors.full_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className={errors.dob ? "text-destructive" : ""}>
                Date of Birth
              </Label>
              <Input
                type="date"
                value={editingSenior?.dob || ""}
                onChange={(e) => updateField("dob", e.target.value)}
                className={
                  errors.dob
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {errors.dob && (
                <p className="text-[10px] text-destructive font-medium">
                  {errors.dob}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input
                value={editingSenior?.age || ""}
                onChange={(e) => updateField("age", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={editingSenior?.gender || ""}
                onValueChange={(v) => updateField("gender", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Gender..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Select
                value={editingSenior?.blood_group || ""}
                onValueChange={(v) => updateField("blood_group", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Blood Group..." />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (bg) => (
                      <SelectItem key={bg} value={bg}>
                        {bg}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={errors.aadhaar_no ? "text-destructive" : ""}>
                Aadhaar No
              </Label>
              <Input
                value={editingSenior?.aadhaar_no || ""}
                onChange={(e) => updateField("aadhaar_no", e.target.value)}
                className={
                  errors.aadhaar_no
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {errors.aadhaar_no && (
                <p className="text-[10px] text-destructive font-medium">
                  {errors.aadhaar_no}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className={errors.pan_no ? "text-destructive" : ""}>
                PAN No
              </Label>
              <Input
                value={editingSenior?.pan_no || ""}
                onChange={(e) => updateField("pan_no", e.target.value)}
                className={
                  errors.pan_no
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {errors.pan_no && (
                <p className="text-[10px] text-destructive font-medium">
                  {errors.pan_no}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Primary Language</Label>
              <Input
                value={editingSenior?.primary_language || ""}
                onChange={(e) =>
                  updateField("primary_language", e.target.value)
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Primary Diagnosis</Label>
              <Input
                value={editingSenior?.primary_diagnosis || ""}
                onChange={(e) =>
                  updateField("primary_diagnosis", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary Diagnosis</Label>
              <Input
                value={editingSenior?.secondary_diagnosis || ""}
                onChange={(e) =>
                  updateField("secondary_diagnosis", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Allergies</Label>
              <Input
                value={editingSenior?.allergies || ""}
                onChange={(e) => updateField("allergies", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Current Medications</Label>
              <Input
                value={editingSenior?.current_medications || ""}
                onChange={(e) =>
                  updateField("current_medications", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Treating Doctor</Label>
              <Input
                value={editingSenior?.treating_doctor_name || ""}
                onChange={(e) =>
                  updateField("treating_doctor_name", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Preferred Hospital</Label>
              <Input
                value={editingSenior?.preferred_hospital || ""}
                onChange={(e) =>
                  updateField("preferred_hospital", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Past Surgeries</Label>
              <Input
                value={editingSenior?.past_surgeries || ""}
                onChange={(e) => updateField("past_surgeries", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Mobility Status</Label>
              <Input
                value={editingSenior?.mobility_status || ""}
                onChange={(e) => updateField("mobility_status", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fall Risk Level</Label>
              <Input
                value={editingSenior?.fall_risk_level || ""}
                onChange={(e) => updateField("fall_risk_level", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Mental Health Status</Label>
              <Input
                value={editingSenior?.mental_health_status || ""}
                onChange={(e) =>
                  updateField("mental_health_status", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Baseline BP</Label>
              <Input
                value={editingSenior?.baseline_bp || ""}
                onChange={(e) => updateField("baseline_bp", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Baseline Sugar</Label>
              <Input
                value={editingSenior?.baseline_sugar || ""}
                onChange={(e) => updateField("baseline_sugar", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Baseline SpO2</Label>
              <Input
                value={editingSenior?.baseline_spo2 || ""}
                onChange={(e) => updateField("baseline_spo2", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Category</Label>
              <Select
                value={editingSenior?.risk_category || ""}
                onValueChange={(v) => updateField("risk_category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Risk..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={editingSenior?.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Landmark</Label>
              <Input
                value={editingSenior?.landmark || ""}
                onChange={(e) => updateField("landmark", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className={errors.weight ? "text-destructive" : ""}>
                Weight
              </Label>
              <Input
                value={editingSenior?.weight || ""}
                onChange={(e) => updateField("weight", e.target.value)}
                className={
                  errors.weight
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {errors.weight && (
                <p className="text-[10px] text-destructive font-medium">
                  {errors.weight}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className={errors.height ? "text-destructive" : ""}>
                Height
              </Label>
              <Input
                value={editingSenior?.height || ""}
                onChange={(e) => updateField("height", e.target.value)}
                className={
                  errors.height
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {errors.height && (
                <p className="text-[10px] text-destructive font-medium">
                  {errors.height}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Insurance Policy Name</Label>
              <Input
                value={editingSenior?.insurance_policy_name || ""}
                onChange={(e) =>
                  updateField("insurance_policy_name", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Insurance Policy Number</Label>
              <Input
                value={editingSenior?.insurance_policy_number || ""}
                onChange={(e) =>
                  updateField("insurance_policy_number", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Care Manager</Label>
              <Select
                value={editingSenior?.care_manager_id || ""}
                onValueChange={(v) => updateField("care_manager_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {cms.map((cm) => (
                    <SelectItem key={cm.id} value={String(cm.user_id)}>
                      {cm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingSenior?.id
                  ? "Update"
                  : "Create"}{" "}
              Senior
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Senior?"
        description="This will permanently remove the senior record."
      />

      <Dialog
        open={kycApprovalTarget !== null}
        onOpenChange={() => setKycApprovalTarget(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              KYC Approval - {kycApprovalTarget?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-secondary/10 p-4 rounded-lg border border-border/50">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Full Name
                    </p>
                    <p className="text-sm font-medium">
                      {kycApprovalTarget?.full_name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      DOB / Age
                    </p>
                    <p className="text-sm font-medium">
                      {kycApprovalTarget?.dob || "—"} (
                      {kycApprovalTarget?.age || "—"}y)
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Gender
                    </p>
                    <p className="text-sm font-medium">
                      {kycApprovalTarget?.gender || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Phone
                    </p>
                    <p className="text-sm font-medium">
                      {kycApprovalTarget?.user?.phone || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Blood Group
                    </p>
                    <p className="text-sm font-medium">
                      {kycApprovalTarget?.blood_group || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Primary Language
                    </p>
                    <p className="text-sm font-medium">
                      {kycApprovalTarget?.primary_language || "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Address
                    </p>
                    <p className="text-sm font-medium">
                      {kycApprovalTarget?.address || "—"}{" "}
                      {kycApprovalTarget?.landmark
                        ? `(${kycApprovalTarget.landmark})`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  ID Details
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-secondary/10 p-4 rounded-lg border border-border/50">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Aadhaar Number
                    </p>
                    <p className="text-sm font-medium">
                      {kycApprovalTarget?.aadhaar_no || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      PAN Number
                    </p>
                    <p className="text-sm font-medium">
                      {kycApprovalTarget?.pan_no || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <Label className="text-sm font-bold mb-3 block">
                  Update KYC Status
                </Label>
                <Select
                  value={kycApprovalTarget?.kyc_status || ""}
                  onValueChange={(status) => {
                    if (kycApprovalTarget) {
                      updateMutation.mutate(
                        {
                          id: kycApprovalTarget.id,
                          data: { ...kycApprovalTarget, kyc_status: status },
                        },
                        {
                          onSuccess: () =>
                            setKycApprovalTarget((prev) =>
                              prev ? { ...prev, kyc_status: status } : null,
                            ),
                        },
                      );
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Verified">Verified</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Uploaded Documents
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {[
                  {
                    label: "Senior Photo",
                    field: "patient_photo",
                    folder: "seniors",
                  },
                  {
                    label: "Aadhaar Card",
                    field: "aadhaar_photo",
                    folder: "aadhaar",
                  },
                  { label: "PAN Card", field: "pan_photo", folder: "pan" },
                  {
                    label: "Insurance Policy",
                    field: "insurance_policy_photo",
                    folder: "insurance",
                  },
                ].map((doc) => {
                  const filename = kycApprovalTarget?.[
                    doc.field as keyof Senior
                  ] as string;
                  const url = filename
                    ? `https://uditsolutions.in/eldercare/storage/app/public/${doc.folder}/${filename}`
                    : null;

                  return (
                    <div key={doc.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">
                          {doc.label}
                        </Label>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> View Full
                          </a>
                        )}
                      </div>
                      <div className="aspect-[16/9] rounded-lg border border-border/50 bg-secondary/5 overflow-hidden flex items-center justify-center relative group">
                        {url ? (
                          <img
                            src={url}
                            alt={doc.label}
                            className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                            onClick={() => window.open(url, "_blank")}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://placehold.co/400x225?text=Image+Not+Found";
                            }}
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No document uploaded
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-8 pt-4 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => setKycApprovalTarget(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
