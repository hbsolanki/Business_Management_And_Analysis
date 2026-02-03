import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { employeeService } from "@/features/employee/services/employeeService";
import taskService from "@/features/task/services/taskService";
import EmployeeHeader from "@/components/layout/EmployeeHeader";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import {
  FaUser,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaClipboardList,
  FaBoxOpen,
  FaProductHunt,
  FaCashRegister,
  FaChartPie,
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaArrowRight,
  FaBriefcase,
  FaComments,
  FaShoppingBag
} from "react-icons/fa";

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empRes = await employeeService.getById(localStorage.getItem("id"));
        setEmployee(empRes.data);
        localStorage.setItem("work", empRes.data.work);

        // Fetch tasks for stats and recent activity
        const tasksRes = await taskService.getAssigneeTasks();
        if (Array.isArray(tasksRes)) {
          setTasks(tasksRes);
        } else if (tasksRes && Array.isArray(tasksRes.results)) {
          setTasks(tasksRes.results);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          navigate("/login");
        } else {
          console.error("Dashboard fetch error:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const copyBusinessId = () => {
    if (employee?.business?.id) {
      navigator.clipboard.writeText(employee.business.id);
      toast.success("Business ID copied!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 font-medium">
        Unable to load employee profile.
      </div>
    );
  }

  // Calculate Stats
  const stats = {
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    total: tasks.length
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-12">
      <EmployeeHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{employee.first_name}</span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Here's what's happening today.</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-700">{format(new Date(), "EEEE, MMMM do")}</span>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-8 auto-rows-min">

          {/* 1. Profile Card (row-span-2) */}
          <div className="md:col-span-2 md:row-span-2 bg-white rounded-3xl p-8 shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-start justify-between">
                <div className="relative">
                  {employee.profile_picture ? (
                    <img src={employee.profile_picture} alt="Profile" className="w-24 h-24 rounded-2xl object-cover shadow-lg border-4 border-white" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 text-white flex items-center justify-center text-3xl font-bold shadow-lg border-4 border-white">
                      {employee.first_name?.[0]}{employee.last_name?.[0]}
                    </div>
                  )}
                  <span className="absolute -bottom-2 -right-2 bg-green-500 border-4 border-white w-6 h-6 rounded-full"></span>
                </div>
                <span className="px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded-full uppercase tracking-wider">Employee</span>
              </div>

              <div className="mt-6">
                <h2 className="text-2xl font-bold text-gray-900">{employee.first_name} {employee.last_name}</h2>
                <p className="text-gray-500 font-medium">{employee.email}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-sm font-semibold text-gray-600">
                    <FaPhone size={12} className="text-gray-400" /> {employee.mobile_number}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-sm font-semibold text-gray-600">
                    <FaCalendarAlt size={12} className="text-gray-400" /> Joined {new Date(employee.date_joined).getFullYear()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Stats Cards (Individual cells) */}
          <StatsCard
            title="Pending"
            count={stats.pending}
            icon={FaClock}
            color="text-yellow-600"
            bg="bg-yellow-50"
            trend="Needs Attention"
          />
          <StatsCard
            title="In Progress"
            count={stats.inProgress}
            icon={FaTasks}
            color="text-blue-600"
            bg="bg-blue-50"
            trend="Active Now"
          />

          {/* Work Modules & Chat */}
          <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FaBriefcase className="text-indigo-600" /> Work
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <AppIcon to="/tasks" icon={FaTasks} label="My Tasks" color="bg-indigo-600" shadow="shadow-indigo-200" />
              <AppIcon to="/chat" icon={FaComments} label="Chat" color="bg-rose-500" shadow="shadow-rose-200" />

              {Array.isArray(employee.work) && employee.work.includes("inventory") && <AppIcon to="/inventory" icon={FaBoxOpen} label="Inventory" color="bg-purple-500" shadow="shadow-purple-200" />}
              {Array.isArray(employee.work) && employee.work.includes("product") && <AppIcon to="/product" icon={FaProductHunt} label="Products" color="bg-orange-500" shadow="shadow-orange-200" />}
              {Array.isArray(employee.work) && employee.work.includes("sale") && <AppIcon to="/sale" icon={FaShoppingBag} label="Sales" color="bg-green-500" shadow="shadow-green-200" />}
              {Array.isArray(employee.work) && employee.work.includes("invoice") && <AppIcon to="/invoice" icon={FaCashRegister} label="Invoices" color="bg-emerald-500" shadow="shadow-emerald-200" />}
              {Array.isArray(employee.work) && employee.work.includes("analytics") && <AppIcon to="/analytics" icon={FaChartPie} label="Analytics" color="bg-blue-500" shadow="shadow-blue-200" />}
            </div>
          </div>

          {/* Business Info */}
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                  <FaBuilding className="text-indigo-100" />
                </div>
                <h3 className="text-lg font-bold">{employee.business?.name || "No Business"}</h3>
              </div>

              {employee.business ? (
                <>
                  <p className="text-indigo-100 text-sm mb-6 leading-relaxed line-clamp-2">
                    {employee.business.description || "Welcome to the team workspace."}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="bg-black/20 px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-3 border border-indigo-400/30">
                      <span className="text-xs font-mono text-indigo-200 tracking-wider">ID</span>
                      <span className="font-mono font-bold tracking-widest">{employee.business.id}</span>
                    </div>
                    <button onClick={copyBusinessId} className="text-sm font-semibold hover:text-white text-indigo-200 transition-colors">
                      Copy
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-indigo-200">Contact admin to link business.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Stats Card Component
const StatsCard = ({ title, count, icon: Icon, color, bg, trend }) => (
  <div className="bg-white rounded-3xl p-6 shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-md transition-shadow">
    <div className={`w-10 h-10 rounded-2xl ${bg} ${color} flex items-center justify-center mb-4`}>
      <Icon size={18} />
    </div>
    <p className="text-gray-500 text-sm font-medium">{title}</p>
    <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{count}</h3>
    <p className={`text-xs font-semibold mt-3 ${color} bg-opacity-10 px-2 py-1 rounded-md inline-block bg-gray-50`}>
      {trend}
    </p>
  </div>
);

// App Icon Component
const AppIcon = ({ to, icon: Icon, label, color, shadow }) => (
  <Link to={to} className="group block text-center">
    <div className={`w-16 h-16 mx-auto rounded-3xl ${color} text-white flex items-center justify-center mb-3 shadow-lg ${shadow} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}>
      <Icon size={28} />
    </div>
    <span className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">{label}</span>
  </Link>
);
