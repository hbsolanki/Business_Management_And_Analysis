/**
 * Helper utilities for data transformation and manipulation
 */

import { toNumber } from './formatters';
import { getMonthLabel, SECTION_TO_ENDPOINT_ID } from '../analyticsRegistry';

/**
 * Safely divide two numbers
 */
export function safeDivide(numerator, denominator) {
    const den = toNumber(denominator);
    if (!den) return 0;
    return toNumber(numerator) / den;
}

/**
 * Sum array of objects by property key
 */
export function sumBy(rows, key) {
    return rows.reduce((sum, item) => sum + toNumber(item[key]), 0);
}

/**
 * Normalize rows to valid array of objects
 */
export function normalizeRows(data) {
    if (!Array.isArray(data)) return [];
    return data.filter((row) => row && typeof row === "object");
}

/**
 * Extract rows from API payload
 */
export function readRows(payload, arrayKey) {
    if (Array.isArray(payload)) return normalizeRows(payload);
    if (payload && Array.isArray(payload.results)) return normalizeRows(payload.results);
    if (arrayKey && payload && Array.isArray(payload[arrayKey])) return normalizeRows(payload[arrayKey]);
    return [];
}

/**
 * Get resolved endpoint ID from route/query parameters
 */
export function getResolvedEndpointId(routeId, searchParams, fallbackId = "month-breakdown") {
    if (routeId) return routeId;

    const section = searchParams.get("section");
    if (section && SECTION_TO_ENDPOINT_ID[section]) return SECTION_TO_ENDPOINT_ID[section];

    const queryApi = searchParams.get("api");
    if (queryApi) return queryApi;

    return fallbackId;
}

/**
 * Convert snake_case to Title Case
 */
export function toTitleCase(text) {
    if (!text) return "";
    return String(text)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Build period label from row data
 */
export function buildPeriodLabel(row, index) {
    if (!row || typeof row !== "object") return `Period ${index + 1}`;
    if (row.month && row.year && Number(row.month) >= 1 && Number(row.month) <= 12) {
        return `${getMonthLabel(row.month)} ${row.year}`;
    }
    if (row.month_name && row.year) return `${row.month_name} ${row.year}`;
    if (row.date) {
        const parsed = new Date(row.date);
        if (!Number.isNaN(parsed.getTime())) {
            return `${getMonthLabel(parsed.getMonth() + 1)} ${parsed.getFullYear()}`;
        }
    }
    return `Period ${index + 1}`;
}

/**
 * Get top N rows sorted by key
 */
export function topRows(rows, key, limit = 10) {
    return [...rows].sort((a, b) => toNumber(b[key]) - toNumber(a[key])).slice(0, limit);
}

/**
 * Extract error detail message from error object
 */
export function getErrorDetail(err) {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (err.response?.data?.detail) return String(err.response.data.detail);
    if (err.response?.data?.message) return String(err.response.data.message);
    if (err.response?.data?.error) return String(err.response.data.error);
    if (err.message) return String(err.message);
    return "";
}

/**
 * Check if error indicates no data found
 */
export function isNoDataError(err) {
    if (!err) return false;
    const detail = getErrorDetail(err).toLowerCase();
    return (
        detail.includes("no data") ||
        detail.includes("data not found") ||
        detail.includes("not found for") ||
        detail.includes("no results") ||
        detail.includes("no records") ||
        detail.includes("no sales") ||
        (err.response?.status === 404)
    );
}
