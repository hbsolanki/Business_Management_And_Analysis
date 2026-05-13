import { useEffect, useState, lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { managerService } from "@/features/manager/services/managerService";
import { branchService } from "@/features/business/services/branchService";
import OwnerHeader from "@/components/layout/OwnerHeader";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { FaUserTie, FaCodeBranch } from "react-icons/fa";
import { toast } from "react-hot-toast";

const UserList = lazy(() => import("@/components/ui/UserList"));
const Modal = lazy(() => import("@/components/ui/Modal"));

export default function ManagerList() {
  const { profile } = useSelector((state) => state.user);
  const [managers, setManagers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [managerToDelete, setManagerToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const navigate = useNavigate();

  /* ---------------- Fetch Managers ---------------- */
  useEffect(() => {
    async function fetchBranches() {
      setFetchingBranches(true);
      try {
        const res = await branchService.list();
        let branchList = [];
        if (Array.isArray(res.data)) {
          branchList = res.data;
        } else if (res.data && Array.isArray(res.data.results)) {
          branchList = res.data.results;
        }

        if (branchList.length > 0) {
          setBranches(branchList);
          const mainBranch = branchList.find(b => b.is_default) || branchList[0];

          const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
          if (roleStr === "OWNER") {
            setSelectedBranch(""); 
          } else {
            // Robustly handle assigned_branches, profile.branch as array, object or ID
            const branchData = (profile?.assigned_branches?.length > 0) 
              ? profile.assigned_branches 
              : profile?.branch;
            const branchId = Array.isArray(branchData)
              ? branchData[0]?.id
              : (typeof branchData === 'object' ? branchData?.id : branchData);
            setSelectedBranch(String(branchId || ""));
          }
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setFetchingBranches(false);
      }
    }
    fetchBranches();
  }, []);

  useEffect(() => {
    async function fetchManagers() {
      setLoading(true);
      try {
        const params = { branch_id: selectedBranch || undefined };

        const res = await managerService.getAll(params);
        let data = [];
        if (Array.isArray(res.data)) {
          data = res.data;
        } else if (res.data && Array.isArray(res.data.results)) {
          data = res.data.results;
        }

        // Client-side filtering to ensure only MANAGERS are shown
        const filteredManagers = data.filter(u => {
          const roleStr = typeof u.role === 'object' ? u.role.role : u.role;
          return roleStr === "MANAGER";
        });
        setManagers(filteredManagers);
      } catch (err) {
        console.error("Failed to fetch managers", err);
      } finally {
        setLoading(false);
      }
    }

    fetchManagers();
  }, [selectedBranch]);

  /* ---------------- Handlers ---------------- */
  const handleDelete = async () => {
    try {
      await managerService.delete(managerToDelete);
      setManagers((prev) =>
        prev.filter((m) => m.id !== managerToDelete)
      );
      setManagerToDelete(null);
      toast.success("Manager deleted successfully");
    } catch {
      toast.error("Failed to delete manager");
    }
  };

  const toggleManagerStatus = async (user) => {
    try {
      const newStatus = user.is_active === false ? true : false;
      const res = await managerService.update(user.id, { is_active: newStatus });
      toast.success(`Manager marked as ${newStatus ? 'Active' : 'Inactive'}`);
      setManagers((prev) =>
        prev.map((e) => e.id === user.id ? { ...e, is_active: newStatus, ...res.data } : e)
      );
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.detail
        || err.response?.data?.message
        || "Failed to update manager status";
      toast.error(errorMessage);
    }
  };

  const handleView = (id) => {
    navigate(`/manager/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/manager/${id}/edit`);
  };

  const handleChat = (id) => {
    navigate(`/chat?userId=${id}`);
  };

  return (
    <>
      <OwnerHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <FaUserTie className="text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Managers</h1>
              <p className="text-slate-500 mt-1">
                Oversee leadership access, profiles, and availability.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Branch Filter */}
            <div className="relative min-w-[200px]">
              <FaCodeBranch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-900 transition-all appearance-none cursor-pointer shadow-sm"
                disabled={fetchingBranches}
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} {b.is_default ? "(Main)" : ""}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>

            <Link
              to="/manager/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-slate-200"
            >
              <UserPlusIcon className="h-5 w-5" />
              Add Manager
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900"></div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Loading managers...</p>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900"></div>
              </div>
            }
          >
            <UserList
              users={managers}
              type="MANAGER"
              onView={handleView}
              onEdit={handleEdit}
              onChat={handleChat}
              onToggleStatus={toggleManagerStatus}
              onDelete={(id) => setManagerToDelete(id)}
              emptyText="No managers found. Add a manager to help oversee operations."
            />
          </Suspense>
        )}
      </main>

      {/* ---------------- Delete Modal ---------------- */}
      <Suspense fallback={null}>
        <Modal
          isOpen={!!managerToDelete}
          onClose={() => setManagerToDelete(null)}
          title="Delete Manager"
          message="Are you sure you want to delete this manager?"
          onConfirm={handleDelete}
          confirmText="Delete"
          cancelText="Cancel"
          icon={FaUserTie}
          type="danger"
        />
      </Suspense>
    </>
  );
}
