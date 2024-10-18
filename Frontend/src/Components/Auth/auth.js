import { jwtDecode } from "jwt-decode";
export const getToken = () => localStorage.getItem("token");

export const isAuthenticated = () => {
  const token = getToken();
  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      return !!decodedToken;
    } catch (error) {
      console.error("Invalid token:", error);
      return false;
    }
  }
  return false;
};

export const isAuthenticatedGetUsername = () => {
  const token = getToken();
  if (token) {
    try {
      const decodedToken = jwtDecode(token);

      const username =
        decodedToken.username || decodedToken.sub || decodedToken.email;

      return username;
    } catch (error) {
      return false;
    }
  }
  return false;
};

export const decodedTokenAndGetInfo = () => {
  const token = getToken();
  if (token) {
    try {
      const decodedToken = jwtDecode(token);

      return decodedToken;
    } catch (error) {
      return false;
    }
  }
  return false;
};
