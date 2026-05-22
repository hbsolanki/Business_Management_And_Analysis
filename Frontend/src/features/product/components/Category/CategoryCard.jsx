import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";

export default function CategoryCard({ category, onEdit, onDelete }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{category.name}</p>
          {category.description && (
            <p className="text-slate-500 text-xs mt-1">
              {category.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
            title="Edit"
          >
            <HiOutlinePencilSquare className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 transition"
            title="Delete"
          >
            <HiOutlineTrash className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
