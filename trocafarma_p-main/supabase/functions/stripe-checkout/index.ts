// Setup native Deno serve with npm specifiers
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import Stripe from "npm:stripe@^14.25.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body: Record<string, unknown>, status = 200) => {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
};

const getRequiredEnv = (name: string) => {
    const value = Deno.env.get(name);
    if (!value) {
        throw new Error(`Missing ${name} in environment variables.`);
    }

    return value;
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const stripeKey = getRequiredEnv('STRIPE_SECRET_KEY');
        const priceId = getRequiredEnv('STRIPE_PRICE_ID');
        const envSuccessUrl = getRequiredEnv('STRIPE_CHECKOUT_SUCCESS_URL');
        const envCancelUrl = getRequiredEnv('STRIPE_CHECKOUT_CANCEL_URL');

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
            return jsonResponse({ error: 'Unauthorized' }, 401)
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            typescript: true,
        });

        const rawBody = await req.text();

        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            throw new Error("Invalid JSON body");
        }

        const { userId, email, successUrl, cancelUrl } = body;

        const isProduction = Deno.env.get('ENVIRONMENT') === 'production' || Deno.env.get('DENO_DEPLOYMENT_ID');
        const finalSuccessUrl = isProduction ? envSuccessUrl : (successUrl ?? envSuccessUrl);
        const finalCancelUrl = isProduction ? envCancelUrl : (cancelUrl ?? envCancelUrl);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['boleto', 'card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            subscription_data: {
                trial_period_days: 10,
                metadata: {
                    supabase_user_id: userId || user?.id,
                },
            },
            success_url: finalSuccessUrl,
            cancel_url: finalCancelUrl,
            client_reference_id: userId || user?.id,
            customer_email: email || user?.email,
        });

        return jsonResponse({ sessionId: session.id, url: session.url })
    } catch (error) {
        console.error("Critical Error in stripe-checkout:", error.message);
        return jsonResponse({ error: error.message }, 400)
    }
})
