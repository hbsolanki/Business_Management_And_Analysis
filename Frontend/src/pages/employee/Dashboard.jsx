import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { employeeService } from "@/features/employee/services/employeeService";
import EmployeeHeader from "@/components/layout/EmployeeHeader";
import { useDispatch, useSelector } from "react-redux";
import { toggleQuickAction } from "@/redux/slices/quickActionsSlice";
import { EMPLOYEE_ACTIONS } from "@/config/quickActionsData";
import QuickActionsConfigModal from "@/components/shared/QuickActionsConfigModal";

import {
  FaUser,
  FaEdit,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaBriefcase,
  FaCheckCircle,
  FaThLarge,
  FaClipboardList,
  FaBoxOpen,
  FaProductHunt,
  FaCashRegister,
  FaTasks
} from "react-icons/fa";

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const activeActionIds = useSelector((state) => state.quickActions.activeActionIds);

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

  const toggleAction = (actionId) => {
    dispatch(toggleQuickAction({
      actionId,
      role: 'employee'
    }));
  };

  const copyBusinessId = () => {
    if (employee?.business?.id) {
      navigator.clipboard.writeText(employee.business.id);
      toast.success("Business ID copied!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
    <div className="min-h-screen bg-gray-50/50  transition-colors duration-300">
      <EmployeeHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-600 to-teal-700 shadow-xl text-white">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-green-400/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                {employee.profile_picture ? (
                  <img
                    alt={`${employee.first_name?.[0]}${employee.last_name?.[0]}`}
                    src={employee.profile_picture}
                    className="h-24 w-24 rounded-2xl object-cover border-4 border-white/20 shadow-2xl bg-white/10"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-2xl bg-white/10 border-4 border-white/20 flex items-center justify-center text-white text-3xl font-bold shadow-2xl backdrop-blur-sm">
                    {employee.first_name?.[0]}{employee.last_name?.[0]}
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-blue-500 w-6 h-6 rounded-full border-4 border-teal-700"></div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                    Hello, {employee.first_name}!
                  </h1>
                  <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium border border-white/10">
                    Employee
                  </span>
                </div>
                <p className="text-green-100 text-lg">Ready to work consistently.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl font-medium transition-all border border-white/10">
                My Tasks
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Work & Business */}
          <div className="lg:col-span-2 space-y-8">

            {/* Assigned Work Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300 relative">
              <div className="p-1 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500"></div>
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                      <FaClipboardList size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Your Work Assignment</h2>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span>Role: <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">{typeof employee.work === 'string' ? employee.work.charAt(0).toUpperCase() + employee.work.slice(1) : Array.isArray(employee.work) ? employee.work.join(', ') : 'Not Assigned'}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {Array.isArray(employee.work) && employee.work.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                    {employee.work.includes("inventory") && (
                      <AppCard to="/inventory" icon={FaBoxOpen} label="Inventory" color="text-purple-600" bg="bg-purple-50" />
                    )}
                    {employee.work.includes("product") && (
                      <AppCard to="/product" icon={FaProductHunt} label="Products" color="text-orange-600" bg="bg-orange-50" />
                    )}
                    {employee.work.includes("invoice") && (
                      <AppCard to="/invoice" icon={FaCashRegister} label="Invoices" color="text-emerald-600" bg="bg-emerald-50" />
                    )}
                  </div>
                ) : (
                  <div className="bg-white h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                    <div className="p-3 bg-gray-50 rounded-full mb-3">
                      <FaTasks size={24} className="text-gray-400" />
                    </div>
                    <p>No specific work modules assigned yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Business Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300 relative">
              {employee.business ? (
                <>
                  <div className="p-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"></div>
                  <div className="p-6 md:p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                        <FaBuilding size={28} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{employee.business.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <span>ID: <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">{employee.business.id}</span></span>
                          <button
                            onClick={copyBusinessId}
                            className="text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline"
                            title="Copy Business ID"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 leading-relaxed bg-gray-50/50 p-5 rounded-2xl border border-gray-100 text-sm">
                      {employee.business.description || "No description provided."}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <div className="inline-flex p-4 bg-gray-50 rounded-full text-gray-400 mb-4">
                    <FaBuilding size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Business Registered</h3>
                  <p className="text-gray-500">Ask your manager to add business details.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Quick Actions & Profile */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  Quick Actions
                </h2>
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline"
                >
                  Configure
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {activeActionIds.length > 0 ? (
                  activeActionIds.map(id => {
                    const action = EMPLOYEE_ACTIONS[id];
                    if (!action) return null;
                    return (
                      <QuickActionHorizontal
                        key={id}
                        to={action.path}
                        icon={action.icon}
                        label={action.label}
                        desc={action.desc}
                        color={action.color}
                        bg={action.bg}
                      />
                    );
                  })
                ) : (
                  <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-500 text-sm mb-2">No quick actions pinned.</p>
                    <button
                      onClick={() => setIsConfigModalOpen(true)}
                      className="text-green-600 font-semibold text-sm hover:underline"
                    >
                      Add Actions
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Info */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                <FaUser className="text-green-600" /> Personal Details
              </h3>
              <div className="space-y-6">
                <InfoItem icon={FaUser} label="Full Name" value={`${employee.first_name} ${employee.last_name}`} />
                <InfoItem icon={FaPhone} label="Mobile" value={employee.mobile_number} />
                <InfoItem icon={FaEnvelope} label="Email" value={employee.email} />
                <InfoItem icon={FaCalendarAlt} label="Joined" value={new Date(employee.date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuickActionsConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        availableActions={EMPLOYEE_ACTIONS}
        activeActionIds={activeActionIds}
        onToggleAction={toggleAction}
        themeColor="green"
      />
    </div>
  );
}

// Sub-components
function QuickActionHorizontal({ to, icon, label, desc, color, bg }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-gray-200 transition-all duration-200 group ${bg}`}
    >
      <div className={`p-2.5 rounded-lg bg-white shadow-sm ${color} group-hover:scale-105 transition-transform text-lg`}>
        {icon}
      </div>
      <div>
        <span className="block font-bold text-gray-900 text-sm">{label}</span>
        <span className="block text-xs text-gray-500">{desc}</span>
      </div>
    </Link>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-4 p-2 hover:bg-gray-50 rounded-xl transition-colors">
      <div className="p-2.5 bg-gray-100 rounded-xl text-gray-500">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-gray-800 font-medium text-sm break-all">{value || "Not set"}</p>
      </div>
    </div>
  );
}
