import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("Pranyaas ElderCare");
  const [email, setEmail] = useState("admin@pranyaas.com");
  const [notifications, setNotifications] = useState({ email: true, sms: true, push: false, emergencyAlerts: true });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="alerts">Vitals Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 max-w-2xl space-y-6">
            <h3 className="text-sm font-semibold text-foreground">Organization</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input value={orgName} onChange={e => setOrgName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Admin Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => toast.success("Settings saved")}>Save Changes</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 max-w-2xl space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>
            {[
              { key: "email" as const, label: "Email Notifications", desc: "Receive email updates for tasks and visits" },
              { key: "sms" as const, label: "SMS Notifications", desc: "Receive SMS for emergency alerts" },
              { key: "push" as const, label: "Push Notifications", desc: "Browser push notifications" },
              { key: "emergencyAlerts" as const, label: "Emergency Alerts", desc: "Critical emergency notifications" },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={notifications[item.key]} onCheckedChange={v => setNotifications(prev => ({ ...prev, [item.key]: v }))} />
              </div>
            ))}
            <div className="flex justify-end">
              <Button onClick={() => toast.success("Notification preferences saved")}>Save</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden max-w-3xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30">
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Parameter</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Unit</th>
                  <th className="text-center text-xs font-medium p-4 text-success">Green</th>
                  <th className="text-center text-xs font-medium p-4 text-warning">Orange</th>
                  <th className="text-center text-xs font-medium p-4 text-destructive">Red</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { param: "Temperature", unit: "°F", green: "97–99", orange: "99–100.4", red: ">100.4" },
                  { param: "Pulse", unit: "bpm", green: "60–100", orange: "50–60 / 100–120", red: "<50 / >120" },
                  { param: "SpO2", unit: "%", green: "95–100", orange: "90–95", red: "<90" },
                  { param: "Blood Pressure (Sys)", unit: "mmHg", green: "90–140", orange: "140–160", red: ">160" },
                  { param: "Sugar (Fasting)", unit: "mg/dL", green: "70–100", orange: "100–126", red: ">126" },
                ].map(row => (
                  <tr key={row.param} className="border-b border-border/50 last:border-0">
                    <td className="p-4 text-sm font-medium text-foreground">{row.param}</td>
                    <td className="p-4 text-sm text-muted-foreground">{row.unit}</td>
                    <td className="p-4 text-sm text-center text-success font-medium">{row.green}</td>
                    <td className="p-4 text-sm text-center text-warning font-medium">{row.orange}</td>
                    <td className="p-4 text-sm text-center text-destructive font-medium">{row.red}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
