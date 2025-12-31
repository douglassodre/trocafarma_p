
import { getSupabaseClient } from './get_client.js';

async function debugSchema() {
    console.log("=== Debugging Schema ===");
    const supabase = await getSupabaseClient();

    // 1. Check Transacoes (for My Requests)
    const { data: trans, error: transError } = await supabase
        .from('transacoes')
        .select('*')
        .limit(1);

    if (transError) console.error("Transacoes Error:", transError.message);
    else if (trans.length > 0) console.log("Transacoes Sample:", Object.keys(trans[0]));
    else console.log("Transacoes table exists but is empty.");

    // 2. Check Instituicoes (for Phone/Hours)
    const { data: inst, error: instError } = await supabase
        .from('instituicoes')
        .select('*')
        .limit(1);

    if (instError) console.error("Instituicoes Error:", instError.message);
    else if (inst.length > 0) console.log("Instituicoes Sample:", Object.keys(inst[0]));

}

debugSchema();
