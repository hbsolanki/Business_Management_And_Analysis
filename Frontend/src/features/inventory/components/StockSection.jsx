import { FiBox, FiHash, FiLayers } from "react-icons/fi";
import StockFilter from "./StockFilter";

export default function StockSection({
  stocks,
  onLoadMore,
  hasMore,
  onFilter,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
          <FiBox className="text-sm" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Product Stock</h2>
          <p className="text-sm text-slate-500">Available quantity per product</p>
        </div>
      </div>

      <StockFilter onApply={onFilter} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stocks.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {s.product.name}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <FiHash className="text-[12px]" />
                    PID: {s.product.id}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiHash className="text-[12px]" />
                    SKU: {s.product.sku}
                  </span>
                </div>
              </div>
              <FiBox className="text-slate-400 text-sm shrink-0" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <FiLayers className="text-[12px]" />
                Stock
              </span>

              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  s.stock_quantity > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {s.stock_quantity}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition"
          >
            Load more
          </button>
        </div>
      )}

      {!hasMore && stocks.length === 0 && (
        <div className="text-center text-sm text-slate-500 py-4">
          No stock records found
        </div>
      )}
    </section>
  );
}
