/**
 * Formatting utilities for analytics data display
 */

export const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
});

export const NUMBER_FORMATTER = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
});

export const PERCENT_FORMATTER = new Intl.NumberFormat("en-IN", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

export const CHART_COLORS = ["#0f766e", "#0ea5e9", "#3b82f6", "#16a34a", "#f59e0b", "#e11d48", "#7c3aed"];

/**
 * Convert number to safe numeric value
 */
export function toNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Format value as currency
 */
export function formatCurrency(value) {
    return CURRENCY_FORMATTER.format(toNumber(value));
}

/**
 * Format value as integer
 */
export function formatInteger(value) {
    return NUMBER_FORMATTER.format(toNumber(value));
}

/**
 * Format value as percentage
 */
export function formatPercent(value) {
    return PERCENT_FORMATTER.format(toNumber(value));
}

/**
 * Convert date to local date string (YYYY-MM-DD)
 */
export function toLocalDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Convert date to local datetime string (YYYY-MM-DDTHH:MM)
 */
export function toLocalDateTimeValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Check if key looks like a money field
 */
export function looksLikeMoneyKey(key = "") {
    const lower = String(key).toLowerCase();
    return (
        lower.includes("revenue") ||
        lower.includes("cost") ||
        lower.includes("profit") ||
        lower.includes("price") ||
        lower.includes("amount") ||
        lower.includes("gst") ||
        lower.includes("tax")
    );
}

/**
 * Format cell value based on key type
 */
export function formatCellValue(key, value) {
    if (value === null || value === undefined || value === "") return "-";

    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);

    const lowerKey = String(key).toLowerCase();

    if (lowerKey.includes("margin") || lowerKey.includes("rate") || lowerKey.includes("percent")) {
        const num = toNumber(value);
        return `${num.toFixed(2)}%`;
    }

    if (looksLikeMoneyKey(key)) {
        return formatCurrency(value);
    }

    if (typeof value === "number") {
        return formatInteger(value);
    }

    return String(value);
}

/**
 * Format filter badge value for display
 */
export function formatFilterBadgeValue(key, value) {
    if (!value) return "";

    // For month filter, get month label from analyticsRegistry
    if (key.includes("month")) {
        const monthLabels = {
            1: "January", 2: "February", 3: "March", 4: "April",
            5: "May", 6: "June", 7: "July", 8: "August",
            9: "September", 10: "October", 11: "November", 12: "December"
        };
        return monthLabels[Number(value)] || value;
    }

    return value;
}
