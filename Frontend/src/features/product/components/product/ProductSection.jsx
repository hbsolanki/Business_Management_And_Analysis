import { useEffect, useRef } from "react";
import ProductGrid from "./ProductGrid.jsx";
import { FaBoxes } from "react-icons/fa";

export default function ProductSection({
  products,
  loading,
  expandedId,
  toggleRead,
  onDeleteProduct,
  loadMore,
  hasMore,
  loadingMore,
}) {
  const observerRef = useRef(null);

  useEffect(() => {
    if (!hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0,
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
          <FaBoxes className="text-sm" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">View and manage all products</p>
        </div>
      </div>

      <ProductGrid
        products={products}
        loading={loading}
        expandedId={expandedId}
        onToggleRead={toggleRead}
        onDeleteProduct={onDeleteProduct}
      />

      {hasMore && (
        <div ref={observerRef} className="h-12 flex items-center justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="h-4 w-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
