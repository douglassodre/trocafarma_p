import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, Scale } from 'lucide-react';
import logo from '../assets/logo.png';

const TermsOfUse = () => {
    return (
        <div className="min-h-screen bg-brand-mist font-sans text-brand-ink">
            <Helmet>
                <title>Termos de Uso | Trocafarma</title>
                <meta name="description" content="Termos de uso e condições legais da plataforma Trocafarma." />
            </Helmet>

            {/* Header */}
            <header className="bg-white shadow-sm border-b border-brand-lavender/30 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Link to="/" className="flex items-center space-x-2 group">
                            <img src={logo} alt="Trocafarma" className="h-9 w-9 object-contain" />
                            <span className="text-xl font-bold tracking-tight text-brand-ink group-hover:text-brand-deep transition-colors">Trocafarma</span>
                        </Link>
                    </div>
                    <Link to="/" className="text-sm font-medium text-gray-600 hover:text-brand-deep flex items-center transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Voltar para o Início
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-white rounded-lg shadow-sm border border-brand-lavender/30 p-8 md:p-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Termos de Uso</h1>
                    <p className="text-gray-500 mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                    <div className="prose max-w-none space-y-8">

                        {/* Introdução */}
                        <section>
                            <h2 className="text-xl font-bold flex items-center mb-4 text-brand-deep">
                                <FileText className="w-5 h-5 mr-2" />
                                1. Introdução
                            </h2>
                            <p>
                                Bem-vindo à <strong>Trocafarma</strong>. Ao acessar e utilizar nossa plataforma, você concorda com estes Termos de Uso.
                                A Trocafarma é uma ferramenta tecnológica desenvolvida para otimizar a logística hospitalar, facilitando a comunicação entre instituições de saúde para fins de empréstimo, permuta e doação de medicamentos e insumos.
                            </p>
                        </section>

                        {/* Base Legal */}
                        <section className="bg-brand-lavender/20 p-6 rounded-lg border border-brand-periwinkle/20">
                            <h2 className="text-xl font-bold flex items-center mb-4 text-brand-ink">
                                <Scale className="w-5 h-5 mr-2" />
                                2. Base Legal e Conformidade
                            </h2>
                            <p className="mb-4">
                                As operações realizadas através da Trocafarma fundamentam-se na legislação vigente, visando a eficiência no uso de recursos públicos e privados de saúde e a redução de desperdícios. Destacamos as seguintes normativas:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                                <li>
                                    <strong>Lei Estadual nº 15.880/2022 (Rio Grande do Sul):</strong> Dispõe sobre o fluxo de empréstimo, permuta e doação de medicamentos e fórmulas nutricionais entre estabelecimentos de saúde. A plataforma segue diretrizes similares para facilitar a cooperação entre instituições, respeitando as legislações locais de cada estado onde opera.
                                </li>
                                <li>
                                    <strong>Resolução RDC nº 430/2020 (ANVISA):</strong> Dispõe sobre as Boas Práticas de Distribuição, Armazenagem e de Transporte de Medicamentos.
                                </li>
                                <li>
                                    <strong>Lei Federal nº 14.654/2023:</strong> Que obriga a divulgação dos estoques de medicamentos das farmácias que compõem o SUS, promovendo a transparência.
                                </li>
                            </ul>
                            <p className="mt-4 text-sm italic text-brand-royal">
                                * É responsabilidade de cada instituição usuária verificar a conformidade com as leis estaduais e municipais específicas de sua região.
                            </p>
                        </section>

                        {/* Responsabilidades */}
                        <section>
                            <h2 className="text-xl font-bold flex items-center mb-4 text-brand-deep">
                                <ShieldCheck className="w-5 h-5 mr-2" />
                                3. Responsabilidades das Instituições
                            </h2>
                            <p>
                                A Trocafarma atua exclusivamente como facilitadora da conexão entre as partes. As instituições cadastradas (Cedente e Receptora) declaram e garantem que:
                            </p>
                            <ul className="list-disc pl-5 mt-4 space-y-2">
                                <li>Possuem todas as licenças e autorizações sanitárias necessárias para o funcionamento e manuseio de medicamentos.</li>
                                <li>Os medicamentos ofertados foram armazenados e transportados em estrita conformidade com as Boas Práticas (RDC 430/2020).</li>
                                <li>É de responsabilidade exclusiva do <strong>Farmacêutico Responsável Técnico</strong> de cada instituição a conferência, aprovação e liberação dos itens transacionados.</li>
                                <li>A Trocafarma <strong>não realiza</strong> a posse, transporte ou inspeção física dos medicamentos.</li>
                            </ul>
                        </section>

                        {/* Modificações */}
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-3">4. Alterações nos Termos</h2>
                            <p>
                                A Trocafarma reserva-se o direito de alterar estes termos a qualquer momento, mediante aviso prévio na plataforma. O uso continuado do serviço após tais alterações constitui aceitação dos novos termos.
                            </p>
                        </section>

                        {/* Contato */}
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-3">5. Contato e Suporte</h2>
                            <p>
                                Para dúvidas legais ou operacionais, entre em contato através do e-mail: <a href="mailto:contato@trocafarma.com" className="text-brand-deep font-bold hover:underline">contato@trocafarma.com</a>.
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="bg-gray-100 py-8 text-center text-sm text-gray-500">
                <p>&copy; {new Date().getFullYear()} Trocafarma. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
};

export default TermsOfUse;
