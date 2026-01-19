import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { employeeService } from "@/features/employee/services/employeeService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import Modal from "@/components/ui/Modal";
import UserList from "@/components/ui/UserList";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { FaIdCard } from "react-icons/fa";

function EmployeeManage() {
  /* ---------------- State & Hooks ---------------- */
  const [employees, setEmployees] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    employeeService.getAll().then((res) => setEmployees(res.data));
  }, []);

  /* ---------------- Handlers ---------------- */
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

  return (
    <>
      <ProtectedHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Employees</h1>
            <p className="text-gray-500 mt-1">Manage your team members</p>
          </div>

          <Link
            to="/employee/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
          >
            <UserPlusIcon className="h-5 w-5" />
            Add Employee
          </Link>
        </div>

        <UserList
          users={employees}
          type="EMPLOYEE"
          onView={handleView}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteId(id)}
          emptyText="No employees found. Start by adding a new team member."
        />
      </div>

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
    </>
  );
}

export default EmployeeManage;
