import { PlusIcon } from "@heroicons/react/24/outline";
import { FaTags } from "react-icons/fa";
import CategoryCard from "./CategoryCard";

export default function CategoryList({
  categories = [],
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <FaTags className="text-sm" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
            <p className="text-sm text-slate-500">Organize products for faster filtering.</p>
          </div>
        </div>

        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
        >
          <PlusIcon className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {categories.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onEdit={() => onEdit(cat)}
              onDelete={() => onDelete(cat.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No categories available
        </div>
      )}
    </div>
  );
}
