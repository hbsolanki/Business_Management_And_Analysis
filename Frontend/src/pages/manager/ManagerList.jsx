import { useEffect, useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { managerService } from "@/features/manager/services/managerService";
import OwnerHeader from "@/components/layout/OwnerHeader";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { FaUserTie } from "react-icons/fa";

const UserList = lazy(() => import("@/components/ui/UserList"));
const Modal = lazy(() => import("@/components/ui/Modal"));

export default function ManagerList() {
  const [managers, setManagers] = useState([]);
  const [managerToDelete, setManagerToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* ---------------- Fetch Managers ---------------- */
  useEffect(() => {
    async function fetchManagers() {
      try {
        const res = await managerService.getAll();
        setManagers(res.data);
      } catch (err) {
        console.error("Failed to fetch managers", err);
      } finally {
        setLoading(false);
      }
    }

    fetchManagers();
  }, []);

  /* ---------------- Handlers ---------------- */
  const handleDelete = async () => {
    try {
      await managerService.delete(managerToDelete);
      setManagers((prev) =>
        prev.filter((m) => m.id !== managerToDelete)
      );
      setManagerToDelete(null);
    } catch (err) {
      alert("Failed to delete manager");
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

          <Link
            to="/manager/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition"
          >
            <UserPlusIcon className="h-5 w-5" />
            Add Manager
          </Link>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
              <p className="text-slate-500 text-sm font-medium">Loading managers...</p>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
              </div>
            }
          >
            <UserList
              users={managers}
              type="MANAGER"
              onView={handleView}
              onEdit={handleEdit}
              onChat={handleChat}
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
