
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
        // Get current user email for pre-filling and ensure we have an ID
        const { data: { user } } = await supabase.auth.getUser();

        const finalUserId = userId || user?.id;

        if (!finalUserId) {
            throw new Error("User ID not found. Please log in again.");
        }

        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
            body: {
                userId: finalUserId,
                email: user?.email,
                successUrl: window.location.origin,
                cancelUrl: window.location.origin
            }
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No checkout URL returned');

        // Manual redirect as requested
        window.location.href = data.url;

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
