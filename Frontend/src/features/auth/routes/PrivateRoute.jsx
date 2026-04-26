import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { isAuthenticated } from "../utils/authUtils";
import { tokenService } from "@/services/tokenService";

const normalizeWorkItem = (item) => {
    if (!item && item !== 0) return null;
    if (typeof item === "string") return item.trim().toLowerCase();
    if (typeof item === "object") {
        const value = item.work_type || item.value || item.name || item.work || item.code || item.label;
        return value ? String(value).trim().toLowerCase() : null;
    }
    return String(item).trim().toLowerCase();
};

const parseWorkList = (value) => {
    if (!value && value !== 0) return [];
    let list = [];
    if (Array.isArray(value)) {
        list = value;
    } else if (typeof value === "string") {
        const raw = value.trim();
        if (!raw) return [];
        if (raw.startsWith("[") && raw.endsWith("]")) {
            try {
                const parsed = JSON.parse(raw);
                list = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                list = raw.split(",");
            }
        } else {
            list = raw.split(",");
        }
    } else {
        list = [value];
    }
    return list.map(normalizeWorkItem).filter(Boolean);
};

const WORK_ALIASES = {
    product: ["product", "products"],
    inventory: ["inventory", "inventories", "stock", "stocks"],
    invoice: ["invoice", "invoices"],
    analytics: ["analytics", "analysis"],
    supplier: ["supplier", "suppliers", "purchase", "procurement"],
};

const hasWorkPermission = (workSet, requiredWork) => {
    if (!requiredWork) return true;
    const normalizedRequired = String(requiredWork).toLowerCase();
    const accepted = WORK_ALIASES[normalizedRequired] || [normalizedRequired];
    return accepted.some((workKey) => workSet.has(workKey));
};

const PrivateRoute = ({ allowedRoles = [], requiredWork = null }) => {
    const isAuth = isAuthenticated();
    const userProfile = useSelector((state) => state.user.profile);
    const userRole = (tokenService.getRole() || "").toUpperCase();
    const allowedRoleSet = new Set(allowedRoles.map((role) => String(role).toUpperCase()));

    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoleSet.has(userRole)) {
        return <Navigate to="/404" replace />;
    }

    // Work-based permission check for Employees
    if (userRole === "EMPLOYEE" && requiredWork) {
        const workSet = new Set([
            ...parseWorkList(tokenService.getWork()),
            ...parseWorkList(userProfile?.assigned_works),
            ...parseWorkList(userProfile?.work),
        ]);

        if (!hasWorkPermission(workSet, requiredWork)) {
            return <Navigate to="/404" replace />;
        }
    }

    return <Outlet />;
};

export default PrivateRoute;
