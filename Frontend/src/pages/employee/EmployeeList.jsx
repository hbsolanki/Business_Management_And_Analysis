import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { FaIdCard, FaUsers } from "react-icons/fa";

import { employeeService } from "@/features/employee/services/employeeService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";

const Modal = lazy(() => import("@/components/ui/Modal"));
const UserList = lazy(() => import("@/components/ui/UserList"));

function EmployeeManage() {
  const [employees, setEmployees] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    employeeService.getAll().then((res) => setEmployees(res.data));
  }, []);

  const handleDelete = async () => {
    await employeeService.delete(deleteId);
    setEmployees((prev) => prev.filter((e) => e.id !== deleteId));
    setDeleteId(null);
  };

  const handleView = (id) => {
    navigate(`/employee/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/employee/${id}/edit`);
  };

  const handleChat = (id) => {
    navigate(`/chat?userId=${id}`);
  };

  return (
    <>
      <ProtectedHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <FaUsers className="text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Employees</h1>
              <p className="text-slate-500 mt-1">
                Manage team members, contact details, and profiles.
              </p>
            </div>
          </div>

          <Link
            to="/employee/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition"
          >
            <UserPlusIcon className="h-5 w-5" />
            Add Employee
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
          }
        >
          <UserList
            users={employees}
            type="EMPLOYEE"
            onView={handleView}
            onEdit={handleEdit}
            onChat={handleChat}
            onDelete={(id) => setDeleteId(id)}
            emptyText="No employees found. Start by adding a new team member."
          />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Modal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="Delete Employee"
          message="Are you sure you want to delete this employee?"
          onConfirm={handleDelete}
          confirmText="Delete"
          cancelText="Cancel"
          icon={FaIdCard}
          type="danger"
        />
      </Suspense>
    </>
  );
}

export default EmployeeManage;
