import { PlusIcon } from "@heroicons/react/24/outline";
import CategoryCard from "./CategoryCard";

export default function CategoryList({
  categories = [],
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Categories
        </h2>

        <button
          onClick={onAdd}
          className="
            inline-flex items-center gap-1.5
            bg-white border border-blue-100 text-blue-600
            px-4 py-2 rounded-lg text-sm font-medium
            hover:bg-blue-50 hover:border-blue-200
            transition shadow-sm
          "
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Add Category</span>
        </button>
      </div>

      {/* Category Grid */}
      {categories.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-10">
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
        <p className="text-sm text-gray-500">
          No categories available
        </p>
      )}
    </>
  );
}
