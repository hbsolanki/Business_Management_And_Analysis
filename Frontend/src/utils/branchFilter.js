/**
 * Utility to filter branches based on user role and assigned works for specific modules.
 */

/**
 * Resolves a branch ID from various formats (object, string, number).
 */
export const resolveBranchId = (branch) => {
    if (!branch && branch !== 0) return null;
    if (typeof branch === "object") {
        return branch.id ?? branch.branch_id ?? null;
    }
    return branch;
};

/**
 * Extracts assigned branches for a specific work type from the user profile.
 * 
 * @param {Object} profile - User profile from Redux or API
 * @param {string} workType - Work type to filter by (e.g., 'INVENTORY', 'ANALYTICS', 'INVOICE', 'SUPPLIER')
 * @returns {Array} List of {id, name, is_default} objects
 */
export const getAssignedBranchesForWork = (profile, workType) => {
    if (!profile) return [];
    
    const role = String(profile.role || "").toUpperCase();
    if (role !== "MANAGER" && role !== "EMPLOYEE") {
        return []; // Owners see everything, no need to restrict
    }

    const assignedWorks = profile.assigned_works || [];
    if (!Array.isArray(assignedWorks)) return [];

    const branches = [];
    assignedWorks.forEach(work => {
        if (work.work_type === workType) {
            const id = work.branch_id || work.branch;
            if (id || id === 0) {
                branches.push({
                    id: String(id),
                    name: work.branch_name || `Branch #${id}`,
                    is_default: false, // We don't know the default from assigned_works easily
                });
            }
        }
    });

    // Remove duplicates
    const seen = new Set();
    return branches.filter(b => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
    });
};

/**
 * Filters a full list of branches based on the assigned branches for a role.
 * 
 * @param {Array} allBranches - Full list of branch objects from /business/branch/
 * @param {Array} assignedBranches - Result from getAssignedBranchesForWork
 * @returns {Array} Filtered list of branches
 */
export const filterBranchesForRole = (allBranches, assignedBranches) => {
    if (!assignedBranches || assignedBranches.length === 0) return allBranches;
    
    const assignedIds = new Set(assignedBranches.map(b => String(b.id)));
    return allBranches.filter(b => assignedIds.has(String(b.id)));
};
