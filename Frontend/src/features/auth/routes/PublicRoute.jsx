import { Navigate, Outlet } from "react-router-dom";
import { decodedTokenAndGetInfo, isAuthenticated } from "../utils/authUtils";
import { tokenService } from "@/services/tokenService";

const PublicRoute = () => {
    const userInfo = decodedTokenAndGetInfo();

    if (isAuthenticated() && userInfo) {
        // User is authenticated, redirect to their dashboard

        // Normalize role to lowercase for comparison, handles "OWNER" vs "owner"
        // Use tokenService.getRole() as it is explicitly set on login and might be missing from token payload
        const storedRole = tokenService.getRole();
        const userType = (userInfo.type || userInfo.role || storedRole || "").toLowerCase();

        if (userType === "owner") {
            return <Navigate to="/owner" replace />;
        } else if (userType === "manager") {
            return <Navigate to="/manager" replace />;
        } else {
            // Default to employee
            return <Navigate to="/employee" replace />;
        }
    }

    return <Outlet />;
};

export default PublicRoute;
