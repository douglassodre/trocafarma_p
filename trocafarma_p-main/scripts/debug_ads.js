
import { getSupabaseClient } from './get_client.js';
import fs from 'fs';

async function debugAds() {
    let output = "=== DEBUG REPORT ===\n";
    try {
        const supabase = await getSupabaseClient();

        // 1. Fetch Ads with status and user_id
        const { data: ads, error } = await supabase
            .from('anuncios')
            .select('id, status, usuario_id, tipo, item_codigo');

        if (error) {
            output += `ERROR Fetching: ${error.message}\n`;
        } else {
            output += `Total Ads: ${ads.length}\n`;
            ads.forEach(ad => {
                output += `AD: [${ad.id.substring(0, 8)}] Status=${ad.status} User=${ad.usuario_id} Type=${ad.tipo}\n`;
            });
        }

        // 2. Test Join
        output += "\n--- JOIN TEST ---\n";
        const { data: joinAds, error: joinError } = await supabase
            .from('anuncios')
            .select('id, instituicoes (nome_fantasia)')
            .limit(5);

        if (joinError) {
            output += `JOIN ERROR: ${joinError.message}\n`;
            output += `Details: ${JSON.stringify(joinError)}\n`;
        } else {
            output += `Join Success. Rows: ${joinAds.length}\n`;
            joinAds.forEach(ad => {
                output += `AD: [${ad.id.substring(0, 8)}] Inst: ${JSON.stringify(ad.instituicoes)}\n`;
            });
        }

    } catch (e) {
        output += `CRITICAL EXCEPTION: ${e.message}\n`;
    }

    fs.writeFileSync('debug_output.txt', output);
    console.log("Written to debug_output.txt");
}

debugAds();
