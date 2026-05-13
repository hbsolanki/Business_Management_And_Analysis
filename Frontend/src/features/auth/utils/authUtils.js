import { jwtDecode } from "jwt-decode";
import { tokenService } from "@/services/tokenService";

export const getToken = () => tokenService.getAccessToken();

const isTokenExpired = (token) => {
    try {
        const decodedToken = jwtDecode(token);
        if (!decodedToken?.exp) return false;
        const currentTime = Date.now() / 1000;
        return decodedToken.exp < currentTime;
    } catch {
        return true;
    }
};

export const isAuthenticated = () => {
    const accessToken = tokenService.getAccessToken();
    const refreshToken = tokenService.getRefreshToken();

    if (!accessToken && !refreshToken) return false;

    // Valid access token means authenticated.
    if (accessToken && !isTokenExpired(accessToken)) {
        return true;
    }

    // Access may be expired; keep session alive if refresh still valid.
    if (refreshToken && !isTokenExpired(refreshToken)) {
        return true;
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
        } catch {
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
        } catch {
            return false;
        }
    }
    return false;
};

/**
 * Determines the best landing page for a user based on their roles and work assignments.
 * @param {Object} profile - The user profile object.
 * @returns {Object} { path: string, branchId: string|null }
 */
export const getLandingPath = (profile) => {
    if (!profile) return { path: "/", branchId: null };

    const roleValue = profile.role || profile.user?.role;
    const assignedWorksList = profile.assigned_works || profile.user?.assigned_works || [];

    const roleStr = typeof roleValue === "object" ? (roleValue?.role || "") : (roleValue || "");
    const role = String(roleStr).toUpperCase();

    if (role === "OWNER") {
        return { path: "/owner", branchId: null };
    }

    // For Managers and Employees, check assigned_works
    if (Array.isArray(assignedWorksList) && assignedWorksList.length > 0) {
        // Find the first work type, handling both strings and objects
        const firstWork = assignedWorksList[0];
        const workTypeRaw = typeof firstWork === 'object' ? (firstWork.work_type || "") : String(firstWork);
        const workType = workTypeRaw.toUpperCase();
        
        const branchId = profile.default_branch_id || profile.user?.default_branch_id || null;

        const pathMap = {
            "INVOICE": "/invoice/new",
            "INVENTORY": "/inventory",
            "PRODUCT": "/product",
            "SUPPLIER": "/supplier",
            "ANALYTICS": "/analytics",
        };

        if (pathMap[workType]) {
            return { path: pathMap[workType], branchId };
        }
    }

    // Fallbacks if no specific work area is matched
    if (role === "MANAGER") return { path: "/manager", branchId: null };
    if (role === "EMPLOYEE") return { path: "/employee", branchId: null };
    if (role === "OWNER") return { path: "/owner", branchId: null };

    // New users or owners without a business yet should go to business creation
    return { path: "/business/new", branchId: null };
};
