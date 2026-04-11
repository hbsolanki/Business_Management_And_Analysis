import { Link } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { FaBox } from "react-icons/fa";

export default function ProductHeader() {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
          <FaBox className="text-xl" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Products
          </h1>
          <p className="text-slate-500 mt-1">
            Manage products, categories, pricing, and tax settings.
          </p>
        </div>
      </div>

      <Link
        to="/product/add"
        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition"
      >
        <PlusIcon className="h-5 w-5" />
        Add Product
      </Link>
    </div>
  );
}
