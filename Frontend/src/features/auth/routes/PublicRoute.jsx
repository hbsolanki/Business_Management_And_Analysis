import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { isAuthenticated, getLandingPath } from "../utils/authUtils";

const PublicRoute = () => {
    const profile = useSelector((state) => state.user.profile);
    const isAuth = isAuthenticated();

    if (isAuth && profile) {
        // User is authenticated and profile is loaded, redirect to their dashboard
        const { path } = getLandingPath(profile);
        // Only redirect if we are not already at the path
        return <Navigate to={path} replace />;
    }

    return <Outlet />;
};

export default PublicRoute;
