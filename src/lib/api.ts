const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://uditsolutions.in/eldercare/public/api";

export function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return {} as T;

  const json = await res.json();
  
  // Unwrap common API envelope patterns: { data: [...] } or { data: { ... } }
  if (json && typeof json === "object" && "data" in json && !Array.isArray(json)) {
    return json.data as T;
  }

  return json as T;
}

export const STORAGE_BASE_URL = "https://uditsolutions.in/eldercare/storage/app/public/events/";

export function getStorageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${STORAGE_BASE_URL}${cleanPath}`;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postFormData: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = getToken();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: formData });
    if (res.status === 401) { clearToken(); window.location.href = "/login"; throw new Error("Unauthorized"); }
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || `API error ${res.status}`); }
    if (res.status === 204) return {} as T;
    const json = await res.json();
    if (json && typeof json === "object" && "data" in json && !Array.isArray(json)) return json.data as T;
    return json as T;
  },
};

// Auth
export interface LoginResponse {
  status: boolean;
  token: string;
  role: string;
  user: ApiUser;
  profile: unknown;
  message?: string;
}

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role_id: string;
  status: string | null;
  created_at: string;
  updated_at: string;
  role?: { id: number; name: string; description: string | null };
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Login failed");
  return data;
}

export async function logoutApi(): Promise<void> {
  await request("/logout", { method: "POST" }).catch(() => {});
  clearToken();
}
