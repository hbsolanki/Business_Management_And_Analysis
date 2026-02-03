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

  if (loading) {
    return (
      <>
        <OwnerHeader />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <OwnerHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ---------------- Top Bar ---------------- */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Managers</h1>
            <p className="text-gray-500 mt-1">Oversee your management team</p>
          </div>

          <Link
            to="/manager/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
          >
            <UserPlusIcon className="h-5 w-5" />
            Add Manager
          </Link>
        </div>

        {/* ---------------- User List ---------------- */}
        {/* ---------------- User List ---------------- */}
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
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
      </div>

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


