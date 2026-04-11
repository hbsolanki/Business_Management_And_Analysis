import TransactionFilter from "./TransactionFilter";
import { FiArrowUp, FiArrowDown, FiClock, FiHash, FiRepeat } from "react-icons/fi";

export default function TransactionSection({
  transactions,
  loading,
  onFilter,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
          <FiRepeat className="text-sm" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Inventory Transactions</h2>
          <p className="text-sm text-slate-500">Track stock in and stock out activities</p>
        </div>
      </div>

      <TransactionFilter onApply={onFilter} />

      <div className="space-y-4">
        {transactions.map((tx) => {
          const isIn = tx.action === "IN";

          return (
            <div
              key={tx.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${isIn
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                      }`}
                  >
                    {isIn ? <FiArrowUp /> : <FiArrowDown />}
                    {isIn ? "Stock In" : "Stock Out"}
                  </span>

                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <FiHash />
                    TX-{tx.id}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <FiClock />
                  {new Date(tx.created_at).toLocaleString()}
                </div>
              </div>

              {tx.description && (
                <p className="mt-2 text-sm text-slate-600">{tx.description}</p>
              )}

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tx.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.product.name}
                      </p>
                      <p className="text-slate-500">SKU: {item.product.sku}</p>
                    </div>

                    <span className="font-semibold text-slate-900">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="text-center text-sm text-slate-500">
          Loading more transactions…
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <div className="text-center text-sm text-slate-500 py-6">
          No transactions found
        </div>
      )}
    </section>
  );
}
