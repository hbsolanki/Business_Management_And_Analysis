import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function CategoryCard({ category, onEdit, onDelete }) {
  return (
    <div className="border rounded-md p-3 bg-white text-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{category.name}</p>
          {category.description && (
            <p className="text-gray-500 text-xs">
              {category.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onEdit}>
            <PencilSquareIcon className="h-4 w-4 text-blue-600" />
          </button>
          <button onClick={onDelete}>
            <TrashIcon className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
