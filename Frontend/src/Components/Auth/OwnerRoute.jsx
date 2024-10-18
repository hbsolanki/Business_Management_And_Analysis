import { Navigate, Outlet } from "react-router-dom";
import { decodedTokenAndGetInfo } from "./auth";

function OwnerRoute() {
  const data = decodedTokenAndGetInfo();

  // Assuming decodedTokenAndGetInfo returns an object containing user info,
  // including the employee ID (oeid).
  const oeid = data?.oeid; // Make sure your token includes this

  return data.type === "owner" ? (
    <Outlet />
  ) : (
    <Navigate to={`/employee/dashboard/${oeid}`} />
  );
}

export default OwnerRoute;
