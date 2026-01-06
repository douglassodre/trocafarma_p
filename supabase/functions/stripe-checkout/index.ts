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

        // Initialize Stripe client here, after env var check
        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            typescript: true,
        });

        const rawBody = await req.text();
        console.log('Dados recebidos do frontend (raw):', rawBody);

        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            throw new Error("Invalid JSON body");
        }

        const { userId, email, successUrl, cancelUrl } = body;
        console.log('Parsed User ID:', userId);
        console.log('Parsed successUrl:', successUrl);
        console.log('Parsed cancelUrl:', cancelUrl);

        const PROD_ID = 'prod_TjhsXi642vGdiH';
        let finalPriceId = null;

        console.log('Tentando chamar API do Stripe com o Produto:', PROD_ID);

        // Fetch Price ID using the Stripe client
        const prices = await stripe.prices.list({ product: PROD_ID, active: true, limit: 1 });
        console.log('Resposta do Stripe (Prices):', JSON.stringify(prices));

        if (prices.data && prices.data.length > 0) {
            finalPriceId = prices.data[0].id;
        }

        console.log('Price ID encontrado:', finalPriceId);

        if (!finalPriceId) {
            throw new Error(`Price not found for product ${PROD_ID}. Please ensure the Product ID is correct and has an active Price.`);
        }

        console.log("Creating Checkout Session...");
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: finalPriceId,
                    // quantity: 1, // REMOVED: Metered prices cannot have quantity
                },
            ],
            mode: 'subscription',
            success_url: successUrl ?? 'http://localhost:5173/profile?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: cancelUrl ?? 'http://localhost:5173/profile',
            client_reference_id: userId || user?.id, // Use passed userId or authenticated one
            customer_email: email || user?.email, // Use passed email or authenticated one
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
