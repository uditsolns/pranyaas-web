import { useState } from "react";
import { Loader2, Search, Stethoscope, User, Calendar, FileText, Activity } from "lucide-react";
import { useApiList, useApiUpdate } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";

export interface UserDetails {
  id?: number;
  user_id?: string;
  full_name?: string;
  relative_name?: string;
  phone_number?: string;
  email?: string;
  [key: string]: any;
}

export interface BookedService {
  id: number;
  plan_id: string;
  user_id: string;
  user_type: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_details?: UserDetails;
}

export default function BookServicesPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "book-services");
  
  const { data: services = [], isLoading } = useApiList<BookedService>("book-services", "/book-services");
  const { data: plans = [] } = useApiList<any>("plans", "/plans-with-features");
  const updateMutation = useApiUpdate<BookedService>("book-services", "/book-services", "Booked Service");
  
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<BookedService | null>(null);

  const getUserName = (service: BookedService) => {
    if (!service.user_details) return `User #${service.user_id}`;
    if (service.user_type === "patient" && service.user_details.full_name) {
      return service.user_details.full_name;
    }
    if (service.user_type === "relative" && service.user_details.relative_name) {
      return service.user_details.relative_name;
    }
    return `User #${service.user_id}`;
  };

  const getPlanName = (planId: string) => {
    const plan = plans.find((p: any) => String(p.id) === String(planId));
    return plan ? plan.plan_name : planId || "—";
  };

  const filtered = services.filter(s => {
    const name = getUserName(s).toLowerCase();
    const matchesSearch = 
      String(s.id).includes(search) ||
      (s.subject || "").toLowerCase().includes(search.toLowerCase()) ||
      name.includes(search.toLowerCase());
      
    const matchesStatus = filterStatus === "all" || (s.status || "").toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = services.filter(s => (s.status || "").toLowerCase() === "pending").length;
  const completedCount = services.filter(s => (s.status || "").toLowerCase() === "completed" || (s.status || "").toLowerCase() === "done").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <PageHeader 
        title="Booked Services" 
        subtitle="Manage and track requested services by patients and relatives" 
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase">Total Requests</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{services.length}</p>
        </div>
        <div className="bg-warning/5 rounded-xl p-4 border border-warning/20">
          <div className="flex items-center gap-2 mb-1">
            <Stethoscope className="h-4 w-4 text-warning" />
            <span className="text-xs font-medium text-warning uppercase">Pending</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
        </div>
        <div className="bg-success/5 rounded-xl p-4 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-success" />
            <span className="text-xs font-medium text-success uppercase">Completed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{completedCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, subject, or user..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }} 
            className="pl-9" 
          />
        </div>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paged.length === 0 ? (
        <EmptyState 
          title="No service requests found" 
          description="There are no booked services matching your current filters." 
          icon={Stethoscope}
        />
      ) : (
        <div className="space-y-4">
          {paged.map(service => (
            <div key={service.id} className="bg-card rounded-xl p-5 card-shadow border border-border/50">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                
                {/* Left Section */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 hidden sm:block">
                    <Stethoscope className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-lg font-bold text-foreground">{service.subject || "No Subject"}</p>
                      <StatusBadge status={service.status} />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-2xl mb-3">
                      {service.description || "No description provided."}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3.5 h-3.5" />
                        <span className="font-medium text-foreground">{getUserName(service)}</span>
                        <span className="capitalize px-1.5 py-0.5 bg-muted rounded-md text-[10px]">
                          {service.user_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Created: {new Date(service.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Section Actions */}
                <div className="flex flex-col gap-2 w-full md:w-[140px] shrink-0">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { setViewing(service); setDetailOpen(true); }}>
                    View Details
                  </Button>
                  {hasEdit && (
                    <Select 
                      value={service.status || "Pending"} 
                      onValueChange={(v) => {
                        const updatedData = { ...service, status: v };
                        updateMutation.mutate({ id: service.id, data: updatedData });
                      }}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TablePagination 
        page={page} 
        totalPages={totalPages} 
        from={from} 
        to={to} 
        total={total} 
        onPageChange={setPage} 
      />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Service Request Details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Stethoscope className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{viewing.subject || "No Subject"}</p>
                  <StatusBadge status={viewing.status} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {hasEdit ? (
                    <Select 
                      value={viewing.status || "Pending"} 
                      onValueChange={(v) => {
                        const updatedData = { ...viewing, status: v };
                        setViewing(updatedData);
                        updateMutation.mutate({ id: viewing.id, data: updatedData });
                      }}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusBadge status={viewing.status} />
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">
                    {viewing.description || "No description provided."}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Requested By</p>
                  <p className="text-sm font-medium">{getUserName(viewing)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{viewing.user_type}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Contact Info</p>
                  <p className="text-sm font-medium">{viewing.user_details?.phone_number || viewing.user_details?.email || "—"}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{new Date(viewing.created_at).toLocaleString('en-GB')}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-sm font-medium">{viewing.plan_id ? getPlanName(viewing.plan_id) : "—"}</p>
                </div>
              </div>
              
              <div className="flex justify-end mt-4 pt-4 border-t border-border/50">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
