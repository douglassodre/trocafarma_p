import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LogOut, PlusCircle, LayoutList, Building2, User, Truck, Package, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

import logo from '../assets/logo.png'

const Home = () => {
    const { user, userProfile, signOut } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await signOut()
        navigate('/signin')
    }

    const [inTransitItems, setInTransitItems] = useState([])
    const inTransitCount = inTransitItems.length

    // Basic protection (can be moved to a wrapper later)
    useEffect(() => {
        if (!user) navigate('/signin')
        if (userProfile?.instituicoes?.status === 'PENDENTE') navigate('/pending-approval')

        if (user) {
            fetchInTransitItems()
        }
    }, [user, userProfile, navigate])

    const fetchInTransitItems = async () => {
        try {
            const { data, error } = await supabase
                .from('transacoes')
                .select(`
                    *,
                    anuncios (
                        descricao_customizada,
                        instituicoes (
                            nome_fantasia
                        )
                    )
                `)
                .eq('solicitante_id', user.id)
                .eq('status', 'EM_TRANSITO')

            if (error) throw error
            setInTransitItems(data || [])
        } catch (err) {
            console.error('Error fetching in-transit items:', err)
        }
    }

    if (!user || !userProfile) return <div className="p-8 flex items-center justify-center min-h-screen text-gray-500">Carregando...</div>

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <img src={logo} alt="Trocafarma" className="h-10 w-10 object-contain" />
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trocafarma</h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => navigate('/meus-anuncios')}
                            className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition group"
                        >
                            <LayoutList className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span>Meus Anúncios</span>
                        </button>

                        <div className="h-6 w-px bg-gray-200"></div>

                        <div className="flex items-center space-x-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-gray-900">{userProfile.nome}</p>
                                <p className="text-xs text-gray-500">{userProfile.instituicoes?.nome_fantasia}</p>
                            </div>
                            <div className="bg-gray-100 p-2 rounded-full">
                                <User className="h-5 w-5 text-gray-600" />
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="text-gray-400 hover:text-red-600 transition"
                            title="Sair"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Hero */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 mb-8 text-white relative overflow-hidden">
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center">
                        <div className="mb-6 sm:mb-0">
                            <h2 className="text-3xl font-bold mb-2">Bem-vindo ao Painel</h2>
                            <p className="text-indigo-100 max-w-xl mb-4">
                                Sua instituição <span className="font-semibold text-white">{userProfile.instituicoes?.nome_fantasia}</span> está ativa e pronta para conectar.
                            </p>

                            {userProfile?.is_premium ? (
                                <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 rounded-full text-white text-sm font-semibold">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                    </span>
                                    <span>Premium Ativo</span>
                                    <span className="text-xs font-normal opacity-80 border-l border-white/30 pl-2 ml-1">Assinatura Gratuita</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => import('../services/stripe').then(m => m.activatePremium(user.id))}
                                    className="flex items-center space-x-2 bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-yellow-400 transition transform hover:-translate-y-0.5 text-sm"
                                >
                                    <span>Ativar Benefícios Premium (Grátis)</span>
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => navigate('/novo-anuncio')}
                            className="flex items-center space-x-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-50 hover:shadow-xl transition transform hover:-translate-y-1"
                        >
                            <PlusCircle className="h-5 w-5" />
                            <span>Novo Anúncio</span>
                        </button>
                    </div>

                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-900 opacity-20 rounded-full blur-3xl"></div>
                </div>

                {/* --- New Section: Requests In Transit --- */}
                {inTransitCount > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Truck className="h-6 w-6 text-indigo-600" />
                                Entregas em Andamento
                            </h2>
                            <button
                                onClick={() => navigate('/minhas-solicitacoes')}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                                Ver todas <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inTransitItems.map(item => (
                                <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-blue-500 border-gray-100 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
                                            Em Trânsito
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono">#{item.id.slice(0, 8)}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{item.anuncios?.descricao_customizada}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                        <Package className="h-4 w-4 text-gray-400" />
                                        <span>{item.anuncios?.instituicoes?.nome_fantasia}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate('/minhas-solicitacoes')}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition"
                                        >
                                            Confirmar Recebimento
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* ---------------------------------------- */}

                {/* Dashboard Stats/Quick Links (Placeholder for now) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div
                        onClick={() => navigate('/meus-anuncios')}
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-blue-50 p-3 rounded-lg group-hover:bg-blue-100 transition">
                                <LayoutList className="h-6 w-6 text-blue-600" />
                            </div>
                            <span className="text-gray-400 text-sm">Gerenciar</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Meus Anúncios</h3>
                        <p className="text-sm text-gray-500 mt-1">Visualize e edite seus itens anunciados.</p>
                    </div>

                    <div
                        onClick={() => navigate('/minhas-solicitacoes')}
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-indigo-50 p-3 rounded-lg group-hover:bg-indigo-100 transition">
                                <Package className="h-6 w-6 text-indigo-600" />
                            </div>
                            <span className="text-gray-400 text-sm">Acompanhar</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Minhas Solicitações</h3>
                        <p className="text-sm text-gray-500 mt-1">Veja o status dos seus pedidos e entregas.</p>
                    </div>

                    {/* Add more cards here later */}
                </div>
            </main>
        </div>
    )
}

export default Home
