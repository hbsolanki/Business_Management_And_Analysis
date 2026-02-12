import ProductCard from "./ProductCard";
import EmptyState from "../EmptyState";

export default function ProductGrid({
  products = [],
  loading,
  expandedId,
  onToggleRead,
  onDeleteProduct,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Loading products...</p>
        </div>
      </div>
    );
  }

  if (!products.length) {
    return <EmptyState text="No products found" />;
  }

  return (
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
  );
}
