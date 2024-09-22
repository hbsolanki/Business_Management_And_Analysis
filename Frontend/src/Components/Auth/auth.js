import { jwtDecode } from "jwt-decode";
export const getToken = () => localStorage.getItem("token");

export const isAuthenticated = () => {
  const token = getToken();
  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      // You can perform additional checks on decodedToken here
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

      // Now you can access the username or any other information from the token payload
      const username =
        decodedToken.username || decodedToken.sub || decodedToken.email;

      return username;
    } catch (error) {
      return false;
    }
  }
  return false;
};
