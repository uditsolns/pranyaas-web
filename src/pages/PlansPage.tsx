import { useState } from "react";
import { useApiList } from "@/hooks/useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Check, Shield, Package, Pencil, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export interface PlanFeature {
  id: number;
  plan_master_id: string | number;
  feature_key: string;
  is_enabled: string | number;
}

export interface Plan {
  id: number;
  plan_name: string;
  description: string;
  price: string;
  duration_days: number;
  features: PlanFeature[];
}

const formatFeatureName = (key: string) => {
  return key.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

export default function PlansPage() {
  const { data: apiPlans, isLoading } = useApiList<Plan>("plan-features", "/plan-features");
  
  const queryClient = useQueryClient();
  
  const patchStatusMutation = useMutation({
    mutationFn: (data: { features: { id: number; is_enabled: number }[] }) => api.patch("/plan-features/status", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-features"] });
      toast.success("Features updated successfully");
      setEditingPlan(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update features");
    }
  });

  const addFeatureMutation = useMutation({
    mutationFn: (data: { plan_master_id: number; feature_key: string; is_enabled: number }) => api.post("/plan-features", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-features"] });
      setNewFeatureKey("");
      toast.success("Feature added successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add feature");
    }
  });

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingFeaturesList, setEditingFeaturesList] = useState<{ id: number; is_enabled: number; feature_key: string }[]>([]);
  const [newFeatureKey, setNewFeatureKey] = useState("");
  const [newFeatureEnabled, setNewFeatureEnabled] = useState(true);

  const plans = apiPlans || [];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">No Plans Available</h2>
        <p className="text-muted-foreground">We couldn't load any care plans at the moment. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Care Plans</h1>
          <p className="text-muted-foreground mt-2">
            Select the best plan that fits your needs. Our comprehensive care plans are designed to provide peace of mind.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const descBullets = plan.description.split(",").map(b => b.trim()).filter(b => b);
          const enabledFeatures = (plan.features || []).filter(f => f.is_enabled === "1" || f.is_enabled === 1);

          return (
            <Card key={plan.id} className="flex flex-col relative overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="text-center pb-8 border-b bg-muted/20 relative">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold mb-2">{plan.plan_name}</CardTitle>
                <div className="flex justify-center items-baseline gap-1">
                  <span className="text-4xl font-extrabold">₹{plan.price}</span>
                  <span className="text-muted-foreground font-medium">/{plan.duration_days} days</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-6 pb-2">
                <div className="mb-6 text-sm text-muted-foreground">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Plan Overview
                  </h4>
                  <ul className="space-y-2">
                    {descBullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" /> Included Features ({enabledFeatures.length})
                  </h4>
                  <div className="h-[250px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-sidebar-border">
                    {enabledFeatures.length > 0 ? enabledFeatures.map((feature) => (
                      <div key={feature.id} className="flex items-start gap-2 text-sm bg-muted/10 p-2 rounded-md">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground font-medium">{formatFeatureName(feature.feature_key)}</span>
                      </div>
                    )) : (
                       <p className="text-sm text-muted-foreground italic pl-2">No features enabled.</p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-6 border-t bg-muted/10">
                <Button 
                  className="w-full h-11 text-base font-semibold" 
                  variant="outline"
                  onClick={() => {
                    setEditingPlan(plan);
                    setEditingFeaturesList(
                      (plan.features || []).map(f => ({
                        id: f.id,
                        is_enabled: (f.is_enabled === "1" || f.is_enabled === 1) ? 1 : 0,
                        feature_key: f.feature_key
                      }))
                    );
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Features
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Features for {editingPlan?.plan_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
            {editingPlan && editingFeaturesList.map((feature) => (
              <div key={feature.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-colors">
                <Label htmlFor={`feature-${feature.id}`} className="flex-1 text-sm font-medium cursor-pointer">
                  {formatFeatureName(feature.feature_key)}
                </Label>
                <Switch 
                  id={`feature-${feature.id}`} 
                  checked={feature.is_enabled === 1} 
                  onCheckedChange={(checked) => setEditingFeaturesList(prev => prev.map(f => f.id === feature.id ? { ...f, is_enabled: checked ? 1 : 0 } : f))}
                />
              </div>
            ))}

            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3">Add New Feature</h4>
              <div className="flex items-center gap-3">
                <Input 
                  placeholder="Feature Key (e.g. video_call)" 
                  value={newFeatureKey} 
                  onChange={(e) => setNewFeatureKey(e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="new-feature-status" className="text-xs">Enabled</Label>
                  <Switch 
                    id="new-feature-status" 
                    checked={newFeatureEnabled} 
                    onCheckedChange={setNewFeatureEnabled}
                  />
                </div>
                <Button 
                  size="sm" 
                  disabled={!newFeatureKey.trim() || addFeatureMutation.isPending}
                  onClick={() => {
                     if (editingPlan) {
                       addFeatureMutation.mutate({
                         plan_master_id: editingPlan.id,
                         feature_key: newFeatureKey.trim(),
                         is_enabled: newFeatureEnabled ? 1 : 0
                       });
                     }
                  }}
                >
                  {addFeatureMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (editingPlan) {
                  patchStatusMutation.mutate({
                    features: editingFeaturesList.map(f => ({ id: f.id, is_enabled: f.is_enabled }))
                  });
                }
              }}
              disabled={patchStatusMutation.isPending}
            >
              {patchStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
