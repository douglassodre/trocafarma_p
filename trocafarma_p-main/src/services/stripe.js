
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripePromise = publishableKey
    ? loadStripe(publishableKey)
    : Promise.resolve(null);

// function activatePremium removed as part of Pay-As-You-Go transition

/**
 * Reports usage (trade value) to Stripe for metered billing.
 * @param {number} quantity - The value of the trade.
 */
export const reportTradeUsage = async (quantity) => {
    try {
        const { data, error } = await supabase.functions.invoke('stripe-record-usage', {
            body: { quantity }
        });

        if (error) throw error;
        console.log('Usage reported:', data);
        return data;
    } catch (error) {
        console.error('Error reporting usage:', error);
        // Don't block the UI flow, just log the error? Or throw?
        // We should probably log it but not stop the user from finalizing if it fails (async).
    }
};
