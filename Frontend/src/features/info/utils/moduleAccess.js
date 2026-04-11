export function parseWork(workValue) {
    if (!workValue) return new Set();

    let items = [];
    if (Array.isArray(workValue)) {
        items = workValue;
    } else {
        const rawValue = `${workValue}`.trim();
        if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
            try {
                const parsed = JSON.parse(rawValue);
                if (Array.isArray(parsed)) {
                    items = parsed;
                }
            } catch {
                items = rawValue.split(",");
            }
        } else {
            items = rawValue.split(",").filter(Boolean);
        }
    }

    return new Set(
        items.map((item) => {
            if (typeof item === "object" && item !== null) {
                return String(item.work_type || item.work || "").toLowerCase();
            }
            return String(item).trim().toLowerCase();
        }).filter(Boolean)
    );
}

export function resolveModulePath(module, role) {
    if (module.paths && role && module.paths[role]) {
        return module.paths[role];
    }
    return module.path || "/info";
}

export function isModuleVisibleForRole(module, role) {
    const effectiveRole = role || "PUBLIC";
    return module.roles.includes(effectiveRole);
}

export function isModuleAccessible(module, role, workSet) {
    if (!isModuleVisibleForRole(module, role)) return false;
    if (!module.requiredWork) return true;

    const effectiveRole = role || "PUBLIC";
    if (effectiveRole === "OWNER" || effectiveRole === "MANAGER") {
        return true;
    }
    return workSet.has(module.requiredWork.toLowerCase());
}

export function moduleAvailabilityLabel(module, role, workSet) {
    if (!isModuleVisibleForRole(module, role)) {
        return "Not available for your role";
    }
    if (isModuleAccessible(module, role, workSet)) {
        return "Available";
    }
    return `Requires ${module.requiredWork} permission`;
}
