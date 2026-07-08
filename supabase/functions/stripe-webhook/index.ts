
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const getSupabaseAdmin = () => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    return createClient(supabaseUrl, supabaseServiceKey);
};

const updateProfileByUserId = async (
    userId: string,
    values: Record<string, unknown>,
) => {
    const { error } = await getSupabaseAdmin()
        .from('perfis_usuarios')
        .update(values)
        .eq('id', userId);

    if (error) {
        throw error;
    }
};

const updateProfileBySubscription = async (
    subscription: Stripe.Subscription,
    values: Record<string, unknown> = {},
) => {
    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    const payload = {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        is_premium: ['active', 'trialing'].includes(subscription.status),
        ...values,
    };

    const supabase = getSupabaseAdmin();
    const userId = subscription.metadata?.supabase_user_id;

    if (userId) {
        const { error } = await supabase
            .from('perfis_usuarios')
            .update(payload)
            .eq('id', userId);

        if (error) {
            throw error;
        }

        return;
    }

    const filters = [`stripe_subscription_id.eq.${subscription.id}`];
    if (customerId) {
        filters.push(`stripe_customer_id.eq.${customerId}`);
    }

    const { error } = await supabase
        .from('perfis_usuarios')
        .update(payload)
        .or(filters.join(','));

    if (error) {
        throw error;
    }
};

serve(async (req) => {
    try {
        const signature = req.headers.get('Stripe-Signature');
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

        if (!webhookSecret) {
            console.error('Missing STRIPE_WEBHOOK_SECRET');
            return new Response('Server Configuration Error', { status: 500 });
        }

        if (!signature) {
            return new Response('Missing Stripe signature', { status: 400 });
        }

        const body = await req.text();

        let event: Stripe.Event;
        try {
            event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
        } catch (err) {
            console.error(`Webhook signature verification failed.`, err.message);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.client_reference_id;

                if (userId) {
                    await updateProfileByUserId(userId, {
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: session.subscription,
                        is_premium: true,
                        subscription_status: 'trialing',
                    });
                }
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await updateProfileBySubscription(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await updateProfileBySubscription(subscription, {
                    is_premium: false,
                    subscription_status: 'canceled',
                });
                break;
            }

            case 'customer.subscription.trial_will_end': {
                const subscription = event.data.object as Stripe.Subscription;
                await updateProfileBySubscription(subscription);
                console.log('Trial ending soon for subscription:', subscription.id);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = typeof invoice.subscription === 'string'
                    ? invoice.subscription
                    : invoice.subscription?.id;

                if (subscriptionId) {
                    const { error } = await getSupabaseAdmin()
                        .from('perfis_usuarios')
                        .update({
                            is_premium: false,
                            subscription_status: 'payment_failed',
                        })
                        .eq('stripe_subscription_id', subscriptionId);

                    if (error) {
                        throw error;
                    }
                }
                break;
            }

            default: {
                console.log('Unhandled Stripe event:', event.type);
            }
        }

        return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});
