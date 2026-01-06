
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with the public key
// Ideally this key should be in .env (VITE_STRIPE_PUBLIC_KEY)
// User provided: pk_test_51SmE6yEeLYdtywYzovc9Y2bcK6pwQzftE91h1paPxQSPvpgsdWul6O9v4yTQgkiVx87o9ATl9zFv8pWiyJwFYcU900nDKwG4Su
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51SmE6yEeLYdtywYzovc9Y2bcK6pwQzftE91h1paPxQSPvpgsdWul6O9v4yTQgkiVx87o9ATl9zFv8pWiyJwFYcU900nDKwG4Su');

/**
 * Activates Premium subscription for the user.
 * Redirects to Stripe Checkout.
 * @param {string} userId
 */
export const activatePremium = async (userId) => {
    try {
        // Get current user email for pre-filling
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
            body: {
                userId: userId, // explicitly passed as requested
                email: user?.email,
                successUrl: window.location.origin,
                cancelUrl: window.location.origin
            }
        });

        if (error) throw error;
        if (!data?.sessionId) throw new Error('No session ID returned');

        const stripe = await stripePromise;
        const { error: stripeError } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
        });

        if (stripeError) throw stripeError;

    } catch (error) {
        console.error('Error activating premium:', error);
        alert('Erro ao ativar Premium: ' + error.message);
    }
};

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
