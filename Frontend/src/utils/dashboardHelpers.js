/**
 * Calculates inventory statistics from stock and product details data.
 * @param {Array} stockData - List of stock quantity items
 * @param {Array} detailsData - List of product details (prices, etc.)
 * @returns {Object} stats - { totalStockValue, totalPotentialProfit, lowStockCount }
 */
export const calculateInventoryStats = (stockData = [], detailsData = []) => {
    let totalStockValue = 0;
    let totalPotentialProfit = 0;
    let lowStockCount = 0;

    // Map details by ID for quick lookup
    const detailsMap = detailsData.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {});

    stockData.forEach((stockItem) => {
        const detail = detailsMap[stockItem.product_id];
        const qty = Number(stockItem.stock_quantity) || 0;

        if (qty < 10) lowStockCount++;

        if (detail) {
            const base = Number(detail.base_price) || 0;
            const profitPerUnit = Number(detail.net_profit) || 0;

            totalStockValue += base * qty;
            totalPotentialProfit += profitPerUnit * qty;
        }
    });

    return {
        totalStockValue,
        totalPotentialProfit,
        lowStockCount,
        totalProducts: stockData.length
    };
};

/**
 * Format currency for display (INR)
 * @param {Number} val - The numeric value to format
 * @returns {String} Formatted currency string
 */
export const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(val || 0);

/**
 * Get greeting based on current time
 * @returns {String} Greeting message
 */
export const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
};
