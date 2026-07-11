import Stripe from "npm:stripe@^14.25.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Cache-Control': 'public, max-age=300, s-maxage=300',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        const priceId = Deno.env.get('STRIPE_PRICE_ID');
        if (!stripeKey || !priceId) throw new Error('Configuração de preço indisponível.');

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            typescript: true,
        });
        const price = await stripe.prices.retrieve(priceId);

        if (!price.active || price.unit_amount === null) {
            throw new Error('Preço da assinatura indisponível.');
        }

        return new Response(JSON.stringify({
            price_id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval || 'month',
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Erro ao consultar preço Stripe:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
