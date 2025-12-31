
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export async function getSupabaseClient() {
    // Hardcoded from src/lib/supabase.js for script execution stability
    const url = 'https://sfbmelnwdslnyyyzxlzb.supabase.co';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm1lbG53ZHNsbnl5eXp4bHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NTU1NDIsImV4cCI6MjA4MjMzMTU0Mn0.FasE7Iahi3RgdR7xm5eCUvzJAeM8s1ibpu-1gDlW76Y';

    if (!url || !key) {
        console.error("Erro: Credenciais do Supabase não encontradas.");
        process.exit(1);
    }

    return createClient(url, key);
}
