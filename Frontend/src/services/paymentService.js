import api from "./api";

export const paymentService = {
    // ──────────────────────────────────────────────────────────
    // Stripe Connect — Business onboarding
    // ──────────────────────────────────────────────────────────

    /** Step 1+2: Create connect account + return onboarding URL */
    enableOnlinePayments: async () => {
        const res = await api.post("/payment/connect/enable");
        return res.data; // { onboarding_url }
    },

    /** After owner returns from Stripe — sync account status */
    getConnectReturnStatus: async () => {
        const res = await api.get("/payment/connect/return");
        return res.data;
    },

    /** Generate a fresh onboarding link if the previous expired */
    refreshOnboardingLink: async () => {
        const res = await api.get("/payment/connect/refresh");
        return res.data; // { onboarding_url }
    },

    /** Check current Stripe Connect status */
    getConnectStatus: async () => {
        const res = await api.get("/payment/connect/status");
        return res.data;
    },

    // ──────────────────────────────────────────────────────────
    // Invoice Payments
    // ──────────────────────────────────────────────────────────

    /** Initiate Stripe Checkout for an invoice → returns checkout_url */
    initiateInvoiceOnlinePayment: async (invoiceId, notes = "", successUrl = "", cancelUrl = "") => {
        const res = await api.post("/payment/invoice/initiate-online", {
            invoice: invoiceId,
            notes,
            success_url: successUrl || undefined,
            cancel_url: cancelUrl || undefined,
        });
        return res.data; // { checkout_url, payment_id }
    },

    /** Record an offline payment (CASH/CHEQUE/NEFT/RTGS/IMPS/UPI) */
    recordOfflinePayment: async ({ invoiceId, method, amount, referenceNumber, notes }) => {
        const res = await api.post("/payment/invoice/record-offline", {
            invoice: invoiceId,
            method,
            amount,
            reference_number: referenceNumber,
            notes,
        });
        return res.data;
    },

    /** List all invoice payments for this business */
    listInvoicePayments: async (params = {}) => {
        const res = await api.get("/payment/invoice", { params });
        return res.data;
    },

    /** Refund a payment */
    refundPayment: async ({ paymentId, amount, reason }) => {
        const res = await api.post("/payment/invoice/refund", {
            payment: paymentId,
            amount,
            reason,
        });
        return res.data;
    },

    /** Sync Stripe payment status for an invoice (localhost fallback / webhook delay) */
    syncInvoicePaymentStatus: async (invoiceId) => {
        const res = await api.post("/payment/invoice/sync-status", {
            invoice: invoiceId,
        });
        return res.data; // { status, detail }
    },

    // ──────────────────────────────────────────────────────────
    // Subscription Payments
    // ──────────────────────────────────────────────────────────

    /** Initiate subscription checkout (admin) → returns checkout_url */
    initiateSubscriptionPayment: async (subscriptionId, successUrl = "", cancelUrl = "") => {
        const res = await api.post("/payment/subscription/initiate", {
            subscription_id: subscriptionId,
            success_url: successUrl || undefined,
            cancel_url: cancelUrl || undefined,
        });
        return res.data; // { checkout_url, subscription_id }
    },

    /** List all payment records */
    listPayments: async (params = {}) => {
        const res = await api.get("/payment", { params });
        return res.data;
    },
};
