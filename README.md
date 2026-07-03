# Trocafarma. 💊

Bem-vindo ao **Trocafarma**, uma plataforma dedicada à doação e troca de medicamentos e itens farmacêuticos, facilitando o acesso e evitando o desperdício.

## 📋 Sobre o Projeto

O Trocafarma conecta doadores a quem precisa, permitindo o cadastro de medicamentos, solicitação de itens e gerenciamento de devoluções. O sistema conta com áreas para usuários comuns e perfis administrativos/operadores.

## 🚀 Tecnologias Utilizadas

Este projeto foi desenvolvido com as seguintes tecnologias principais:

- **[React](https://react.dev/)**: Biblioteca JavaScript para construção de interfaces.
- **[Vite](https://vitejs.dev/)**: Build tool rápida e leve.
- **[Tailwind CSS](https://tailwindcss.com/)**: Framework de CSS utility-first para estilização.
- **[Supabase](https://supabase.com/)**: Backend as a Service (BaaS) para autenticação e banco de dados.
- **React Router**: Gerenciamento de rotas.
- **Lucide React**: Ícones.
- **jsPDF**: Geração de comprovantes em PDF.

## ✨ Funcionalidades

- **Autenticação**: Login e Cadastro de usuários (`/signin`, `/signup`).
- **Explorar Anúncios**: Visualização e busca de itens disponíveis (`/explorar`).
- **Gestão de Anúncios**:
  - Criar novos anúncios (`/novo-anuncio`).
  - Gerenciar meus anúncios (`/meus-anuncios`).
- **Solicitações**: Acompanhamento de itens solicitados (`/minhas-solicitacoes`).
- **Processo de Devolução**: Fluxo para devolução de itens (`/devolver/:id`).
- **Aprovações Pendentes**: Área para moderação (`/pending-approval`).
- **Gestão de Equipe**: Gerenciamento de usuários e permissões (`/equipe`).

## 🛠️ Como Executar o Projeto

### Pré-requisitos

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em sua máquina.

### Instalação

1. Clone o repositório (se aplicável) ou navegue até a pasta do projeto.
2. Instale as dependências:

```bash
npm install
```

### Configuração

Certifique-se de configurar as variáveis de ambiente necessárias para a conexão com o Supabase. Crie um arquivo `.env` na raiz do projeto com as chaves correspondentes (exemplo baseado no uso padrão):

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_supabase
```

### Rodando a Aplicação

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173` (ou outra porta indicada no terminal).

## 📦 Scripts Disponíveis

- `npm run dev`: Inicia o ambiente de desenvolvimento.
- `npm run build`: Compila a aplicação para produção.
- `npm run lint`: Executa o ESLint para verificação de código.
- `npm run preview`: Visualiza a versão de produção localmente.

---
Desenvolvido para facilitar o acesso à saúde! 🏥
