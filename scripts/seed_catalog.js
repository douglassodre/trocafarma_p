
import { createClient } from '@supabase/supabase-js'

// Hardcoded for script simplicity or use process.env if available in this context
// Replacing with placeholders - User context usually has these in .env or src/lib/supabase.js
// For a standalone script, I'll ask for them or try to read .env
// Assuming I can use the values from the project setup or I need to read them.
// Since I can't interactively ask, I will try to read .env or use a known pattern.
// Let's first try to construct the script to read from .env if possible, or use the client from src logic?
// Actually, for a standalone node script, importing from 'src/lib/supabase' might fail due to "import" syntax if not configured (package.json has "type": "module", so it might work).

import { getSupabaseClient } from './get_client.js'; // Helper I'll create to avoid hardcoding here

const SEED_DATA = [
    // MEDICAMENTOS COMUNS
    { codigo: '7891058001099', nome: 'DIPIRONA SODICA 500MG/ML SOL OR GT 20ML', categoria: 'MEDICAMENTO' },
    { codigo: '7896112164477', nome: 'DIPIRONA MONOHIDRATADA 1G 10CPR', categoria: 'MEDICAMENTO' },
    { codigo: '7891721015694', nome: 'OMEPRAZOL 20MG 28CAPS', categoria: 'MEDICAMENTO' },
    { codigo: '7896004702084', nome: 'AMOXICILINA 500MG 21CAPS', categoria: 'MEDICAMENTO' },
    { codigo: '7896422505581', nome: 'LOSARTANA POTASSICA 50MG 30CPR', categoria: 'MEDICAMENTO' },
    { codigo: '7897595603887', nome: 'PARACETAMOL 750MG 20CPR', categoria: 'MEDICAMENTO' },
    { codigo: '7891010531510', nome: 'TYLENOL 750MG 20CPR', categoria: 'MEDICAMENTO' },
    { codigo: '7891010505108', nome: 'TYLENOL BEBE 100MG/ML 15ML', categoria: 'MEDICAMENTO' },
    { codigo: '7896658003734', nome: 'CEFTRIAXONA SODICA 1G INJ', categoria: 'MEDICAMENTO' },
    { codigo: '7896004712434', nome: 'ATENOLOL 50MG 30CPR', categoria: 'MEDICAMENTO' },
    { codigo: '7896658028089', nome: 'SIMVASTATINA 20MG 30CPR', categoria: 'MEDICAMENTO' },

    // MATERIAIS HOSPITALARES
    { codigo: 'MAT001', nome: 'SERINGA DESC 10ML LUER SLIP S/AGULHA', categoria: 'MATERIAL' },
    { codigo: 'MAT002', nome: 'AGULHA DESC 25X7 22G 1 CX 100UN', categoria: 'MATERIAL' },
    { codigo: 'MAT003', nome: 'LUVA PROCEDIMENTO LATEX M CX 100UN', categoria: 'MATERIAL' },
    { codigo: 'MAT004', nome: 'GAZE ESTERIL 7,5X7,5 10UN', categoria: 'MATERIAL' },
    { codigo: 'MAT005', nome: 'SORO FISIOLOGICO 0,9% 500ML FR', categoria: 'MATERIAL' },
    { codigo: 'MAT006', nome: 'ATADURA CREPOM 10CM X 1,8M', categoria: 'MATERIAL' }
];

async function seed() {
    console.log("Iniciando carga de dados...");
    const supabase = await getSupabaseClient();

    // Insert with upsert (ignore duplicates based on 'codigo' if unique, or just insert)
    // Assuming 'codigo' is unique or PK. If not, this might duplicate.
    // 'catalogo_itens' definition usually has 'id' PK. 'codigo' might be distinct.

    let successCount = 0;
    let errorCount = 0;

    for (const item of SEED_DATA) {
        // Try to insert, if conflict on codigo, update/ignore
        // We need to check if schema enforces unique 'codigo'. If not, we might create dupes.
        // Let's try to select first to see if exists (safer for script).

        const { data: existing } = await supabase
            .from('catalogo_itens')
            .select('codigo')
            .eq('codigo', item.codigo)
            .maybeSingle();

        if (!existing) {
            const { error } = await supabase
                .from('catalogo_itens')
                .insert([{
                    codigo: item.codigo,
                    descricao_oficial: item.nome, // Mapping nome -> descricao_oficial
                    categoria: item.categoria
                }]);

            if (error) {
                console.error(`Erro ao inserir ${item.nome}:`, JSON.stringify(error, null, 2));
                errorCount++;
            } else {
                console.log(`Inserido: ${item.nome}`);
                successCount++;
            }
        } else {
            console.log(`Já existe: ${item.nome}`);
            // Optional: Update if needed
        }
    }

    console.log(`\nCarga finalizada! Sucessos: ${successCount}, Erros: ${errorCount}`);
}

seed();
