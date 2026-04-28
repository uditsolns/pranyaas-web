// Role-based permissions matrix
// Access levels: "full" = CRUD, "view" = read-only, "none" = hidden

export type AccessLevel = "full" | "view" | "none";

export type AppModule =
  | "dashboard" | "patients" | "relatives" | "care-managers" | "vendors"
  | "tasks" | "visits" | "vitals" | "emergencies" | "reports" | "settings" | "events" | "quotes" | "medications";

export type AppRole = "ADMIN" | "CARE_MANAGER" | "PATIENT" | "PATIENT_RELATIVE";

const permissionsMatrix: Record<AppRole, Record<AppModule, AccessLevel>> = {
  ADMIN: {
    dashboard: "view",
    patients: "full",
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
  },
  CARE_MANAGER: {
    dashboard: "view",
    patients: "view",
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
  },
  PATIENT: {
    dashboard: "view",
    patients: "view",
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
  },
  PATIENT_RELATIVE: {
    dashboard: "view",
    patients: "view",
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
  },
};

export function getAccess(role: string | null, module: AppModule): AccessLevel {
  const r = (role || "PATIENT") as AppRole;
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
  "/patients": "patients",
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
};

export function getModuleForUrl(url: string): AppModule | undefined {
  return urlToModule[url];
}
