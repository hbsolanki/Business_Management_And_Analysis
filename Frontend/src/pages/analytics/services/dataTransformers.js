/**
 * Base dashboard structure and generic dashboard builder
 */

/**
 * Create base dashboard structure
 */
export function baseDashboard() {
    return {
        cards: [],
        charts: [],
        table: null,
        extraTables: [],
        summaryEntries: [],
        detailObjects: [],
    };
}
