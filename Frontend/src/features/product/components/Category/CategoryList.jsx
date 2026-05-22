import { useState } from "react";
import { HiOutlinePlus } from "react-icons/hi2";
import { FaChevronDown, FaChevronUp, FaTags } from "react-icons/fa";
import CategoryCard from "./CategoryCard";

export default function CategoryList({
  categories = [],
  loading = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onAdd,
  onEdit,
  onDelete,
}) {
  const [isOpen, setIsOpen] = useState(true);

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

        <div className="flex items-center gap-2">
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <HiOutlinePlus className="h-4 w-4" />
            Add Category
          </button>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center justify-center transition"
            title={isOpen ? "Collapse categories" : "Expand categories"}
            aria-label={isOpen ? "Collapse categories" : "Expand categories"}
          >
            {isOpen ? <FaChevronUp size={13} /> : <FaChevronDown size={13} />}
          </button>
        </div>
      </div>

      {isOpen && (
        Array.isArray(categories) && categories.length ? (
          <div className="space-y-4">
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

            {hasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {loadingMore ? "Loading..." : "Load More Categories"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            {loading ? "Loading categories..." : "No categories available"}
          </div>
        )
      )}
    </div>
  );
}
