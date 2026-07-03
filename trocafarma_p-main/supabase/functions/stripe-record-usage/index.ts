
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

        const { quantity } = await req.json();

        if (!quantity || quantity < 0) {
            return new Response(JSON.stringify({ error: 'Invalid quantity' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Fetch user profile to get Stripe Subscription ID
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: profile, error: dbError } = await supabaseAdmin
            .from('perfis_usuarios')
            .select('stripe_subscription_id')
            .eq('id', user.id)
            .single();

        if (dbError || !profile?.stripe_subscription_id) {
            return new Response(JSON.stringify({ error: 'Subscription not found for this user' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Retrieve subscription items to find the metered item
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        // Assumption: The first item is the metered price item. 
        // Ideally we should filter by price ID if there were multiple items.
        const subscriptionItemId = subscription.items.data[0].id;

        // Create Usage Record
        const usageRecord = await stripe.subscriptionItems.createUsageRecord(
            subscriptionItemId,
            {
                quantity: Math.ceil(quantity), // Stripe expects integer usually, or depends on billing scheme. Safe to ceil if currency units.
                timestamp: Math.ceil(Date.now() / 1000),
                action: 'increment',
            }
        );

        return new Response(
            JSON.stringify(usageRecord),
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
