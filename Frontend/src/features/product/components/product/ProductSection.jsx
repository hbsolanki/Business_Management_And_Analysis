import { useEffect, useRef } from "react";
import ProductGrid from "./ProductGrid.jsx";

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
        rootMargin: "200px", // prefetch before reaching bottom
        threshold: 0,
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Products</h2>
        <p className="text-sm text-gray-500">View and manage all products</p>
      </div>

      <ProductGrid
        products={products}
        loading={loading}
        expandedId={expandedId}
        onToggleRead={toggleRead}
        onDeleteProduct={onDeleteProduct}
      />

      {/* Invisible trigger */}
      {hasMore && (
        <div
          ref={observerRef}
          className="h-10 flex items-center justify-center"
        >
          {loadingMore && (
            <span className="text-sm text-gray-500">Loading more...</span>
          )}
        </div>
      )}
    </div>
  );
}
