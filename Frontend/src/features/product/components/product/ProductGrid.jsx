import ProductCard from "./ProductCard";
import EmptyState from "../EmptyState";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

export default function ProductGrid({
  products = [],
  loading,
  expandedId,
  onToggleRead,
  onDeleteProduct,
}) {
  if (loading) {
    return <p className="text-center">Loading...</p>;
  }

  if (!products.length) {
    return <EmptyState text="No products found" />;
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            expandedId={expandedId}
            onToggle={onToggleRead}
            onDelete={onDeleteProduct}
          />
        ))}
      </div>
    </>
  );
}
