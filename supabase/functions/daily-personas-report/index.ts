
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1. Environment Variables & Constants
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
const VERCEL_TOKEN = Deno.env.get("VERCEL_TOKEN");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TARGET_EMAIL = "contato@trocafarma.com";

// 2. Initialize Clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 3. Helper Functions

/**
 * Fetch recent commits from GitHub
 */
async function getGitHubCommits(since: string) {
    if (!GITHUB_TOKEN) return "GitHub Token não configurado.";
    try {
        const res = await fetch(`https://api.github.com/repos/douglassodre/trocafarma_p/commits?since=${since}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "User-Agent": "Trocafarma-Daily-Report"
            }
        });
        if (!res.ok) return "Erro ao buscar commits.";
        const commits = await res.json();
        if (!Array.isArray(commits) || commits.length === 0) return "Nenhum deploy/commit nas últimas 24h.";

        return commits.map((c: any) => `- [${c.sha.substring(0, 7)}] ${c.commit.message} (por ${c.commit.author.name})`).join("\n");
    } catch (e) {
        console.error("GitHub Error:", e);
        return "Erro de conexão com GitHub.";
    }
}

/**
 * Fetch Vercel Deployments
 */
async function getVercelDeployments() {
    if (!VERCEL_TOKEN) return "Vercel Token não configurado.";
    try {
        // Step A: Find Project ID for 'trocafarma'
        const projectsRes = await fetch("https://api.vercel.com/v9/projects?search=trocafarma", {
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
        });

        if (!projectsRes.ok) return "Erro ao listar projetos Vercel.";
        const projectsData = await projectsRes.json();
        const project = projectsData.projects?.find((p: any) => p.name.includes("trocafarma"));

        if (!project) return "Projeto Vercel 'trocafarma' não encontrado.";

        // Step B: Get recent deployments
        const deploymentsRes = await fetch(`https://api.vercel.com/v6/deployments?projectId=${project.id}&limit=3`, {
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
        });

        if (!deploymentsRes.ok) return "Erro ao buscar deploys Vercel.";
        const deployments = await deploymentsRes.json();

        if (!deployments.deployments || deployments.deployments.length === 0) return "Nenhum deploy recente.";

        return deployments.deployments.map((d: any) => {
            const state = d.state; // READY, ERROR, BUILDING
            const date = new Date(d.created).toLocaleString('pt-BR');
            return `- [${state}] ${date} (${d.target || 'production'}) - ${d.url}`;
        }).join("\n");

    } catch (e) {
        console.error("Vercel Error:", e);
        return "Erro de conexão com Vercel.";
    }
}

/**
 * Get Gemini commentary for a persona
 */
async function getPersonaCommentary(roleTitle: string, systemInstruction: string, statsText: string) {
    if (!GEMINI_API_KEY) {
        return "Nota: API Key do Gemini não configurada. Impossível gerar análise detalhada.";
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `
              ${systemInstruction}
              
              Aqui está o relatório do dia:
              ${statsText}

              Diretor, qual a sua análise? (Responda de forma direta e concisa, max 3 parágrafos curtos)
            `
                    }]
                }]
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error:", data.error);
            return `Erro ao gerar análise: ${data.error.message}`;
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem análise gerada.";
    } catch (error) {
        console.error("Gemini Request Error:", error);
        return "Não foi possível conectar à IA para gerar a análise.";
    }
}

// 4. Main Server Handler
serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { target_email } = await req.json().catch(() => ({}));
        const finalEmail = target_email || TARGET_EMAIL;

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayISO = yesterday.toISOString();

        // 1. Gather Data (Parallel Queries)
        const [
            { count: activeAds },
            { count: newAds },
            { count: newUsers },
            { data: transactions },
            { count: failedTransactions },
            { data: newUsersData },
            commitLogs,
            vercelStatus
        ] = await Promise.all([
            supabase.from("anuncios").select("*", { count: "exact", head: true }).eq("status", "ativo"),
            supabase.from("anuncios").select("*", { count: "exact", head: true }).gt("created_at", yesterdayISO),
            supabase.from("perfis_usuarios").select("*", { count: "exact", head: true }).gt("created_at", yesterdayISO),
            supabase.from("transacoes").select("valor_economizado, status").gt("created_at", yesterdayISO),
            supabase.from("transacoes").select("*", { count: "exact", head: true }).eq("status", "erro").gt("created_at", yesterdayISO),
            supabase.from("perfis_usuarios").select("cidade, estado").gt("created_at", yesterdayISO).limit(5),
            getGitHubCommits(yesterdayISO),
            getVercelDeployments()
        ]);

        // Calculate Value Moved
        const valueMoved = transactions
            ?.filter(t => t.status === 'CONCLUIDO' || t.status === 'concluida')
            .reduce((acc, curr) => acc + (curr.valor_economizado || 0), 0) || 0;

        const transactionCount = transactions?.length || 0;

        // Format 'Relatório do Dia' text for AI
        const locationSummary = newUsersData?.map(u => `${u.cidade}/${u.estado}`).join(", ") || "Nenhuma localização registrada";

        const statsText = `
    Relatório do Dia (${today.toLocaleDateString('pt-BR')}):
    - Total de Anúncios Ativos: ${activeAds || 0}
    - Total de Novos Anúncios (24h): ${newAds || 0}
    - Itens trocados (Transações) hoje: ${transactionCount}
    - Valor transacionado (Economia Gerada): R$ ${valueMoved.toFixed(2)}
    - Novos usuários cadastrados: ${newUsers || 0}
    - Localização de novos usuários (amostra): ${locationSummary}
    - Transações com erro/falha: ${failedTransactions || 0}
    `;

        // 2. Generate Personas Commentary with specific System Instructions

        // Diretor Comercial
        const commercialPrompt = `
      Você é o Diretor Comercial do trocafarma. Sua mentalidade é focada em crescimento (growth) e ROI. Você analisa dados de tráfego, conversão e métricas.
      Suas responsabilidades:
      - Analisar se o custo para atrair um novo hospital/farmácia está saudável (considere novos usuários vs anúncios).
      - Sugerir melhorias na cópia (texto) de vendas com base no comportamento.
      - Identificar oportunidades de parcerias.
      Tom de voz: Energético, focado em resultados, direto e persuasivo. Sempre sugira um movimento de marketing prático após analisar os dados.
    `;
        const commercialCommentary = await getPersonaCommentary(
            "Diretor Comercial",
            commercialPrompt,
            statsText
        );

        // Delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Diretor de Negócios
        const businessPrompt = `
      Você é o Diretor de Negócios do trocafarma. Você é um estrategista que entende profundamente o mercado de saúde, especialmente na Bahia e em Salvador.
      Suas responsabilidades:
      - Observar o volume de itens cadastrados e a 'liquidez' (quão rápido um item é trocado).
      - Monitorar a retenção de clientes e o faturamento.
      - Cruzar dados internos com o mercado externo.
      Tom de voz: Analítico, cauteloso, visão de longo prazo e focado em parcerias estratégicas. Foque em como tornar o trocafarma indispensável.
    `;
        const businessCommentary = await getPersonaCommentary(
            "Diretor de Negócios",
            businessPrompt,
            statsText
        );

        // Delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Diretor de Tecnologia
        const techPrompt = `
      Você é o CTO do trocafarma. Você vive nos logs do Supabase e na monitorização das APIs.
      Suas responsabilidades:
      - Identificar padrões de erro nos logs e sugerir correções imediatas.
      - Comentar sobre as atualizações recentes de código (deploys e commits) e como elas impactam o sistema.
      - Vigiar a latência do sistema e o status da Vercel (Front-end).
      - Avaliar infraestrutura.
      
      Aqui estão os commits do GitHub (últimas 24h):
      ${commitLogs}

      Aqui está o status dos últimos deploys na Vercel:
      ${vercelStatus}

      Tom de voz: Técnico, pragmático, preventivo e organizado. Valoriza código limpo.
      Se houver falha na Vercel, ALERTE IMEDIATAMENTE.
      Se houver novos commits, relacione com o status do deploy.
    `;
        const techCommentary = await getPersonaCommentary(
            "Diretor de Tecnologia",
            techPrompt,
            statsText
        );

        // 3. Format Email HTML
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #004d40; border-bottom: 2px solid #004d40; padding-bottom: 10px;">Relatório Diário Trocafarma</h1>
        <p>Data: <strong>${today.toLocaleDateString('pt-BR')}</strong></p>

        <div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ccc;">
          <h3 style="margin-top:0;">📊 Dados do Dia</h3>
          <pre style="white-space: pre-wrap; font-family: monospace; color: #555;">${statsText.trim()}</pre>
        </div>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #d81b60; margin-top: 0;">👔 Diretor Comercial</h2>
          <blockquote style="border-left: 4px solid #d81b60; padding-left: 10px; font-style: italic; background: #fff; padding: 10px;">
            ${commercialCommentary.replace(/\n/g, '<br>')}
          </blockquote>
        </div>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1e88e5; margin-top: 0;">💼 Diretor de Negócios</h2>
          <blockquote style="border-left: 4px solid #1e88e5; padding-left: 10px; font-style: italic; background: #fff; padding: 10px;">
             ${businessCommentary.replace(/\n/g, '<br>')}
          </blockquote>
        </div>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #43a047; margin-top: 0;">👨‍💻 Diretor de Tecnologia</h2>
          <blockquote style="border-left: 4px solid #43a047; padding-left: 10px; font-style: italic; background: #fff; padding: 10px;">
             ${techCommentary.replace(/\n/g, '<br>')}
          </blockquote>
        </div>
        
        <p style="font-size: 12px; color: #888; text-align: center;">Gerado automaticamente por Trocafarma AI Agents (Powered by Gemini Flash Latest).</p>
      </div>
    `;

        // 4. Send Email via Resend
        if (RESEND_API_KEY) {
            const resendRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: "Trocafarma Relatórios <onboarding@resend.dev>", // Change this if you have a verified domain
                    to: [finalEmail],
                    subject: `Relatório Trocafarma - ${today.toLocaleDateString('pt-BR')}`,
                    html: htmlContent,
                }),
            });

            if (!resendRes.ok) {
                const errData = await resendRes.json();
                console.error("Resend Error:", errData);
                throw new Error(`Falha ao enviar email: ${JSON.stringify(errData)}`);
            }
        } else {
            console.log("RESEND_API_KEY not set. Skipping email send.");
            // Return JSON for testing if no email key
            return new Response(JSON.stringify({
                message: "Report generated but not sent (No Email Key)",
                statsText,
                commentaries: { commercialCommentary, businessCommentary, techCommentary }
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ message: "Relatório enviado com sucesso!" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

