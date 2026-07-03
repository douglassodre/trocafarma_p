
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
    try {
        const signature = req.headers.get('Stripe-Signature');
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

        if (!webhookSecret) {
            console.error('Missing STRIPE_WEBHOOK_SECRET');
            return new Response('Server Configuration Error', { status: 500 });
        }

        const body = await req.text();

        let event;
        try {
            event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret, undefined, cryptoProvider);
        } catch (err) {
            console.error(`Webhook signature verification failed.`, err.message);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.client_reference_id;
            const customerId = session.customer;
            const subscriptionId = session.subscription;

            if (userId) {
                const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

                const supabase = createClient(supabaseUrl, supabaseServiceKey);

                const { error } = await supabase
                    .from('perfis_usuarios')
                    .update({
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        is_premium: true,
                        subscription_status: 'active'
                    })
                    .eq('id', userId);

                if (error) {
                    console.error('Error updating profile:', error);
                    // We return 200 to Stripe to avoid retries if it's a non-transient DB error, 
                    // but for now 500 is ok to trigger retry in case of transient failure.
                    return new Response('Database Update Failed', { status: 500 });
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});
