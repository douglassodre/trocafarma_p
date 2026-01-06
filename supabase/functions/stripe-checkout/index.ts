
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { priceId, successUrl, cancelUrl } = await req.json();

        let finalPriceId = priceId;

        // specific product ID from env or hardcoded/request
        // If priceId is not sent, we look up the default price for the hardcoded product
        if (!finalPriceId) {
            const prodId = 'prod_TjhsXi642vGdiH';
            const prices = await stripe.prices.list({ product: prodId, active: true, limit: 1 });
            if (prices.data.length > 0) {
                finalPriceId = prices.data[0].id;
            } else {
                throw new Error('No price found for product ' + prodId);
            }
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: finalPriceId,
                },
            ],
            mode: 'subscription',
            active: true, // Should be implied or not needed for strict setup
            success_url: successUrl ?? 'http://localhost:5173/profile?session_id={CHECKOUT_SESSION_ID}', // Default or passed from client
            cancel_url: cancelUrl ?? 'http://localhost:5173/profile',
            client_reference_id: user.id,
            customer_email: user.email, // Pre-fill email
        });

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
