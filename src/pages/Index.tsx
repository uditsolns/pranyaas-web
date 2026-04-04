import { useRole } from "@/context/RoleContext";
import AdminDashboard from "./AdminDashboard";
import CareManagerDashboard from "./CareManagerDashboard";
import PatientDashboard from "./PatientDashboard";

const Index = () => {
  const { role } = useRole();

  if (role === "care_manager") return <CareManagerDashboard />;
  if (role === "patient") return <PatientDashboard />;
  return <AdminDashboard />;
};

export default Index;
