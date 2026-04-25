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
    path: "/ai-agent/session",
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
    .map((word) => (word && word[0] ? word[0].toUpperCase() + word.slice(1) : ""))
    .filter(Boolean)
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


  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-brand-100 selection:text-brand-900 pb-12">
      <EmployeeHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-brand-50 text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 border border-brand-100">Employee Workspace</span>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 animate-gradient-x">{employee.first_name}</span>
            </h1>
          </div>
          <div className="glass-panel flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-white/40 shadow-sm backdrop-blur-md bg-white/30">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
            </div>
            <span className="text-xs font-bold text-slate-700 tracking-tight">{format(new Date(), "EEEE, MMM do")}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Work Area */}
          <div className="lg:col-span-8 space-y-8">
            <div className="glass-panel rounded-[2.5rem] p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] relative overflow-hidden group border border-white/60 bg-white/70">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-brand-50 via-indigo-50/30 to-transparent rounded-bl-[10rem] -mr-20 -mt-20 transition-transform group-hover:scale-110 duration-1000 opacity-60"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                      <div className="p-2.5 rounded-2xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100/50">
                        <FaBriefcase size={20} />
                      </div>
                      My Workspace
                    </h3>
                    <p className="text-slate-500 text-sm font-bold mt-1 opacity-70">Access your assigned operational modules</p>
                  </div>
                  <span className="px-4 py-1.5 rounded-xl bg-white/80 text-slate-700 text-[10px] font-black uppercase tracking-widest border border-slate-200/50 shadow-sm">
                    {assignedModules.length + 2} Active Tools
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AppIcon to="/chat" icon={FaComments} label="Team Chat" color="bg-rose-500" shadow="shadow-rose-200" />
                  <AppIcon to="/ai-agent/session" icon={FaRobot} label="AI Intelligence" color="bg-slate-900" shadow="shadow-slate-300" />

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
  <div className="glass-panel rounded-[2rem] p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-500 border border-white/60 bg-white/50 group">
    <div className={`w-14 h-14 rounded-2xl ${bg} ${color} flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
      <Icon size={22} />
    </div>
    <p className="text-slate-500 text-xs font-black uppercase tracking-widest opacity-60">{title}</p>
    <h3 className="text-4xl font-black text-slate-900 mt-2 tracking-tight">{count}</h3>
    <div className="mt-4 flex items-center gap-2">
      <div className={`h-1.5 w-1.5 rounded-full ${color.replace('text-', 'bg-')} animate-pulse`}></div>
      <p className={`text-[10px] font-black uppercase tracking-widest ${color}`}>
        {trend}
      </p>
    </div>
  </div>
);

const AppIcon = ({ to, icon: Icon, label, color, shadow }) => (
  <Link to={to} className="group flex flex-col items-center justify-center p-4 rounded-[2.5rem] hover:bg-white/80 transition-all duration-500 border border-transparent hover:border-slate-100 hover:shadow-sm">
    <div className={`w-16 h-16 mx-auto rounded-2xl ${color} text-white flex items-center justify-center mb-4 shadow-xl ${shadow} group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 relative`}>
      <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <Icon size={24} />
    </div>
    <span className="font-black text-slate-700 text-[11px] uppercase tracking-widest group-hover:text-brand-600 transition-colors duration-300">{label}</span>
  </Link>
);
