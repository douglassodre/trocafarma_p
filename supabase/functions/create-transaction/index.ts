
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
        // User Client (for RLS-protected reads/inserts that reflect user actions)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // Admin Client (for privileged updates like stripe_customer_id)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }

        const body = await req.json();
        const { anuncio_id, fornecedor_id, quantidade, tipo, data_devolucao_prevista, unit_price } = body;

        // 1. Get User Profile
        const { data: profile, error: profileError } = await supabaseClient
            .from('perfis_usuarios')
            .select('stripe_customer_id, email, nome_completo')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            throw new Error('Profile not found');
        }

        let customerId = profile.stripe_customer_id;

        // Create or Find Customer if not exists
        if (!customerId) {
            console.log("Stripe Customer ID missing. Checking for existing customer by email...");
            const email = profile.email || user.email;

            const existingCustomers = await stripe.customers.list({ email: email, limit: 1 });

            if (existingCustomers.data.length > 0) {
                customerId = existingCustomers.data[0].id;
                console.log("Found existing Stripe customer:", customerId);
            } else {
                console.log("Creating new Stripe Customer for user", user.id);
                const customer = await stripe.customers.create({
                    email: email,
                    name: profile.nome_completo,
                    metadata: { supabase_id: user.id }
                });
                customerId = customer.id;
            }

            // Update Profile with Service Role Key (Bypass RLS)
            const { error: updateError } = await supabaseAdmin
                .from('perfis_usuarios')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id);

            if (updateError) {
                console.error("Failed to update profile with customer ID:", updateError);
                // Continue? If we fail to save ID, next time we might create/find again. 
                // But for THIS transaction, we have a customerId in memory, so we can proceed.
            }
        }

        // 2. Create Transaction in DB (User Client - as it's user action)
        const { data: transaction, error: transactionError } = await supabaseClient
            .from('transacoes')
            .insert([{
                anuncio_id,
                solicitante_id: user.id,
                fornecedor_id,
                status: 'PENDENTE', // Explicitly PENDENTE as per modal logic
                tipo,
                quantidade,
                data_devolucao_prevista,
            }])
            .select()
            .single();

        if (transactionError) throw transactionError;

        // 3. Create Stripe Invoice Item
        if (unit_price && unit_price > 0) {
            console.log(`Creating Invoice Item for ${unit_price} cents`);
            await stripe.invoiceItems.create({
                customer: customerId,
                amount: unit_price * (quantidade || 1),
                currency: 'brl',
                description: `Transação #${transaction.id} - ${tipo} (Item: ${anuncio_id})`,
                metadata: {
                    transaction_id: transaction.id,
                    anuncio_id: anuncio_id
                }
            });
        }

        return new Response(JSON.stringify({ success: true, transaction }), {
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
