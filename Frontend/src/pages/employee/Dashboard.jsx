import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { employeeService } from "@/features/employee/services/employeeService";
import taskService from "@/features/task/services/taskService";
import EmployeeHeader from "@/components/layout/EmployeeHeader";
import { tokenService } from "@/services/tokenService";
import { format } from "date-fns";
import {
  FaPhone,
  FaCalendarAlt,
  FaBoxOpen,
  FaProductHunt,
  FaCashRegister,
  FaChartPie,
  FaTasks,
  FaClock,
  FaBriefcase,
  FaComments,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaTruck,
  FaRobot,
} from "react-icons/fa";

const WORK_MODULES = {
  product: {
    key: "product",
    path: "/product",
    icon: FaProductHunt,
    label: "Products",
    color: "bg-orange-500",
    shadow: "shadow-orange-200",
  },
  inventory: {
    key: "inventory",
    path: "/inventory",
    icon: FaBoxOpen,
    label: "Inventory",
    color: "bg-purple-500",
    shadow: "shadow-purple-200",
  },
  invoice: {
    key: "invoice",
    path: "/invoice",
    icon: FaCashRegister,
    label: "Invoices",
    color: "bg-emerald-500",
    shadow: "shadow-emerald-200",
  },
  analytics: {
    key: "analytics",
    path: "/analytics",
    icon: FaChartPie,
    label: "Analytics",
    color: "bg-brand-500",
    shadow: "shadow-brand-200",
  },
  supplier: {
    key: "supplier",
    path: "/supplier",
    icon: FaTruck,
    label: "Supplier",
    color: "bg-amber-500",
    shadow: "shadow-amber-200",
  },
  ai_agent: {
    key: "ai_agent",
    path: "/chat/agent",
    icon: FaRobot,
    label: "AI Agent",
    color: "bg-brand-500",
    shadow: "shadow-brand-200",
  },
};

const WORK_MODULE_ORDER = ["product", "inventory", "invoice", "analytics", "supplier"];

const normalizeWorkItem = (item) => {
  if (!item && item !== 0) return null;
  if (typeof item === "string") return item.trim().toLowerCase();
  if (typeof item === "object") {
    const value = item.value || item.name || item.work || item.code || item.label;
    return value ? String(value).trim().toLowerCase() : null;
  }
  return String(item).trim().toLowerCase();
};

const normalizeWorkList = (value) => {
  if (!value && value !== 0) return [];

  let list = [];
  if (Array.isArray(value)) {
    list = value;
  } else if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];

    if (raw.startsWith("[") && raw.endsWith("]")) {
      try {
        const parsed = JSON.parse(raw);
        list = Array.isArray(parsed) ? parsed : [parsed];
      } catch (_error) {
        list = raw.split(",");
      }
    } else if (raw.includes(",")) {
      list = raw.split(",");
    } else {
      list = [raw];
    }
  } else {
    list = [value];
  }

  return list
    .map(normalizeWorkItem)
    .filter(Boolean);
};

const resolveEmployeeWorks = (userData) => {
  if (!userData) return [];

  const assigned = normalizeWorkList(userData.assigned_works);
  const legacy = normalizeWorkList(userData.work);

  return [...new Set([...assigned, ...legacy])];
};

const toBranchObject = (branch, index) => {
  if (!branch && branch !== 0) return null;

  if (typeof branch === "object") {
    const branchId = branch.id ?? branch.branch_id ?? index;
    return {
      id: branchId,
      name: branch.name || (branchId ? `Branch #${branchId}` : `Branch ${index + 1}`),
      isMain: Boolean(branch.is_default),
    };
  }

  return {
    id: branch,
    name: `Branch #${branch}`,
    isMain: false,
  };
};

const resolveEmployeeBranches = (userData) => {
  if (!userData) return [];

  let rawBranches = [];

  if (Array.isArray(userData.branches) && userData.branches.length > 0) {
    rawBranches = userData.branches;
  } else if (Array.isArray(userData.branch_ids) && userData.branch_ids.length > 0) {
    rawBranches = userData.branch_ids;
  } else if (userData.branch) {
    rawBranches = [userData.branch];
  } else if (userData.branch_id) {
    rawBranches = [userData.branch_id];
  }

  const normalized = rawBranches
    .map((branch, index) => toBranchObject(branch, index))
    .filter(Boolean);

  const seen = new Set();
  return normalized.filter((branch) => {
    const key = `${branch.id || "none"}-${branch.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toDisplayLabel = (value) => {
  if (!value) return "Unknown";
  return String(value)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
};

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      const employeeId = tokenService.getId() || localStorage.getItem("id");
      const firstName = localStorage.getItem("first_name") || "Employee";
      const assignedWorksStr = tokenService.getWork() || localStorage.getItem("work") || "";

      if (!employeeId) {
        if (isMounted) setLoading(false);
        navigate("/login");
        return;
      }

      if (isMounted) {
        setEmployee({
          id: employeeId,
          first_name: firstName,
          assigned_works: assignedWorksStr,
          work: assignedWorksStr
        });
      }

      try {
        const tasksRes = await taskService.getAssigneeTasks();
        if (!isMounted) return;

        if (Array.isArray(tasksRes)) {
          setTasks(tasksRes);
        } else if (tasksRes && Array.isArray(tasksRes.results)) {
          setTasks(tasksRes.results);
        }
      } catch (err) {
        if (!isMounted) return;

        if (err.response?.status === 401) {
          navigate("/login");
        } else {
          console.error("Dashboard fetch error:", err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const employeeWorks = useMemo(() => resolveEmployeeWorks(employee), [employee]);

  const assignedModules = useMemo(() => {
    const assignedSet = new Set(employeeWorks);
    return WORK_MODULE_ORDER
      .filter((work) => assignedSet.has(work))
      .map((work) => WORK_MODULES[work])
      .filter(Boolean);
  }, [employeeWorks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
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


  const stats = {
    pending: tasks.filter((task) => task.status === "PENDING").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    completed: tasks.filter((task) => task.status === "COMPLETED").length,
    total: tasks.length,
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
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{employee.first_name}</span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Here&apos;s what&apos;s happening today.</p>
          </div>
          <div className="glass-panel flex items-center gap-3 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-700">{format(new Date(), "EEEE, MMMM do")}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Work Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-panel rounded-3xl p-8 shadow-[0_2px_20px_rgb(0,0,0,0.04)] relative overflow-hidden group border border-white/60">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <FaBriefcase className="text-indigo-600" /> My Workspace
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wide border border-indigo-100">
                    {assignedModules.length} Modules
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <AppIcon to="/chat" icon={FaComments} label="Chat" color="bg-rose-500" shadow="shadow-rose-200" />
                  <AppIcon to="/chat/agent" icon={FaRobot} label="AI Agent" color="bg-brand-600" shadow="shadow-brand-200" />

                  {assignedModules.map((module) => (
                    <AppIcon
                      key={module.key}
                      to={module.path}
                      icon={module.icon}
                      label={module.label}
                      color={module.color}
                      shadow={module.shadow}
                    />
                  ))}
                </div>

                {assignedModules.length === 0 && (
                  <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-sm font-semibold text-slate-600">
                      No specific work modules assigned.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Check with your manager if you need access to Inventory, Invoices, or other tools.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Info Banner */}
            <div className="glass-panel flex items-center justify-between rounded-3xl p-6 shadow-sm border border-white/60 bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white text-blue-600 flex items-center justify-center shadow-sm">
                  <FaInfoCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Need help getting started?</h3>
                  <p className="text-xs text-gray-500 font-medium">Read the Employee Guide for best practices.</p>
                </div>
              </div>
              <Link
                to="/info/employee"
                className="px-5 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-sm shadow-sm hover:bg-blue-600 hover:text-white transition-all"
              >
                Read Guide
              </Link>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <StatsCard
                title="Pending Tasks"
                count={stats.pending}
                icon={FaClock}
                color="text-yellow-600"
                bg="bg-yellow-50"
                trend="To Do"
              />
              <StatsCard
                title="In Progress"
                count={stats.inProgress}
                icon={FaTasks}
                color="text-brand-600"
                bg="bg-brand-50"
                trend="Active"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const StatsCard = ({ title, count, icon: Icon, color, bg, trend }) => (
  <div className="glass-panel rounded-3xl p-6 shadow-[0_2px_20px_rgb(0,0,0,0.04)] hover:shadow-md transition-shadow">
    <div className={`w-10 h-10 rounded-2xl ${bg} ${color} flex items-center justify-center mb-4`}>
      <Icon size={18} />
    </div>
    <p className="text-gray-500 text-sm font-medium">{title}</p>
    <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{count}</h3>
    <p className={`text-xs font-semibold mt-3 ${color} bg-opacity-10 px-2 py-1 rounded-md inline-block bg-white/70`}>
      {trend}
    </p>
  </div>
);

const AppIcon = ({ to, icon: Icon, label, color, shadow }) => (
  <Link to={to} className="group flex flex-col items-center justify-center p-4 rounded-3xl hover:bg-white/50 transition-colors">
    <div className={`w-16 h-16 mx-auto rounded-[1.25rem] ${color} text-white flex items-center justify-center mb-4 shadow-lg ${shadow} group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 relative after:absolute after:inset-0 after:rounded-[1.25rem] after:ring-2 after:ring-white/50 after:opacity-0 group-hover:after:opacity-100`}>
      <Icon size={26} />
    </div>
    <span className="font-bold text-gray-700 text-sm group-hover:text-indigo-600 transition-colors">{label}</span>
  </Link>
);
