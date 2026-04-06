// Notification mock data
export type NotificationType = "sos" | "task" | "visit" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  priority?: "low" | "medium" | "high";
}

export const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "sos",
    title: "SOS Alert: Mrs. Sharma",
    description: "Manual SOS triggered by Mrs. Sharma in Room 402.",
    timestamp: "2 mins ago",
    isRead: false,
    priority: "high"
  },
  {
    id: "2",
    type: "task",
    title: "Vitals Check Overdue",
    description: "Morning vitals for Mr. Kapoor are overdue by 30 minutes.",
    timestamp: "15 mins ago",
    isRead: false,
    priority: "medium"
  },
  {
    id: "3",
    type: "visit",
    title: "New Visit Scheduled",
    description: "Care Manager Anjali has scheduled a clinic visit for tomorrow at 10:00 AM.",
    timestamp: "1 hour ago",
    isRead: false,
    priority: "low"
  },
  {
    id: "4",
    type: "system",
    title: "System Update Complete",
    description: "The platform has been updated to version 1.2.5. Check out the new reports module.",
    timestamp: "3 hours ago",
    isRead: true,
    priority: "low"
  },
  {
    id: "5",
    type: "task",
    title: "Medication Reminder",
    description: "Afternoon medication for Mrs. Gupta needs to be administered.",
    timestamp: "5 hours ago",
    isRead: true,
    priority: "medium"
  }
];
