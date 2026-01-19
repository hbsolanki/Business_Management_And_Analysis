import { jwtDecode } from "jwt-decode";
import { tokenService } from "@/services/tokenService";

export const getToken = () => tokenService.getAccessToken();

export const isAuthenticated = () => {
    const token = getToken();
    if (token) {
        try {
            const decodedToken = jwtDecode(token);
            // Optional: Check expiration
            const currentTime = Date.now() / 1000;
            if (decodedToken.exp < currentTime) {
                return false;
            }
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
