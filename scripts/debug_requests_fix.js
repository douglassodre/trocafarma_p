
import { getSupabaseClient } from './get_client.js';

async function debugRequestsFix() {
    console.log("=== Debugging Requests Query Fix ===");
    const supabase = await getSupabaseClient();

    const { data: all } = await supabase.from('transacoes').select('*').limit(1);

    if (all && all.length > 0) {
        const userId = all[0].solicitante_id;
        console.log("Testing Fix for User:", userId);

        // Corrected Query: removed :usuario_id alias/key hint
        const { data: complex, error: complexErr } = await supabase
            .from('transacoes')
            .select(`
                *,
                anuncios:anuncio_id (
                    descricao_customizada,
                    item_codigo,
                    tipo,
                    logistica,
                    cidade,
                    estado,
                    instituicoes (
                        nome_fantasia
                    )
                )
            `)
            .eq('solicitante_id', userId);

        if (complexErr) {
            console.error("FIX QUERY ERROR:", complexErr);
        } else {
            console.log("Fix Query Success. Rows:", complex?.length);
            if (complex.length > 0) {
                console.log("Nested Anuncio:", JSON.stringify(complex[0].anuncios, null, 2));
            }
        }
    } else {
        console.log("No transactions to test with.");
    }
}

debugRequestsFix();
