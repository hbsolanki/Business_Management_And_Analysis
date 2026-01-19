import { InformationCircleIcon } from "@heroicons/react/24/outline";

export default function InfoTooltip({ label, description }) {
  return (
    <span className="relative group inline-flex items-center gap-1">
      <span>{label}</span>

      <InformationCircleIcon className="h-4 w-4 text-gray-400 cursor-pointer" />

      {/* Tooltip */}
      <span className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20">
        <span className="bg-gray-900 text-white text-xs rounded px-3 py-2 shadow whitespace-nowrap">
          {description}
        </span>
      </span>
    </span>
  );
}
