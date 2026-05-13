// Employee Dashboard - Premium Edition
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { employeeService } from "@/features/employee/services/employeeService";
import taskService from "@/features/task/services/taskService";
import EmployeeHeader from "@/components/layout/EmployeeHeader";
import { tokenService } from "@/services/tokenService";
import { format } from "date-fns";
import TaskQuickView from "@/features/task/components/TaskQuickView";
import { getTimeBasedGreeting } from "@/utils/dashboardHelpers";
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
  FaArrowRight,
  FaCheckCircle,
  FaBolt,
} from "react-icons/fa";

const WORK_MODULES = {
  chat: {
    key: "chat",
    path: "/chat",
    icon: FaComments,
    label: "Team Chat",
    color: "bg-rose-500",
    shadow: "shadow-rose-200",
  },
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
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const employeeWorks = useMemo(() => resolveEmployeeWorks(employee), [employee]);
  const employeeBranches = useMemo(() => tokenService.getBranches(), []);

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


  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-brand-100 selection:text-brand-900 pb-12">
      <EmployeeHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-brand-50 text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 border border-brand-100">Employee Workspace</span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">v2.4.0</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Welcome back,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 animate-gradient-x">{employee.first_name}</span>
            </h1>
          </div>
          <div className="glass-panel flex items-center gap-4 px-5 py-3 rounded-2xl border border-white/40 shadow-sm backdrop-blur-md bg-white/30 self-start md:self-auto">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {employeeBranches.length > 0 ? employeeBranches[0].name : "Current Session"}
              </span>
              <span className="text-sm font-bold text-slate-900 tracking-tight">{format(new Date(), "EEEE, MMM do")}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
          <div className="lg:col-span-8 space-y-6 md:space-y-10">
            <div className="glass-panel rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.08)] relative overflow-hidden group border border-white/60 bg-white/70 animate-fade-in-up">
              <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-gradient-to-br from-brand-50 via-indigo-50/30 to-transparent rounded-bl-[10rem] -mr-20 -mt-20 transition-transform group-hover:scale-110 duration-1000 opacity-60"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8 md:mb-12">
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                      <div className="p-2 md:p-2.5 rounded-xl md:rounded-2xl bg-brand-900 text-white shadow-lg shadow-brand-200">
                        <FaBriefcase size={20} />
                      </div>
                      My Workspace
                    </h3>
                    <p className="text-slate-500 text-xs md:text-sm font-bold mt-1 opacity-70">Operational modules & core tools</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                  <AppIcon to="/chat" icon={FaComments} label="Team Chat" color="bg-rose-500" shadow="shadow-rose-100" />
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
                  <div className="mt-8 p-8 rounded-3xl bg-slate-50 border border-dashed border-slate-300 text-center">
                    <p className="text-sm font-bold text-slate-900">Limited Access Active</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto font-medium">
                      Core chat and AI tools are available. Contact administration for additional module permissions.
                    </p>
                  </div>
                )}
              </div>
            </div>


            <div className="glass-panel flex flex-col sm:flex-row items-center justify-between rounded-3xl p-6 md:p-8 shadow-sm border border-white/60 bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-all duration-500 group animate-fade-in-up animation-delay-300">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className="h-12 md:h-16 w-12 md:w-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <FaInfoCircle size={24} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight">Need help with tools?</h3>
                  <p className="text-xs md:text-sm text-slate-500 font-bold opacity-70">Read the Employee Guide for best practices.</p>
                </div>
              </div>
              <Link to="/info/employee" className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-xl hover:bg-brand-600 hover:-translate-y-1 transition-all text-center">Open Guide</Link>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6 md:space-y-8 animate-fade-in-up animation-delay-400">


            <div className="h-[360px] xl:h-[400px]">
              <TaskQuickView type="assigned_to" title="Recent Tasks" />
            </div>


          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes gradient-x {
          0%, 100% { background-size: 200% 200%; background-position: left center; }
          50% { background-size: 200% 200%; background-position: right center; }
        }
        .animate-gradient-x { animation: gradient-x 15s ease infinite; }
        .glass-panel { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .shadow-soft { box-shadow: 0 10px 40px -15px rgba(0,0,0,0.05); }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .animate-fade-in { animation: fade-in 1s ease-out forwards; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
      `}} />
    </div>
  );
}



const AppIcon = ({ to, icon: Icon, label, color, shadow }) => (
  <Link to={to} className="group flex flex-col items-center justify-center p-3 md:p-4 rounded-[2rem] md:rounded-[2.5rem] hover:bg-white/80 transition-all duration-500 border border-transparent hover:border-slate-100 hover:shadow-xl">
    <div className={`w-14 md:w-16 h-14 md:h-16 mx-auto rounded-2xl ${color} text-white flex items-center justify-center mb-3 md:mb-4 shadow-xl ${shadow} group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 relative`}>
      <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <Icon className="size-5 md:size-6" />
    </div>
    <span className="font-black text-slate-700 text-[9px] md:text-[11px] uppercase tracking-widest group-hover:text-brand-600 transition-colors duration-300 text-center">{label}</span>
  </Link>
);
