/**
 * Validation utilities for analytics filters
 */

import { toLocalDateValue, toLocalDateTimeValue } from './formatters';

/**
 * Return minimum of two temporal values
 */
export function minTemporalValue(valueA, valueB) {
    if (!valueA) return valueB || "";
    if (!valueB) return valueA;
    return valueA <= valueB ? valueA : valueB;
}

/**
 * Validate filter values before API call
 */
export function validateFilters(filters) {
    const now = new Date();
    const today = toLocalDateValue(now);
    const nowDateTime = toLocalDateTimeValue(now);

    const fromDate = filters.from_date;
    const toDate = filters.to_date;
    if (fromDate && fromDate > today) {
        return "From Date cannot be in the future.";
    }
    if (toDate && toDate > today) {
        return "To Date cannot be in the future.";
    }
    if (fromDate && toDate && fromDate > toDate) {
        return "From Date cannot be after To Date.";
    }

    const fromDateTime = filters.from_date_and_time;
    const toDateTime = filters.to_date_and_time;
    if (fromDateTime && fromDateTime > nowDateTime) {
        return "From Date & Time cannot be in the future.";
    }
    if (toDateTime && toDateTime > nowDateTime) {
        return "To Date & Time cannot be in the future.";
    }
    if (fromDateTime && toDateTime && fromDateTime > toDateTime) {
        return "From Date & Time cannot be after To Date & Time.";
    }

    const monthCurrentYearChecks = [
        { month: filters.month, year: filters.year, name: "Month/Year" },
        { month: filters.start_month, year: filters.start_year, name: "Start month/year" },
        { month: filters.end_month, year: filters.end_year, name: "End month/year" },
    ];
    for (const item of monthCurrentYearChecks) {
        if (!item.month || !item.year) continue;
        if (
            Number(item.year) === now.getFullYear() &&
            Number(item.month) > now.getMonth() + 1
        ) {
            return `${item.name} cannot be in the future.`;
        }
    }

    const hasRange =
        filters.start_year && filters.start_month && filters.end_year && filters.end_month;

    if (hasRange) {
        const startScore = Number(filters.start_year) * 100 + Number(filters.start_month);
        const endScore = Number(filters.end_year) * 100 + Number(filters.end_month);
        if (startScore > endScore) {
            return "Start month/year cannot be after End month/year.";
        }
    }

    return "";
}

/**
 * Normalize filter value to prevent future dates
 */
export function normalizeFutureFilterValue(key, value) {
    if (value === "" || value === null || value === undefined) return value;

    const now = new Date();
    const today = toLocalDateValue(now);
    const nowDateTime = toLocalDateTimeValue(now);

    if (key === "from_date" || key === "to_date") {
        return value > today ? today : value;
    }

    if (key === "from_date_and_time" || key === "to_date_and_time") {
        return value > nowDateTime ? nowDateTime : value;
    }

    return value;
}
