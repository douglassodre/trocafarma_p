// Setup native Deno serve with npm specifiers
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import Stripe from "npm:stripe@^14.25.0";

// Stripe init moved inside handler for safety
// const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', ...);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("Stripe Checkout Function Invoked");

        // Check Env Vars
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeKey) {
            throw new Error("Missing STRIPE_SECRET_KEY in environment variables.");
        }
        console.log("STRIPE_SECRET_KEY check passed (length: " + stripeKey.length + ")");

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
            error: authError
        } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            console.error("Auth Error:", authError);
            return new Response(JSON.stringify({ error: 'Unauthorized', details: authError }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        console.log("User authenticated:", user.id);

        const { priceId, successUrl, cancelUrl } = await req.json();

        let finalPriceId = priceId;

        if (!finalPriceId) {
            console.log("No priceId provided, looking up default product...");
            const prodId = 'prod_TjhsXi642vGdiH';

            // List prices without active:true first to see if it finds anything at all
            const prices = await stripe.prices.list({ product: prodId, limit: 1 });
            console.log("Prices found for product:", prices.data.length);

            if (prices.data.length > 0) {
                finalPriceId = prices.data[0].id;
                console.log("Using Price ID:", finalPriceId);
            } else {
                // If debugging locally, maybe the product doesn't exist?
                console.error(`Product ${prodId} has no prices.`);
                throw new Error(`No price found for product ${prodId}. Please ensure the Product ID is correct and has a Price.`);
            }
        }

        console.log("Creating Checkout Session...");
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: finalPriceId,
                },
            ],
            mode: 'subscription',
            success_url: successUrl ?? 'http://localhost:5173/profile?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: cancelUrl ?? 'http://localhost:5173/profile',
            client_reference_id: user.id,
            customer_email: user.email,
        });

        console.log("Session created:", session.id);

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error("Critical Error in stripe-checkout:", error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            status: 400, // Return 400 so client sees the JSON error body
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
