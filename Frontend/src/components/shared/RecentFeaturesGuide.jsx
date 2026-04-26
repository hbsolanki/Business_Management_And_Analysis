import { Link } from "react-router-dom";
import {
  FaRobot,
  FaTruck,
  FaShoppingCart,
  FaUsers,
  FaCodeBranch,
  FaHistory,
  FaArrowRight,
} from "react-icons/fa";

const RECENT_FEATURES = [
  {
    title: "AI Agent Workspace",
    description:
      "A structured business assistant with sessions, workflow visibility, chart rendering, and operational prompts.",
    to: "/ai-agent/session",
    icon: FaRobot,
    accent: "text-brand-700",
    bg: "bg-brand-50/80",
  },
  {
    title: "Supplier Management",
    description:
      "Supplier, vendor, customer, purchase order, and sales order workflows now live in one supplier workspace.",
    to: "/supplier",
    icon: FaTruck,
    accent: "text-amber-700",
    bg: "bg-amber-50/80",
  },
  {
    title: "Sales Order Flow",
    description:
      "Supplier sales orders now support delivery actions, stronger detail views, and cleaner responsive forms.",
    to: "/supplier/sales-order",
    icon: FaShoppingCart,
    accent: "text-emerald-700",
    bg: "bg-emerald-50/80",
  },
  {
    title: "Branch-Aware Workspaces",
    description:
      "Employee and manager flows now respect assigned branches across invoice, inventory, cost, and supplier tasks.",
    to: "/employee",
    icon: FaCodeBranch,
    accent: "text-indigo-700",
    bg: "bg-indigo-50/80",
  },
  {
    title: "Customer And Vendor Links",
    description:
      "Platform integration toggles, business mapping, patch-safe updates, and cleaner customer or vendor forms were added.",
    to: "/supplier/customer",
    icon: FaUsers,
    accent: "text-cyan-700",
    bg: "bg-cyan-50/80",
  },
  {
    title: "Activity And Visibility Upgrades",
    description:
      "Richer activity filters, profile linking, and dashboard-level visibility improvements help teams review changes faster.",
    to: "/activity-logs",
    icon: FaHistory,
    accent: "text-slate-700",
    bg: "bg-slate-100/80",
  },
];

export default function RecentFeaturesGuide({ compact = false }) {
  return (
    <section
      className={`rounded-[28px] border border-slate-200/80 bg-white/60 shadow-sm backdrop-blur-sm ${
        compact ? "p-5 sm:p-6" : "mx-auto max-w-6xl p-6 sm:p-8"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="max-w-2xl text-sm font-medium leading-6 text-slate-500">
            A quick view of the newest workflows now available across supplier,
            AI, branch-aware operations, and reporting.
          </p>
        </div>
        <Link
          to="/info"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Open Info Hub
          <FaArrowRight size={10} />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {RECENT_FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.title}
              to={feature.to}
              className="group rounded-[24px] border border-slate-200/70 bg-[linear-gradient(rgba(226,232,240,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(226,232,240,0.55)_1px,transparent_1px)] bg-[size:28px_28px] bg-white/12 p-4 transition hover:bg-white/45 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 ${feature.bg} ${feature.accent} shadow-sm backdrop-blur-sm transition-transform group-hover:scale-105`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black tracking-tight text-slate-900">
                      {feature.title}
                    </h3>
                    <FaArrowRight className="mt-0.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </div>
                  <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
