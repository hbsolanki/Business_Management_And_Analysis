import { Navigate, Outlet } from "react-router-dom";
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
            } catch (_error) {
                list = raw.split(",");
            }
        } else if (raw.includes(",")) {
            list = raw.split(",");
        } else {
            list = [raw];
        }
    } else {
        list = [value];
    }

    return list.map(normalizeWorkItem).filter(Boolean);
};

const getProfileWorkList = () => {
    try {
        const rawProfile = localStorage.getItem("user_profile");
        if (!rawProfile) return [];

        const profile = JSON.parse(rawProfile);
        return [
            ...parseWorkList(profile?.assigned_works),
            ...parseWorkList(profile?.work),
        ];
    } catch (_error) {
        return [];
    }
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
    const userRole = (tokenService.getRole() || "").toUpperCase();
    const allowedRoleSet = new Set(allowedRoles.map((role) => String(role).toUpperCase()));
    const workSet = new Set([
        ...parseWorkList(tokenService.getWork()),
        ...getProfileWorkList(),
    ]);

    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoleSet.has(userRole)) {
        return <Navigate to="/404" replace />;
    }

    if (userRole === "EMPLOYEE" && requiredWork) {
        if (!hasWorkPermission(workSet, requiredWork)) {
            return <Navigate to="/404" replace />;
        }
    }

    return <Outlet />;
};

export default PrivateRoute;
