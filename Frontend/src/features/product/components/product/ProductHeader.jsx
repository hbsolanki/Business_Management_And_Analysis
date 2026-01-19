import { Link } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function ProductHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Product Management
        </h1>
        <p className="text-gray-500 mt-1">
          Manage products, categories, and inventory-ready items
        </p>
      </div>

      <Link
        to="/product/add"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
      >
        <PlusIcon className="h-5 w-5" />
        Add Product
      </Link>
    </div>
  );
}
