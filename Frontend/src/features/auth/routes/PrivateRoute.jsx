import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../utils/authUtils";
import { tokenService } from "@/services/tokenService";

const PrivateRoute = ({ allowedRoles = [], requiredWork = null }) => {
    const isAuth = isAuthenticated();
    const userRole = tokenService.getRole();
    const userWork = tokenService.getWork();

    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return <Navigate to="/404" replace />;
    }

    if (userRole === "EMPLOYEE" && requiredWork) {
        if (!userWork || !userWork.toLowerCase().includes(requiredWork.toLowerCase())) {
            return <Navigate to="/404" replace />;
        }
    }

    return <Outlet />;
};

export default PrivateRoute;
