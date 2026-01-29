import TransactionFilter from "./TransactionFilter";
import { FiArrowUp, FiArrowDown, FiClock, FiHash } from "react-icons/fi";

export default function TransactionSection({
  transactions,
  loading,
  onFilter,
}) {
  return (
    <div className="bg-white border rounded-xl p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Inventory Transactions
        </h2>
        <p className="text-sm text-gray-500">
          Track stock in and stock out activities
        </p>
      </div>

      {/* Filters */}
      <TransactionFilter onApply={onFilter} />

      {/* Transactions */}
      <div className="space-y-4">
        {transactions.map((tx) => {
          const isIn = tx.action === "IN";

          return (
            <div
              key={tx.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition"
            >
              {/* Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Action Badge */}
                  <span
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${isIn
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                      }`}
                  >
                    {isIn ? <FiArrowUp /> : <FiArrowDown />}
                    {isIn ? "Stock In" : "Stock Out"}
                  </span>

                  {/* Transaction ID */}
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <FiHash />
                    TX-{tx.id}
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <FiClock />
                  {new Date(tx.created_at).toLocaleString()}
                </div>
              </div>

              {/* Description */}
              {tx.description && (
                <p className="mt-2 text-sm text-gray-600">{tx.description}</p>
              )}

              {/* Items */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tx.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-xs border rounded-md px-3 py-2 bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {item.product.name}
                      </p>
                      <p className="text-gray-500">SKU: {item.product.sku}</p>
                    </div>

                    <span className="font-semibold text-gray-900">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-sm text-gray-500">
          Loading more transactions…
        </div>
      )}

      {/* Empty State */}
      {!loading && transactions.length === 0 && (
        <div className="text-center text-sm text-gray-500 py-6">
          No transactions found
        </div>
      )}
    </div>
  );
}
