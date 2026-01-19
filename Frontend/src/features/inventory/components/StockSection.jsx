import { FiBox, FiHash, FiLayers } from "react-icons/fi";
import StockFilter from "./StockFilter";

export default function StockSection({
  stocks,
  onLoadMore,
  hasMore,
  onFilter,
}) {
  return (
    <section className="bg-white border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-gray-900">Product Stock</h2>
        <p className="text-xs text-gray-500">Available quantity per product</p>
      </div>

      {/* Filters */}
      <StockFilter onApply={onFilter} />

      {/* Stock Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stocks.map((s) => (
          <div
            key={s.id}
            className="border rounded-md p-3 hover:bg-gray-50 transition"
          >
            {/* Top */}
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {s.product.name}
                </p>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <FiHash className="text-[12px]" />
                    PID : {s.product.id}
                  </span>

                  <span className="flex items-center gap-1">
                    <FiHash className="text-[12px]" />
                    SKU : {s.product.sku}
                  </span>
                </div>
              </div>

              <FiBox className="text-gray-400 text-sm shrink-0" />
            </div>

            {/* Stock */}
            <div className="mt-3 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <FiLayers className="text-[12px]" />
                Stock
              </span>

              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  s.stock_quantity > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {s.stock_quantity}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onLoadMore}
            className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50 transition"
          >
            Load more
          </button>
        </div>
      )}

      {/* Empty State */}
      {!hasMore && stocks.length === 0 && (
        <div className="text-center text-xs text-gray-500 py-4">
          No stock records found
        </div>
      )}
    </section>
  );
}
