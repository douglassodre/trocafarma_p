import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
    Search, Filter, MapPin, Calendar,
    Package, ArrowRight, X, MessageCircle, RefreshCw, Truck, Share2, AlertTriangle
} from 'lucide-react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { generateReceiptPDF } from '../utils/pdfGenerator'
import UrgencyResponseModal from '../components/UrgencyResponseModal'

const Explore = () => {
    const { user } = useAuth()
    const [ads, setAds] = useState([])
    const [loading, setLoading] = useState(true)

    // Filters State
    const [searchTerm, setSearchTerm] = useState('')
    const [cityFilter, setCityFilter] = useState('') // New City Filter
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [selectedType, setSelectedType] = useState(null)

    const [selectedAd, setSelectedAd] = useState(null) // For Modal
    const [modalView, setModalView] = useState('DETAILS') // DETAILS, NEXT_STEPS
    const [activeUrgencyId, setActiveUrgencyId] = useState(null)

    // Mock Categories based on typical data, user mentioned these examples
    const categories = [
        { id: 'MEDICAMENTO', label: 'Medicamentos' },
        { id: 'MATERIAL', label: 'Materiais' },
        { id: 'NUTRICAO', label: 'Nutrição' }
    ]

    const types = [
        { id: 'EMPRESTIMO', label: 'Empréstimo', color: 'bg-purple-100 text-purple-700' },
        { id: 'PERMUTA', label: 'Permuta', color: 'bg-orange-100 text-orange-700' },
        { id: 'DOACAO', label: 'Doação', color: 'bg-blue-100 text-blue-700' }
    ]

    const [interestedAdIds, setInterestedAdIds] = useState(new Set())

    useEffect(() => {
        if (user) {
            fetchAds()
            fetchInterests()
        }
    }, [user])

    const fetchInterests = async () => {
        try {
            const { data, error } = await supabase
                .from('transacoes')
                .select('anuncio_id')
                .eq('solicitante_id', user.id)

            if (error) throw error

            const ids = new Set(data.map(t => t.anuncio_id))
            setInterestedAdIds(ids)
        } catch (error) {
            console.error('Error fetching interests:', error)
        }
    }

    const fetchAds = async () => {
        try {
            setLoading(true)

            // 1. Fetch Urgencies (Active)
            const { data: urgenciesData, error: urgencyError } = await supabase
                .from('solicitacoes_urgentes')
                .select('*')
                .eq('status', 'ATIVA')
                .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

            if (urgencyError) throw urgencyError

            const formattedUrgencies = (urgenciesData || []).map(u => ({
                id: `urg_${u.id}`, // Prefix to avoid collision
                original_id: u.id,
                item_codigo: 'URGÊNCIA',
                descricao_customizada: u.item_nome,
                tipo: 'URGENCIA',
                isUrgency: true,
                quantidade: u.quantidade,
                instituicoes: { nome_fantasia: u.contato_instituicao || 'Instituição Parceira' },
                cidade: u.cidade || 'Bahia',
                estado: 'BA',
                lote: 'N/A',
                data_vencimento: new Date().toISOString(),
                created_at: u.created_at,
                // Add urgency specific fields if needed
                nivel_urgencia: u.nivel_urgencia_label
            }))

            // 2. Fetch Regular Ads
            // Fixed Query: Fetching location from 'anuncios' table only.
            // Removed 'cidade, estado' from instituicoes join as they don't exist there.
            const { data: adsData, error: adsError } = await supabase
                .from('anuncios')
                .select('*, instituicoes (nome_fantasia), perfis_usuarios (whatsapp)')
                .eq('status', 'ATIVO')
                .neq('usuario_id', user.id) // Restore: Don't show my own ads
                .order('created_at', { ascending: false })

            if (adsError) throw adsError

            // Merge: Urgencies First
            setAds([...formattedUrgencies, ...adsData])
        } catch (error) {
            console.error('Error fetching ads:', error)
        } finally {
            setLoading(false)
        }
    }

    // Filter Logic
    const filteredAds = ads.filter(ad => {
        const matchesSearch = (ad.descricao_customizada?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (ad.item_codigo || '').includes(searchTerm)

        const matchesCategory = selectedCategory ? ad.categoria === selectedCategory : true
        const matchesType = selectedType ? ad.tipo === selectedType : true

        // City Filter (Flexible partial match)
        const matchesCity = cityFilter
            ? (ad.cidade?.toLowerCase() || '').includes(cityFilter.toLowerCase())
            : true

        return matchesSearch && matchesCategory && matchesType && matchesCity
    })

    const openModal = (ad) => {
        setSelectedAd(ad)
        // Check if already interested to determine initial view or just button state
        // If we want to show "Next Steps" immediately if already requested, we could do:
        // if (interestedAdIds.has(ad.id)) setModalView('NEXT_STEPS')
        // But the user might want to see details again. Let's just disable the button for now as per request.
        setModalView('DETAILS')
    }
    const closeModal = () => setSelectedAd(null)

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header / Filter Section */}
            <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-slate-900">Explorar Anúncios</h1>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            {/* Search Bar */}
                            <div className="relative w-full md:w-80">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Buscar item ou código..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* City Filter */}
                            <div className="relative w-full md:w-48">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Filtrar Cidade"
                                    value={cityFilter}
                                    onChange={(e) => setCityFilter(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center mr-4 text-sm font-medium text-slate-500">
                            <Filter className="h-4 w-4 mr-2" />
                            Filtros:
                        </div>

                        {/* Categories */}
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}

                        <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>

                        {/* Types */}
                        {types.filter(t => t.id !== 'DOACAO').map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(selectedType === type.id ? null : type.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${selectedType === type.id
                                    ? 'ring-2 ring-indigo-500 ring-offset-1'
                                    : 'hover:bg-slate-50'
                                    } ${type.color} bg-opacity-50`}
                            >
                                {type.label}
                            </button>
                        ))}
                        {/* Clear Filters */}
                        {(selectedCategory || selectedType || searchTerm || cityFilter) && (
                            <button
                                onClick={() => {
                                    setSelectedCategory(null)
                                    setSelectedType(null)
                                    setSearchTerm('')
                                    setCityFilter('')
                                }}
                                className="ml-auto text-sm text-red-600 hover:underline flex items-center"
                            >
                                <X className="h-4 w-4 mr-1" /> Limpar Filtros
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {filteredAds.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum anúncio encontrado</h3>
                        <p className="text-slate-500">Tente ajustar seus filtros de busca ou trocar de cidade.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {filteredAds.map((ad) => (
                            <div key={ad.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 flex flex-col overflow-hidden">
                                {/* Card content */}
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-2">
                                            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-full
                                                ${ad.tipo === 'DOACAO' ? 'bg-blue-100 text-blue-700' :
                                                    ad.tipo === 'EMPRESTIMO' ? 'bg-purple-100 text-purple-700' :
                                                        ad.tipo === 'PERMUTA' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-red-100 text-red-700 animate-pulse'}`}>
                                                {ad.tipo}
                                            </span>
                                            {/* Logistics Icon Badge */}
                                            <span className="px-2 py-1 bg-slate-100 rounded-full text-slate-600 flex items-center" title={`Logística: ${ad.logistica || 'Retirada'}`}>
                                                {ad.logistica === 'ENTREGA' ? <Truck className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                                {/* <span className="ml-1 text-[10px] uppercase font-bold">{ad.logistica === 'ENTREGA' ? 'ENTREGA' : 'LOCAL'}</span> */}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono">#{ad.item_codigo}</span>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2 min-h-[3.5rem]" title={ad.descricao_customizada}>
                                        {ad.descricao_customizada}
                                    </h3>

                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-sm text-slate-500">{ad.categoria || 'Outros'}</p>
                                        {ad.quantidade && (
                                            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                                                Qtd: {ad.quantidade}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center text-sm text-slate-600">
                                            <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                                            <span className="truncate">
                                                {ad.cidade} / {ad.estado}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-600">
                                            <Package className="h-4 w-4 mr-2 text-slate-400" />
                                            <span className="truncate">{ad.instituicoes?.nome_fantasia || 'Instituição Desconhecida'}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-600">
                                            <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                                            <span>Validade do Lote: <strong>{ad.isUrgency ? 'Urgente' : new Date(ad.data_vencimento).toLocaleDateString()}</strong></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 border-t border-slate-100">
                                    <Button
                                        className={`w-full ${interestedAdIds.has(ad.id) ? 'bg-green-100 text-green-700 hover:bg-green-200' : (ad.isUrgency ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700')}`}
                                        onClick={() => ad.isUrgency ? setActiveUrgencyId(ad.original_id) : openModal(ad)}
                                    >
                                        {interestedAdIds.has(ad.id) ? 'Status: Solicitado' : (ad.isUrgency ? 'Atender Urgência' : 'Tenho Interesse')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal Detail */}
            {selectedAd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            {modalView === 'DETAILS' ? (
                                <>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedAd.descricao_customizada}</h2>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full
                                                    ${selectedAd.tipo === 'DOACAO' ? 'bg-blue-100 text-blue-700' :
                                                        selectedAd.tipo === 'EMPRESTIMO' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-orange-100 text-orange-700'}`}>
                                                    {selectedAd.tipo}
                                                </span>
                                                <span className="text-sm text-slate-500">Cód: {selectedAd.item_codigo}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const text = `💊 TrocaFarma - Novo Item Disponível!
Item: ${selectedAd.descricao_customizada}
Validade: ${new Date(selectedAd.data_vencimento).toLocaleDateString()}
Instituição: ${selectedAd.instituicoes?.nome_fantasia || 'Nome da Instituição'}

🔗 Confira os detalhes e solicite a troca aqui: ${window.location.origin}/anuncio/${selectedAd.id}`

                                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                                                }}
                                                className="p-2 hover:bg-green-50 text-green-600 rounded-full transition"
                                                title="Compartilhar no WhatsApp"
                                            >
                                                <Share2 className="h-6 w-6" />
                                            </button>
                                            <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition">
                                                <X className="h-6 w-6 text-slate-500" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Instituição</h4>
                                                <p className="font-medium text-slate-900 text-lg">{selectedAd.instituicoes?.nome_fantasia}</p>
                                                <p className="text-slate-600 flex items-center mt-1">
                                                    <MapPin className="h-4 w-4 mr-1" />
                                                    {selectedAd.cidade} - {selectedAd.estado}
                                                </p>
                                                <div className="mt-2 flex items-center text-sm bg-slate-50 p-2 rounded w-fit">
                                                    {selectedAd.logistica === 'ENTREGA' ? (
                                                        <> <Truck className="h-4 w-4 mr-2 text-green-600" /> <span className="text-green-700 font-medium">Entrega Disponível</span> </>
                                                    ) : (
                                                        <> <MapPin className="h-4 w-4 mr-2 text-slate-500" /> <span className="text-slate-700">Retirada no Local</span> </>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Detalhes do Lote</h4>
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                                    <p className="text-sm"><span className="text-slate-500">Quantidade:</span> <span className="font-medium text-slate-900">{selectedAd.quantidade || 'N/A'}</span></p>
                                                    <p className="text-sm"><span className="text-slate-500">Lote:</span> <span className="font-mono font-medium">{selectedAd.lote}</span></p>
                                                    <p className="text-sm"><span className="text-slate-500">Vencimento:</span> <span className="font-medium text-red-600">{new Date(selectedAd.data_vencimento).toLocaleDateString()}</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {selectedAd.tipo === 'EMPRESTIMO' && (
                                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                                    <h4 className="text-purple-800 font-semibold flex items-center gap-2 mb-2">
                                                        <Calendar className="h-4 w-4" />
                                                        Previsão de Devolução
                                                    </h4>
                                                    <p className="text-purple-700">{new Date(selectedAd.prazo_devolucao).toLocaleDateString()}</p>
                                                </div>
                                            )}

                                            {selectedAd.tipo === 'PERMUTA' && (
                                                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                                    <h4 className="text-orange-800 font-semibold flex items-center gap-2 mb-2">
                                                        <RefreshCw className="h-4 w-4" />
                                                        Interesse em Troca
                                                    </h4>
                                                    <p className="text-orange-700 text-sm whitespace-pre-wrap">{selectedAd.itens_desejados_troca}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-6 border-t border-slate-100">
                                        {interestedAdIds.has(selectedAd.id) ? (
                                            <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                                <h3 className="text-green-800 font-bold flex items-center justify-center gap-2">
                                                    <MessageCircle className="h-5 w-5" />
                                                    Solicitação já realizada
                                                </h3>
                                                <p className="text-green-700 text-sm mt-1">
                                                    Você já demonstrou interesse neste item. Acompanhe em "Meus Pedidos".
                                                </p>
                                            </div>
                                        ) : (
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700 gap-2 h-12 text-lg"
                                                onClick={async () => {
                                                    try {
                                                        setLoading(true)
                                                        const { data: transactionData, error } = await supabase.functions.invoke('create-transaction', {
                                                            body: {
                                                                anuncio_id: selectedAd.id,
                                                                fornecedor_id: selectedAd.usuario_id,
                                                                status: 'SOLICITADO',
                                                                tipo: selectedAd.tipo,
                                                                quantidade: selectedAd.quantidade || 1,
                                                                data_devolucao_prevista: selectedAd.prazo_devolucao // Capture return date
                                                                // unit_price: 0 // Optional: pass if regular ads have cost
                                                            }
                                                        })
                                                        if (error) throw error

                                                        // Update local state to reflect new interest immediately
                                                        setInterestedAdIds(prev => new Set(prev).add(selectedAd.id))

                                                        setModalView('NEXT_STEPS')
                                                    } catch (err) {
                                                        alert('Erro ao confirmar interesse: ' + err.message)
                                                        console.error(err)
                                                    } finally {
                                                        setLoading(false)
                                                    }
                                                }}
                                            >
                                                <MessageCircle className="h-5 w-5" />
                                                {selectedAd.tipo === 'DOACAO' ? 'Eu Quero!' : 'Confirmar Interesse'}
                                            </Button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 animate-in fade-in zoom-in duration-300 relative">
                                    <button onClick={closeModal} className="absolute top-0 right-0 p-2 hover:bg-slate-100 rounded-full transition">
                                        <X className="h-6 w-6 text-slate-500" />
                                    </button>
                                    <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Truck className="h-10 w-10 text-green-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Solicitação Enviada!</h2>
                                    <p className="text-slate-600 max-w-md mx-auto mb-8">
                                        O fornecedor foi notificado. Entre em contato agora para combinar a {selectedAd.logistica === 'ENTREGA' ? 'entrega' : 'retirada'}.
                                    </p>

                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-left max-w-lg mx-auto mb-8">
                                        <h3 className="font-semibold text-lg mb-4 text-slate-800">Próximos Passos</h3>
                                        <ul className="space-y-4">
                                            <li className="flex items-start gap-3">
                                                <div className="bg-white p-2 rounded shadow-sm">
                                                    <MessageCircle className="h-5 w-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">WhatsApp Oficial</p>
                                                    {selectedAd.perfis_usuarios?.whatsapp ? (
                                                        <a
                                                            href={`https://wa.me/55${selectedAd.perfis_usuarios.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, vi seu anúncio do item ${selectedAd.descricao_customizada} no Trocafarma e tenho interesse.`)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-green-600 text-sm hover:underline"
                                                        >
                                                            Iniciar conversa com {selectedAd.instituicoes?.nome_fantasia}
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">Número não disponível</span>
                                                    )}
                                                </div>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <div className="bg-white p-2 rounded shadow-sm">
                                                    <MapPin className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">Endereço de Retirada</p>
                                                    <p className="text-slate-600 text-sm">{selectedAd.cidade}/{selectedAd.estado}</p>
                                                    <span className="text-xs text-slate-400">Seg-Sex, 08h às 18h</span>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>

                                    <Button variant="outline" className="w-full gap-2" onClick={() => generateReceiptPDF(selectedAd, user)}>
                                        <Package className="h-4 w-4" />
                                        Baixar Comprovante (PDF)
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Urgency Response Modal */}
            {activeUrgencyId && (
                <UrgencyResponseModal
                    urgencyId={activeUrgencyId}
                    onClose={() => {
                        setActiveUrgencyId(null)
                        fetchAds() // Refresh list after potential interaction
                    }}
                    currentUser={user}
                />
            )}
        </div>
    )
}

export default Explore
