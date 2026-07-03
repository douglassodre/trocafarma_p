import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_KEY = '83ff6443ed4c28a1922c37923153e8e6';
// CPF API (Legacy/Paid)
const CPF_BASE_URL = `https://api.cpfcnpj.com.br/${API_KEY}`;
// CNPJ API (BrasilAPI - Open)
const BRASIL_API_BASE = 'https://brasilapi.com.br/api/cnpj/v1';

// Helper to remove non-numeric chars
const strip = (val) => val.replace(/\D/g, '');

export const apiService = {
    /**
     * Validate and fetch CNPJ data via BrasilAPI
     * @param {string} cnpj 
     * @returns {Promise<object>} Institution data or throws error
     */
    fetchCNPJData: async (cnpj) => {
        const cleanCNPJ = strip(cnpj);
        if (!cleanCNPJ) throw new Error('CNPJ inválido');

        try {
            const response = await axios.get(`${BRASIL_API_BASE}/${cleanCNPJ}`);
            console.log('BrasilAPI CNPJ Response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar CNPJ (BrasilAPI):', error);
            throw error;
        }
    },

    /**
     * Validate and fetch CPF data (to get Name)
     * @param {string} cpf 
     * @returns {Promise<object>} User data or throws error
     */
    fetchCPFData: async (cpf) => {
        const cleanCPF = strip(cpf);
        if (!cleanCPF) throw new Error('CPF inválido');

        try {
            // Type 2 query (Dados da pessoa)
            const response = await axios.get(`${CPF_BASE_URL}/2/json/${cleanCPF}`);
            console.log('CPF Response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar CPF:', error);
            throw error;
        }
    },

    searchMedication: async (query) => {
        if (!query || query.length < 3) return [];

        try {
            // 2. Official Catalog Search (Supabase)
            // Using 'ilike' for case-insensitive partial match
            const { data, error } = await supabase
                .from('catalogo_itens')
                .select('*')
                .ilike('descricao_oficial', `%${query}%`)
                .limit(20);

            if (error) {
                console.error('Erro ao buscar no catálogo:', error);
                return [];
            }

            // Map to Autocomplete format directly here or return raw data?
            // Autocomplete expects: { content: [...] } based on previous usage in NewAd.jsx
            // But NewAd.jsx now handles mapping?
            // Let's look at NewAd.jsx mapping again.
            // NewAd.jsx: "if (result && result.content) { return result.content.map(...) }"
            // OpenBula structure was { content: [] }.
            // We should adapt this service to return that structure OR change NewAd.jsx.
            // Let's keep it compatible: return { content: data mapped to similar structure }

            // OpenBula item: { nomeProduto, numProcesso }
            // Catalog item: { nome, descricao_oficial, codigo, categoria }

            const mappedContent = data.map(item => ({
                nomeProduto: item.descricao_oficial,
                numProcesso: item.codigo
            }));

            return { content: mappedContent };

        } catch (error) {
            console.error('Erro no serviço de busca:', error);
            return { content: [] };
        }
    }
};
