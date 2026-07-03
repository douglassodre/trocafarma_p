import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send, CheckCircle } from 'lucide-react';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // In a real application, you would send this data to a backend
        console.log('Form submitted:', formData);
        setIsSubmitted(true);
        setTimeout(() => setIsSubmitted(false), 5000); // Reset after 5 seconds or keep it
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <Helmet>
                <title>Fale Conosco | Trocafarma</title>
                <meta name="description" content="Entre em contato com a equipe da Trocafarma. Envie suas dúvidas, sugestões ou relatos." />
            </Helmet>

            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Link to="/" className="flex items-center space-x-2 group">
                            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center group-hover:bg-green-700 transition-colors">
                                <span className="text-white font-bold text-xl">T</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gray-800 group-hover:text-green-800 transition-colors">Trocafarma</span>
                        </Link>
                    </div>
                    <Link to="/" className="text-sm font-medium text-gray-600 hover:text-green-600 flex items-center transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Voltar para o Início
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Fale Conosco</h1>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Tem alguma dúvida, sugestão ou encontrou algum problema? Envie uma mensagem para nossa equipe.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Contact Info */}
                        <div className="md:col-span-1 space-y-6">
                            <div className="bg-green-50 p-6 rounded-xl border border-green-100 h-full">
                                <h2 className="text-lg font-bold text-green-900 mb-4">Canais de Atendimento</h2>

                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <div className="bg-white p-2 rounded-lg shadow-sm mr-3">
                                            <Mail className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Email</p>
                                            <a href="mailto:contato@trocafarma.com" className="text-gray-700 hover:text-green-600 font-medium break-all">
                                                contato@trocafarma.com
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-green-100">
                                    <p className="text-sm text-green-800 leading-relaxed">
                                        Nosso time de suporte está disponível de segunda a sexta, das 09h às 18h.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="md:col-span-2">
                            {isSubmitted ? (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center animate-fade-in">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Mensagem enviada!</h3>
                                    <p className="text-gray-600">
                                        Obrigado pelo seu contato. Nossa equipe responderá em breve.
                                    </p>
                                    <button
                                        onClick={() => setIsSubmitted(false)}
                                        className="mt-6 text-green-600 font-bold hover:underline text-sm"
                                    >
                                        Enviar outra mensagem
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow outline-none"
                                            placeholder="Seu nome"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow outline-none"
                                            placeholder="seu@email.com"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                                        <select
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow outline-none bg-white"
                                        >
                                            <option value="" disabled>Selecione um assunto</option>
                                            <option value="duvida">Dúvida</option>
                                            <option value="sugestao">Sugestão</option>
                                            <option value="problema">Relatar Problema</option>
                                            <option value="outro">Outro</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            rows="5"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow outline-none resize-none"
                                            placeholder="Como podemos ajudar?"
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-green-600 text-white font-bold py-4 rounded-lg hover:bg-green-700 transition-colors shadow-md flex items-center justify-center"
                                    >
                                        <Send className="w-5 h-5 mr-2" />
                                        Enviar Mensagem
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-gray-100 py-8 text-center text-sm text-gray-500">
                <p>&copy; {new Date().getFullYear()} Trocafarma. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
};

export default Contact;
