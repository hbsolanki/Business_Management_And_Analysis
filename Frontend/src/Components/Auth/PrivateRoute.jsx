// components/PrivateRoute.js
import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "./auth";

const PrivateRoute = () => {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/owner/registration" />;
};

export default PrivateRoute;
