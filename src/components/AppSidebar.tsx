import {
  LayoutDashboard, Users, Heart, UserCog, Building2, ClipboardList,
  Calendar, Activity, AlertTriangle, BarChart3, Settings, LogOut, CalendarDays, Quote, Pill
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/context/AuthContext";
import { canView, getModuleForUrl } from "@/lib/permissions";
import logo from "@/assets/logo.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Relatives", url: "/relatives", icon: Heart },
  { title: "Care Managers", url: "/care-managers", icon: UserCog },
  { title: "Vendors", url: "/vendors", icon: Building2 },
  { title: "Tasks", url: "/tasks", icon: ClipboardList },
  { title: "Visits", url: "/visits", icon: Calendar },
  { title: "Vitals", url: "/vitals", icon: Activity },
  { title: "Medications", url: "/medications", icon: Pill },
  { title: "Emergencies", url: "/emergencies", icon: AlertTriangle },
  { title: "Events", url: "/events", icon: CalendarDays },
  { title: "Quotes", url: "/quotes", icon: Quote },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { logout, user, role } = useAuth();

  const visibleItems = navItems.filter(item => {
    const module = getModuleForUrl(item.url);
    return module ? canView(role, module) : true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <img src={logo} alt="Pranyaas" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-primary">Pranyaas</span>
              <span className="text-[10px] text-muted-foreground">Care For Everyone</span>
            </div>
          </div>
        ) : (
          <img src={logo} alt="Pranyaas" className="h-8 w-8 object-contain mx-auto" />
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground px-3 truncate">{user?.email}</div>
            <button
              onClick={logout}
              className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
