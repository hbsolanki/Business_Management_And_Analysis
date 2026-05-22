import { HiOutlineInformationCircle } from "react-icons/hi2";

export default function InfoTooltip({ label, description }) {
  return (
    <span className="relative group inline-flex items-center gap-1">
      <span>{label}</span>

      <HiOutlineInformationCircle className="h-4 w-4 text-slate-400 cursor-pointer" />

      <span className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20">
        <span className="bg-slate-900 text-white text-xs rounded px-3 py-2 shadow whitespace-nowrap">
          {description}
        </span>
      </span>
    </span>
  );
}
