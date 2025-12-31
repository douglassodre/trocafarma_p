
import fs from 'fs';
import csv from 'csv-parser';
import iconv from 'iconv-lite';
import { getSupabaseClient } from './get_client.js';

const FILES_TO_IMPORT = [
    {
        filename: 'scripts/DADOS_ABERTOS_MEDICAMENTOS.csv',
        category: 'MEDICAMENTO',
        col_codigo: ['NUMERO_REGISTRO_PRODUTO', 'REGISTRO'],
        col_nome: ['NOME_PRODUTO', 'NOME_MEDICAMENTO'],
        col_categoria: []
    },
    {
        filename: 'scripts/DADOS_ALIMETOS.CSV',
        category: 'ALIMENTO',
        col_codigo: ['NU_REGISTRO', 'REGISTRO'],
        col_nome: ['NO_PRODUTO', 'NOME_PRODUTO'],
        col_categoria: ['DS_CATEGORIA_PRODUTO']
    },
    {
        filename: 'scripts/DADOS_MATERIAIS.csv',
        category: 'MATERIAL',
        col_codigo: ['NUMERO_REGISTRO_CADASTRO', 'REGISTRO'],
        col_nome: ['NOME_TECNICO', 'NOME_PRODUTO', 'NOME_COMERCIAL'],
        col_categoria: []
    }
];

const BATCH_SIZE = 500;

async function importData() {
    console.log("Iniciando importação unificada (V3 - Deduplicada)...");
    const supabase = await getSupabaseClient();

    for (const fileConfig of FILES_TO_IMPORT) {
        if (!fs.existsSync(fileConfig.filename)) {
            console.warn(`Arquivo não encontrado: ${fileConfig.filename} - Pulando.`);
            continue;
        }

        console.log(`Processando: ${fileConfig.filename} (${fileConfig.category})...`);

        await new Promise((resolve) => {
            const results = [];
            fs.createReadStream(fileConfig.filename)
                .pipe(iconv.decodeStream('win1252'))
                .pipe(csv({ separator: ';' }))
                .on('data', (data) => {
                    // Find correct columns
                    const codigoKey = fileConfig.col_codigo.find(key => data[key]);
                    const nomeKey = fileConfig.col_nome.find(key => data[key]);

                    // Category logic: Try specific column, else fallback to generic
                    let categoriaVal = fileConfig.category;
                    if (fileConfig.col_categoria && fileConfig.col_categoria.length > 0) {
                        const catKey = fileConfig.col_categoria.find(key => data[key]);
                        if (catKey && data[catKey]) {
                            categoriaVal = data[catKey];
                        }
                    }

                    const codigo = codigoKey ? data[codigoKey] : null;
                    const nome = nomeKey ? data[nomeKey] : null;

                    if (codigo && nome) {
                        results.push({
                            codigo: codigo.replace(/\D/g, ''), // Clean non-digits
                            descricao_oficial: nome,
                            categoria: categoriaVal
                        });
                    }
                })
                .on('end', async () => {
                    console.log(`Lido ${results.length} registros de ${fileConfig.category}. Removendo duplicatas...`);

                    // Deduplicate results by 'codigo' to avoid batch upsert errors
                    const uniqueResults = [...new Map(results.map(item => [item.codigo, item])).values()];
                    console.log(`Registros únicos: ${uniqueResults.length} (Removidos ${results.length - uniqueResults.length}). Iniciando inserção...`);

                    // Process in chunks
                    for (let i = 0; i < uniqueResults.length; i += BATCH_SIZE) {
                        const chunk = uniqueResults.slice(i, i + BATCH_SIZE);
                        const { error } = await supabase
                            .from('catalogo_itens')
                            .upsert(chunk, { onConflict: 'codigo' }); // Removed ignoreDuplicates: false to imply update

                        if (error) {
                            console.error(`Erro no lote ${i} (${fileConfig.category}):`, JSON.stringify(error));
                        } else {
                            if (i % 5000 === 0) console.log(`  > Processado ${i}...`);
                        }
                    }
                    console.log(`[OK] ${fileConfig.category} finalizado.`);
                    resolve();
                });
        });
    }
    console.log("Importação geral concluída!");
}

importData();
