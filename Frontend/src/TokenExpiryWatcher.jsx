// Components/Auth/TokenExpiryWatcher.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isTokenExpired } from "./Components/Auth/checkTokenExpiry";

function TokenExpiryWatcher() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isTokenExpired()) {
      localStorage.removeItem("token");
      localStorage.removeItem("type");
      localStorage.removeItem("token_created_at");
      navigate("/");
    }
  }, [navigate]);

  return null; // This component just handles the redirect
}

export default TokenExpiryWatcher;
