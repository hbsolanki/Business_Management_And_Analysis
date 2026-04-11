import { Navigate, Outlet } from "react-router-dom";
import { decodedTokenAndGetInfo, isAuthenticated, getLandingPath } from "../utils/authUtils";
import { tokenService } from "@/services/tokenService";

const PublicRoute = () => {
    const userInfo = decodedTokenAndGetInfo();

    if (isAuthenticated() && userInfo) {
        // User is authenticated, redirect using smart redirection
        const storedProfile = JSON.parse(localStorage.getItem("user_profile") || "{}");
        const { path } = getLandingPath(storedProfile);
        return <Navigate to={path} replace />;
    }

    return <Outlet />;
};

export default PublicRoute;
