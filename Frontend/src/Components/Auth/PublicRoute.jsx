// components/PrivateRoute.js
import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticatedGetUsername } from "./auth";

const PublicRoute = () => {
  let username = isAuthenticatedGetUsername();
  return username ? <Navigate to={`/owner/home`} /> : <Outlet />;
};

export default PublicRoute;
