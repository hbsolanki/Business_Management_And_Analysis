import api from "./api";

export const paymentService = {
    /**
     * Create a payment intent for a specific invoice.
     * @param {string|number} invoiceId - The ID of the invoice to pay.
     * @returns {Promise<{clientSecret: string}>} - The client secret for Stripe.
     */
    createPaymentIntent: async (invoiceId) => {
        const response = await api.post("/invoice/payment/create-intent/", { invoice_id: invoiceId });
        return response.data;
    },
};
