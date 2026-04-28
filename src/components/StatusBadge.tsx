import { cn } from "@/lib/utils";

type StatusType = string;

const statusColors: Record<string, string> = {
  Active: "bg-success/10 text-success",
  "Need Action": "bg-destructive/10 text-destructive",
  "In Progress": "bg-info/10 text-info",
  Completed: "bg-success/10 text-success",
  Scheduled: "bg-primary/10 text-primary",
  Pending: "bg-warning/10 text-warning",
  Overdue: "bg-destructive/10 text-destructive",
  Cancelled: "bg-muted text-muted-foreground",
  Triggered: "bg-destructive/10 text-destructive",
  Acknowledged: "bg-warning/10 text-warning",
  Resolved: "bg-success/10 text-success",
  Inactive: "bg-muted text-muted-foreground",
  "On Leave": "bg-warning/10 text-warning",
  Discharged: "bg-muted text-muted-foreground",
  Low: "bg-success/10 text-success",
  Medium: "bg-warning/10 text-warning",
  High: "bg-accent/10 text-accent",
  Critical: "bg-destructive/10 text-destructive",
  Urgent: "bg-destructive/10 text-destructive",
  "Full Time": "bg-primary/10 text-primary",
  "Part Time": "bg-info/10 text-info",
  Expired: "bg-destructive/10 text-destructive",
  Verified: "bg-success/10 text-success",
};

export function StatusBadge({ status }: { status: StatusType }) {
  // Try exact match, then title case, then first match in a case-insensitive way
  const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  const colorClass = statusColors[status] || statusColors[normalizedStatus] || 
    Object.entries(statusColors).find(([key]) => key.toLowerCase() === status.toLowerCase())?.[1] || 
    "bg-muted text-muted-foreground";

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      colorClass
    )}>
      {status}
    </span>
  );
}
