export function normalizeListPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
}

export function extractFirstError(error, fallbackMessage) {
    const payload = error?.response?.data || error?.data;
    if (!payload) return fallbackMessage;

    if (typeof payload === "string") return payload;

    if (Array.isArray(payload)) {
        for (const item of payload) {
            if (typeof item === "string") return item;
            if (typeof item === "object") {
                const found = extractFirstError({ data: item }, null);
                if (found) return found;
            }
        }
    }

    if (typeof payload === "object") {
        for (const value of Object.values(payload)) {
            if (typeof value === "string") return value;
            if (Array.isArray(value)) {
                for (const item of value) {
                    if (typeof item === "string") return item;
                    if (typeof item === "object") {
                        const found = extractFirstError({ data: item }, null);
                        if (found) return found;
                    }
                }
            }
            if (typeof value === "object" && value !== null) {
                const found = extractFirstError({ data: value }, null);
                if (found) return found;
            }
        }
    }

    return fallbackMessage;
}

export function parsePositiveInt(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    return parsed;
}

