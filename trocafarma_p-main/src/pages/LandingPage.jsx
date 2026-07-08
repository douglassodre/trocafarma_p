
import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, TrendingUp, ShieldCheck, CheckCircle, MapPin } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import UrgencyWizard from '../components/UrgencyWizard';
import ActiveUrgencies from '../components/ActiveUrgencies';

const LandingPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showUrgencyWizard, setShowUrgencyWizard] = useState(false);

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);
    return (
        <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50 overflow-x-hidden">
            <Helmet>
                <title>Trocafarma | Otimização de Logística Hospitalar em Salvador, Bahia</title>
                <meta name="description" content="Transforme a gestão de estoque do seu hospital em Salvador e em toda a Bahia. Reduza desperdícios e custos. Pare de perder dinheiro com medicamentos vencidos." />
                <meta name="keywords" content="Logística Hospitalar, Gestão de Estoque Bahia, Redução de Custos Salvador, Medicamentos Vencidos, Trocafarma" />
            </Helmet>

            {/* Header */}
            <header className="w-full py-4 px-6 md:px-12 flex justify-between items-center bg-white shadow-sm z-50 relative">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xl">T</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-gray-800">Trocafarma</span>
                </div>
                <nav>
                    <Link to="/signin" className="text-sm font-medium hover:text-green-600 transition-colors mr-4">Entrar</Link>
                    <Link to="/signup" className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-full hover:bg-green-700 transition-all shadow-md">
                        Começar Agora
                    </Link>
                </nav>
            </header>

            <ActiveUrgencies />

            {/* Hero Section (Attention) */}
            <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 px-6 md:px-12 overflow-hidden bg-white">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-100 via-transparent to-transparent opacity-50 pointer-events-none"></div>
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="inline-flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Disponível em Salvador e Bahia</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-gray-900">
                            Conectando estoques. Preservando vidas
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 max-w-lg leading-relaxed">
                            Acreditamos que nenhum medicamento em boas condições deveria ser perdido por falta de conexão entre quem possui disponibilidade e quem precisa. Nossa missão é transformar a gestão de estoques em um processo mais inteligente, colaborativo e sustentável, reduzindo desperdícios, preservando recursos e contribuindo para uma saúde mais eficiente. Porque, quando conectamos estoques, preservamos vidas.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/signup" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-green-600 border border-transparent rounded-full shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 hover:scale-105">
                                Explorar Inventário
                            </Link>
                            <button
                                onClick={() => setShowUrgencyWizard(true)}
                                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-red-600 transition-all duration-200 bg-red-50 border border-red-200 rounded-full shadow-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 hover:scale-105"
                            >
                                Ruptura de Estoque? Solicite Agora
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-4 flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-1" /> Sem cartão de crédito necessário
                        </p>
                    </div>

                    <div className="relative">
                        <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl relative z-10">
                            <img
                                src="/hero-image.jpg"
                                alt="Gestor hospitalar otimizando estoque com Trocafarma"
                                className="w-full h-full object-cover transform transition-transform duration-700 hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-tr from-green-900/10 to-transparent pointer-events-none"></div>
                        </div>
                        {/* Decoratve background elements */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 z-0 animate-pulse"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 z-0 animate-pulse delay-1000"></div>
                    </div>
                </div>
            </section>

            {/* Problem/Agitation (Interest) */}
            <section className="py-20 px-6 md:px-12 bg-gray-50">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Pare de jogar dinheiro no lixo com medicamentos vencidos.
                    </h2>
                    <p className="text-xl text-gray-600 leading-relaxed">
                        Hospitais em todo o Brasil — e especialmente aqui na Bahia — perdem milhões anualmente com descarte inadequado e estoques parados. A falta de visibilidade entre unidades gera compras desnecessárias enquanto insumos vitais expiram nas prateleiras.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <TrendingUp className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Altos Custos</h3>
                            <p className="text-gray-500 text-sm">Compras de emergência com preços elevados por falta de planejamento.</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <ShieldCheck className="w-6 h-6 text-orange-600" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Desperdício</h3>
                            <p className="text-gray-500 text-sm">Medicamentos vencendo enquanto outros hospitais precisam deles.</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <MapPin className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Logística Local</h3>
                            <p className="text-gray-500 text-sm">Dificuldade em encontrar parceiros de troca próximos em Salvador.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Solution/Desire (Desire) - BI Visualization */}
            <section className="py-20 px-6 md:px-12 bg-white overflow-hidden">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="order-2 lg:order-1 relative">
                        {/* Mock Dashboard */}
                        <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 md:p-8 transform rotate-1 hover:rotate-0 transition-transform duration-500 border border-slate-800">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                </div>
                                <div className="text-slate-400 text-xs font-mono">dashboard_kpis.tsx</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* KPI Card 1: Economia Total */}
                                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-slate-400 text-sm font-medium">Economia Total</span>
                                        <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs font-bold">+12.5%</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white mb-2">R$ 1.250.000</div>
                                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full w-[75%] rounded-full animate-pulse"></div>
                                    </div>
                                    <p className="text-slate-500 text-xs mt-3">Atualizado hoje às 14:30</p>
                                </div>

                                {/* KPI Card 2: Perda Evitada */}
                                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-slate-400 text-sm font-medium">Perda Evitada</span>
                                        <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs font-bold">Alta</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white mb-2">R$ 480.000</div>
                                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full w-[60%] rounded-full"></div>
                                    </div>
                                    <p className="text-slate-500 text-xs mt-3">Medicamentos realocados</p>
                                </div>
                            </div>

                            {/* Simulated Graph Area */}
                            <div className="mt-6 bg-slate-800 rounded-xl p-5 border border-slate-700 h-40 flex items-end justify-between space-x-2">
                                {[35, 45, 30, 60, 75, 50, 65, 80, 70, 90].map((height, i) => (
                                    <div key={i} className="w-full bg-green-500/20 hover:bg-green-500/40 transition-colors rounded-t-sm relative group" style={{ height: `${height}%` }}>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            R$ {height}k
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Decorative Blur Background behind dashboard */}
                        <div className="absolute inset-0 bg-green-500 blur-[80px] opacity-20 -z-10"></div>
                    </div>

                    <div className="order-1 lg:order-2 space-y-6">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                            Visualize seus resultados em <span className="text-green-600">tempo real</span>.
                        </h2>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Nosso dashboard inteligente oferece controle total. Monitore cada centavo economizado e cada medicamento salvo do descarte. Tome decisões baseadas em dados, não em suposições.
                        </p>
                        <ul className="space-y-4 pt-4">
                            {[
                                'Monitoramento de validade em tempo real',
                                'Alertas automáticos de oportunidades de troca',
                                'Relatórios detalhados para auditoria',
                                'Integração simples com seu ERP atual'
                            ].map((item, index) => (
                                <li key={index} className="flex items-center text-gray-700">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <div className="pt-6">
                            <Link to="/signup" className="text-green-600 font-bold hover:text-green-700 inline-flex items-center group">
                                Ver todas as funcionalidades
                                <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Action (Action) */}
            <section className="py-24 bg-green-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="max-w-4xl mx-auto text-center relative z-10 px-6">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                        Pronto para transformar sua logística?
                    </h2>
                    <p className="text-xl md:text-2xl text-green-100 mb-10 max-w-2xl mx-auto">
                        Junte-se a gestores visionários na Bahia e comece a economizar hoje mesmo.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-white text-green-900 font-bold rounded-full text-lg hover:bg-green-50 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                            Ativar Agora (R$ 0,00/mês)
                        </Link>
                        <Link to="/contact" className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-green-400 text-white font-bold rounded-full text-lg hover:bg-green-800 transition-all">
                            Falar com Consultor
                        </Link>
                    </div>
                    <p className="mt-8 text-sm text-green-400">
                        *Plano Gratuito disponível por tempo limitado para hospitais credenciados.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12 px-6 md:px-12">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2">
                        <span className="text-2xl font-bold text-white mb-4 block">Trocafarma</span>
                        <p className="text-sm max-w-xs">
                            Conectando hospitais, otimizando recursos e salvando vidas através da tecnologia logística eficiente.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Empresa</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/sobre-nos" className="hover:text-green-400">Sobre Nós</Link></li>
                            <li><a href="https://www.linkedin.com/company/trocafarma" target="_blank" rel="noopener noreferrer" className="hover:text-green-400">LinkedIn</a></li>
                            <li><Link to="/blog" className="hover:text-green-400">Blog</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/privacy" className="hover:text-green-400">Privacidade</Link></li>
                            <li><Link to="/termos-de-uso" className="hover:text-green-400">Termos de Uso</Link></li>
                            <li><Link to="/contact" className="hover:text-green-400">Contato</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs">
                    <p>&copy; {new Date().getFullYear()} Trocafarma. Todos os direitos reservados.</p>
                    <div className="flex space-x-4 mt-4 md:mt-0">
                        <span>Salvador, Bahia, Brasil</span>
                    </div>
                </div>
            </footer>
            <UrgencyWizard isOpen={showUrgencyWizard} onClose={() => setShowUrgencyWizard(false)} />
        </div>
    );
};

export default LandingPage;
