// Role-based permissions matrix
// Access levels: "full" = CRUD, "view" = read-only, "none" = hidden

export type AccessLevel = "full" | "view" | "none";

export type AppModule =
  | "dashboard" | "seniors" | "relatives" | "care-managers" | "vendors"
  | "tasks" | "visits" | "vitals" | "emergencies" | "reports" | "settings" | "events" | "quotes" | "medications" | "plan-service-requests";

export type AppRole = "ADMIN" | "CARE_MANAGER" | "SENIOR" | "SENIOR_RELATIVE";

const permissionsMatrix: Record<AppRole, Record<AppModule, AccessLevel>> = {
  ADMIN: {
    dashboard: "view",
    seniors: "full",
    relatives: "full",
    "care-managers": "full",
    vendors: "full",
    tasks: "full",
    visits: "full",
    vitals: "view",
    emergencies: "full",
    reports: "full",
    settings: "full",
    events: "full",
    quotes: "full",
    medications: "full",
    "plan-service-requests": "full",
  },
  CARE_MANAGER: {
    dashboard: "view",
    seniors: "view",
    relatives: "none",
    "care-managers": "view",
    vendors: "view",
    tasks: "full",
    visits: "full",
    vitals: "full",
    emergencies: "full",
    reports: "none",
    settings: "view",
    events: "none",
    quotes: "none",
    medications: "full",
    "plan-service-requests": "full",
  },
  SENIOR: {
    dashboard: "view",
    seniors: "view",
    relatives: "view",
    "care-managers": "view",
    vendors: "view",
    tasks: "view",
    visits: "view",
    vitals: "view",
    emergencies: "full",
    reports: "none",
    settings: "view",
    events: "none",
    quotes: "none",
    medications: "view",
    "plan-service-requests": "full",
  },
  SENIOR_RELATIVE: {
    dashboard: "view",
    seniors: "view",
    relatives: "view",
    "care-managers": "view",
    vendors: "view",
    tasks: "view",
    visits: "view",
    vitals: "view",
    emergencies: "view",
    reports: "none",
    settings: "view",
    events: "none",
    quotes: "none",
    medications: "view",
    "plan-service-requests": "view",
  },
};

export function getAccess(role: string | null, module: AppModule): AccessLevel {
  const r = (role || "SENIOR") as AppRole;
  return permissionsMatrix[r]?.[module] ?? "none";
}

export function canView(role: string | null, module: AppModule): boolean {
  return getAccess(role, module) !== "none";
}

export function canEdit(role: string | null, module: AppModule): boolean {
  return getAccess(role, module) === "full";
}

// Map sidebar URLs to modules
const urlToModule: Record<string, AppModule> = {
  "/": "dashboard",
  "/seniors": "seniors",
  "/relatives": "relatives",
  "/care-managers": "care-managers",
  "/vendors": "vendors",
  "/tasks": "tasks",
  "/visits": "visits",
  "/vitals": "vitals",
  "/emergencies": "emergencies",
  "/reports": "reports",
  "/settings": "settings",
  "/events": "events",
  "/quotes": "quotes",
  "/medications": "medications",
  "/plan-service-requests": "plan-service-requests",
};

export function getModuleForUrl(url: string): AppModule | undefined {
  return urlToModule[url];
}
