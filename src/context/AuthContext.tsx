import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginApi, logoutApi, setToken, getToken, clearToken, ApiUser } from "@/lib/api";

interface AuthContextType {
  user: ApiUser | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [role, setRole] = useState<string | null>(localStorage.getItem("auth_role"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check existing token on mount
    const existingToken = getToken();
    const savedUser = localStorage.getItem("auth_user");
    const savedRole = localStorage.getItem("auth_role");
    if (existingToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setTokenState(existingToken);
        setRole(savedRole);
      } catch {
        clearToken();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginApi(email, password);
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    setRole(data.role);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    localStorage.setItem("auth_role", data.role);
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
    setTokenState(null);
    setRole(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_role");
  };

  return (
    <AuthContext.Provider value={{ user, token, role, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
