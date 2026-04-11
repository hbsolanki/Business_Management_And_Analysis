import { Link } from "react-router-dom";
import { FaRobot } from "react-icons/fa";

const AI_AGENT_DESCRIPTION =
  "Ask for business summaries, monitor modules, and turn ERP data into quick actions.";

export default function AiAgentFeaturedCard() {
  return (
    <Link
      to="/chat/agent"
      className="group col-span-2 md:col-span-4 flex flex-col md:flex-row md:items-center md:justify-between gap-5 rounded-3xl p-5 transition-all hover:bg-white/60"
    >
      <div className="flex items-start gap-4 min-w-0">
        <div className="h-14 w-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">
          <FaRobot />
        </div>
        <div className="text-left">
          <span className="block font-bold text-gray-700 text-sm md:text-base group-hover:text-gray-900">
            AI Agent
          </span>
          <p className="mt-1 text-xs leading-5 text-slate-500 max-w-xl">
            {AI_AGENT_DESCRIPTION}
          </p>
        </div>
      </div>
      <div className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-brand-700">
        Open Workspace
      </div>
    </Link>
  );
}
