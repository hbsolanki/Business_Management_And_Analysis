import { Navigate, Outlet } from "react-router-dom";
import { decodedTokenAndGetInfo } from "./auth";

function EmployeeRoutes() {
  const data = decodedTokenAndGetInfo();
  return data.type === "owner" ? <Outlet /> : <Navigate to="/employee/:oeid" />;
}

export default EmployeeRoutes;
