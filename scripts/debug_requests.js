
import { getSupabaseClient } from './get_client.js';

async function debugRequests() {
    console.log("=== Debugging Requests Query ===");
    const supabase = await getSupabaseClient();

    // 1. Simple Fetch (Check if any exist)
    const { data: all, error: simpleErr } = await supabase
        .from('transacoes')
        .select('*');

    console.log("All Transacoes:", all?.length);
    if (simpleErr) console.error("Simple Error:", simpleErr);
    if (all && all.length > 0) console.log("Sample Transacao:", all[0]);

    // 2. Complex Fetch (The one in MyRequests)
    // We don't have 'user.id' here easily unless we hardcode one from the sample above
    if (all && all.length > 0) {
        const userId = all[0].solicitante_id;
        console.log("Testing Complex Query for User:", userId);

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
                    instituicoes:usuario_id (
                        nome_fantasia
                    )
                )
            `)
            .eq('solicitante_id', userId);

        if (complexErr) {
            console.error("COMPLEX QUERY ERROR:", complexErr);
        } else {
            console.log("Complex Query Success. Rows:", complex?.length);
            // Check if nested data came through
            if (complex.length > 0) {
                console.log("Nested Anuncio:", complex[0].anuncios);
            }
        }
    }
}

debugRequests();
