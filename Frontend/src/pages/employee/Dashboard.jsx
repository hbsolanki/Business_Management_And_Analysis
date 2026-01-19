import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { employeeService } from "@/features/employee/services/employeeService";
import EmployeeHeader from "@/components/layout/EmployeeHeader";

import {
  FaUser,
  FaEdit,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaBriefcase,
  FaCheckCircle,
} from "react-icons/fa";

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    employeeService
      .getById(localStorage.getItem("id"))
      .then((res) => {
        setEmployee(res.data)
        localStorage.setItem("work", res.data.work)
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        No employee data found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeHeader />

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <img src={employee.profile_picture} alt={employee.first_name[0] + employee.last_name[0]} className="h-24 w-24 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-4xl font-bold shadow-lg" />

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Hello, {employee.first_name}!
              </h1>
              <p className="text-gray-500 mt-1 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">Employee</span>
                • {employee.email || "No Email"}
              </p>
            </div>
          </div>
          <Link
            to="/employee/edit"
            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 hover:text-green-600 transition shadow-sm flex items-center gap-2"
          >
            <FaEdit /> Edit Profile
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FaUser className="text-blue-500" /> Personal Information
            </h2>
            <div className="space-y-6">
              <InfoRow icon={FaUser} label="Full Name" value={`${employee.first_name} ${employee.last_name}`} />
              <InfoRow icon={FaPhone} label="Mobile" value={employee.mobile_number} />
              <InfoRow icon={FaEnvelope} label="Email" value={employee.email} />
              <InfoRow icon={FaCalendarAlt} label="Date Joined" value={new Date(employee.date_joined).toLocaleDateString()} />
            </div>
          </div>

          {/* Work & Business */}
          <div className="space-y-8">
            {/* Work Card */}
            {employee.work && (
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-md p-8 text-white relative overflow-hidden">
                <FaBriefcase className="absolute top-4 right-4 text-white opacity-20 text-6xl" />
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FaCheckCircle /> Assigned Work
                </h2>
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-blue-100 text-sm mb-1">Current Designation</p>
                  <p className="text-2xl font-bold">{employee.work}</p>
                </div>
                <div className="mt-4">
                  <Link
                    to={`/${employee.work.toLowerCase()}`}
                    className="inline-block bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
                  >
                    Go to Workspace &rarr;
                  </Link>
                </div>
              </div>
            )}

            {/* Business Card */}
            {employee.business && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FaBuilding className="text-purple-500" /> Business Details
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-xs text-purple-600 font-bold uppercase mb-1">Organization</p>
                    <p className="text-lg font-bold text-gray-900">{employee.business.name}</p>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Business ID: {employee.business.id}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition">
      <div className="bg-gray-100 p-2 rounded-lg text-gray-500">
        <Icon />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-bold uppercase">{label}</p>
        <p className="text-gray-900 font-medium">{value || "N/A"}</p>
      </div>
    </div>
  );
}
