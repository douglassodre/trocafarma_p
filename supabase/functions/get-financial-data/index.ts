
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
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }

        const { data: profile } = await supabase
            .from('perfis_usuarios')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        if (!profile?.stripe_customer_id) {
            return new Response(JSON.stringify({ upcoming: null, history: [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const customerId = profile.stripe_customer_id;

        // 1. Get Upcoming Invoice (Current Month Accumulation)
        let upcomingInvoice = null;
        try {
            upcomingInvoice = await stripe.invoices.retrieveUpcoming({
                customer: customerId,
            });
        } catch (e) {
            // No upcoming invoice usually means no pending items or subscription
            console.log("No upcoming invoice found or error:", e.message);
        }

        // 2. Get Past Invoices
        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: 12, // Last 12 invoices
            status: 'paid', // Or 'open', 'paid', 'uncollectible', 'void' - maybe show all?
            // expanding data if needed
        });

        // Also fetch open invoices separately if needed, but 'list' returns all non-draft by default if status not filtered too strictly?
        // Actually default list returns all. Let's filter in frontend or fetch all.
        // Let's fetch all relevant statuses.
        const allInvoices = await stripe.invoices.list({
            customer: customerId,
            limit: 20
        });


        return new Response(JSON.stringify({
            upcoming: upcomingInvoice,
            history: allInvoices.data
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
