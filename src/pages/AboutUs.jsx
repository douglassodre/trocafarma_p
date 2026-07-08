import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Scale, RefreshCw, Heart, FileText } from 'lucide-react';
import logo from '../assets/logo.png';

export default function AboutUs() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-mist to-white dark:from-slate-900 dark:to-slate-800">
            {/* Navbar simplificada */}
            <nav className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-brand-deep transition-colors">
                                <ArrowLeft className="h-5 w-5" />
                                <span className="font-medium">Voltar ao Início</span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Trocafarma" className="h-9 w-9 object-contain" />
                            <span className="text-xl font-bold bg-gradient-to-r from-brand-deep to-brand-periwinkle bg-clip-text text-transparent">
                                Trocafarma
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header Section */}
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                        Conectando Saúde e <span className="text-brand-deep">Eficiência</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        A Trocafarma é a solução inteligente para reduzir o desperdício de medicamentos e otimizar recursos no SUS, permitindo que instituições se ajudem mutuamente.
                    </p>
                </div>

                {/* Content Section */}
                <div className="space-y-12">

                    {/* Card Legal Foundation */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-brand-lavender/30 dark:border-slate-700 relative overflow-hidden group hover:border-brand-periwinkle/50 transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Scale className="h-32 w-32 text-brand-deep" />
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-brand-lavender/20 rounded-lg">
                                <BookOpen className="h-6 w-6 text-brand-deep" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Embasamento Legal</h2>
                        </div>
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                                Nossa atuação é fundamentada na <strong className="text-brand-deep">Lei Estadual Nº 15.880/2022 do Rio Grande do Sul</strong>, que autoriza e regulamenta o empréstimo, a permuta e a doação de medicamentos e fórmulas nutricionais no âmbito do Sistema Único de Saúde (SUS).
                            </p>
                            <div className="bg-brand-lavender/10 dark:bg-slate-900/50 p-4 rounded-lg border-l-4 border-brand-deep italic text-slate-700 dark:text-slate-400 text-sm">
                                "O objetivo é evitar o desperdício desses insumos essenciais, reduzir impactos financeiros aos cofres públicos e, principalmente, assegurar a eficiência no abastecimento para quem mais precisa: o paciente."
                            </div>
                        </div>
                    </div>

                    {/* Definitions Grid */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: RefreshCw,
                                title: "Empréstimo",
                                desc: "Transferência de medicamentos com o compromisso de devolução posterior do mesmo item, na mesma quantidade e condições.",
                                color: "text-brand-deep",
                                bg: "bg-brand-periwinkle/20"
                            },
                            {
                                icon: FileText,
                                title: "Permuta",
                                desc: "Troca recíproca entre instituições, visando o equilíbrio de estoques sem envolver transações financeiras diretas.",
                                color: "text-brand-royal",
                                bg: "bg-brand-lavender/30"
                            },
                            {
                                icon: Heart,
                                title: "Doação",
                                desc: "Transferência gratuita e definitiva de itens excedentes para outras instituições que necessitem, evitando o vencimento e descarte.",
                                color: "text-rose-600",
                                bg: "bg-rose-100 dark:bg-rose-900/20"
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-brand-lavender/30 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className={`w-12 h-12 ${item.bg} rounded-lg flex items-center justify-center mb-4`}>
                                    <item.icon className={`h-6 w-6 ${item.color}`} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* CTA Section */}
                    <div className="text-center pt-8">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">Faça parte dessa rede de cooperação</h3>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/signup" className="inline-flex justify-center items-center px-8 py-3 rounded-lg bg-brand-deep text-white font-medium hover:bg-brand-royal shadow-lg transition-all hover:scale-[1.02]">
                                Cadastrar minha Instituição
                            </Link>
                            <Link to="/explorar" className="inline-flex justify-center items-center px-8 py-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-brand-lavender/10 dark:hover:bg-slate-700 border border-brand-lavender/40 dark:border-slate-600 shadow-sm transition-all hover:scale-[1.02]">
                                Explorar Oportunidades
                            </Link>
                        </div>
                    </div>

                </div>
            </main>

            {/* Rodapé simples */}
            <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-12">
                <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
                    <p>© {new Date().getFullYear()} Trocafarma. Todos os direitos reservados.</p>
                    <p className="mt-2 text-xs">A Trocafarma atua em conformidade com as regulações da ANVISA e do Conselho Federal de Farmácia.</p>
                </div>
            </footer>
        </div>
    );
}
