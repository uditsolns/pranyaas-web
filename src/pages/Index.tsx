import { useRole } from "@/context/RoleContext";
import AdminDashboard from "./AdminDashboard";
import CareManagerDashboard from "./CareManagerDashboard";
import SeniorDashboard from "./SeniorDashboard";

const Index = () => {
  const { role } = useRole();

  if (role === "care_manager") return <CareManagerDashboard />;
  if (role === "senior") return <SeniorDashboard />;
  return <AdminDashboard />;
};

export default Index;
