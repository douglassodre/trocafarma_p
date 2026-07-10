import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
    ArrowLeft, Plus, Calendar, AlertTriangle,
    CheckCircle, XCircle, Package, Edit2,
    Trash2, Clock, EyeOff, Users, X, Share2, Mail, Phone
} from 'lucide-react'

const MyAds = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('ofertas') // 'ofertas', 'urgencias'
    const [ads, setAds] = useState([])
    const [urgencies, setUrgencies] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedAd, setSelectedAd] = useState(null)
    const [selectedUrgency, setSelectedUrgency] = useState(null)
    const [returnHistory, setReturnHistory] = useState({}) // Map transactionId -> list of returns

    const fetchReturnHistory = async (transactionId) => {
        const { data, error } = await supabase
            .from('devolucoes_parciais')
            .select('*')
            .eq('transacao_id', transactionId)
            .order('criado_em', { ascending: false })

        if (error) {
            console.error("Error fetching returns", error)
            return []
        }
        return data
    }

    const loadReturnsForAd = async (ad) => {
        if (!ad.transacoes) return
        const historyMap = {}
        for (const tx of ad.transacoes) {
            if (tx.status === 'DEVOLUCAO_PARCIAL' || tx.status === 'FINALIZADA' || tx.status === 'CONCLUIDO') {
                const returns = await fetchReturnHistory(tx.id)
                if (returns.length > 0) {
                    historyMap[tx.id] = returns
                }
            }
        }
        setReturnHistory(historyMap)
    }

    const fetchAds = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('anuncios')
                .select(`
                    *,
                    instituicoes (
                        nome_fantasia
                    ),
                    transacoes (
                        id,
                        status,
                        created_at,
                        quantidade,
                        solicitante_id,
                        solicitante:solicitante_id (
                            nome,
                            instituicoes (
                                nome_fantasia
                            )
                        )
                    )
                `)
                .eq('usuario_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setAds(data || [])
        } catch (error) {
            console.error('Error fetching ads:', error)
            alert('Erro ao carregar anúncios. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    const fetchUrgencies = async () => {
        try {
            const { data, error } = await supabase
                .from('solicitacoes_urgentes')
                .select(`
                    *,
                    transacoes!transacoes_urgencia_id_fkey (
                        id,
                        status,
                        created_at,
                        quantidade,
                        tipo,
                        data_devolucao_prevista,
                        fornecedor_id,
                        fornecedor:fornecedor_id (nome, email, whatsapp),
                        anuncio:anuncio_id (preco_unitario, lote, data_vencimento, logistica)
                    )
                `)
                .eq('usuario_id', user.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            setUrgencies(data || [])
        } catch (error) {
            console.error('Error fetching urgencies:', error)
        }
    }

    useEffect(() => {
        if (user) {
            const loadData = async () => {
                setLoading(true)
                await Promise.all([fetchAds(), fetchUrgencies()])
                setLoading(false)
            }
            loadData()
        }
    }, [user])

    const handleWhatsAppShare = (ad, e) => {
        e.stopPropagation()
        const text = `💊 TrocaFarma - Novo Item Disponível!
Item: ${ad.descricao_customizada}
Validade: ${new Date(ad.data_vencimento).toLocaleDateString()}
Instituição: ${ad.instituicoes?.nome_fantasia || 'Instituição Parceira'}

🔗 Confira os detalhes e solicite a troca aqui: ${window.location.origin}/anuncio/${ad.id}`

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    const handleCancelUrgency = async (id) => {
        if (!confirm('Deseja finalizar esta urgência? Ela não será mais exibida para outras instituições.')) return

        try {
            const { error } = await supabase
                .from('solicitacoes_urgentes')
                .update({ status: 'ATENDIDA' })
                .eq('id', id)

            if (error) throw error

            setUrgencies(urgencies.map(u => u.id === id ? { ...u, status: 'ATENDIDA' } : u))
            alert('Busca finalizada! Status alterado para: ATENDIDA')
        } catch (error) {
            console.error('Error finishing urgency:', error)
            alert(`Erro ao finalizar urgência. Detalhes: ${error.message || error.details || JSON.stringify(error)}`)
        }
    }

    const handleUrgencyResponse = async (transactionId, accepted) => {
        try {
            const nextStatus = accepted ? 'EM_ANDAMENTO' : 'RECUSADO'
            const { error } = await supabase
                .from('transacoes')
                .update({ status: nextStatus })
                .eq('id', transactionId)
            if (error) throw error

            if (accepted) {
                await supabase
                    .from('solicitacoes_urgentes')
                    .update({ status: 'ATENDIDA' })
                    .eq('id', selectedUrgency.id)

                await supabase
                    .from('transacoes')
                    .update({ status: 'RECUSADO' })
                    .eq('urgencia_id', selectedUrgency.id)
                    .eq('status', 'PENDENTE')
                    .neq('id', transactionId)
            }

            await fetchUrgencies()
            setSelectedUrgency(null)
            alert(accepted
                ? 'Atendimento aceito. Os contatos do fornecedor já estão disponíveis nesta urgência.'
                : 'Oferta recusada.')
        } catch (error) {
            console.error('Error handling urgency response:', error)
            alert('Não foi possível atualizar esta oferta.')
        }
    }

    const handleInactivate = async (id) => {
        if (!confirm('Tem certeza que deseja finalizar este anúncio? Ele não aparecerá mais nas buscas.')) return

        try {
            const { error } = await supabase
                .from('anuncios')
                .update({ status: 'FINALIZADO' })
                .eq('id', id)

            if (error) throw error

            setAds(ads.map(ad => ad.id === id ? { ...ad, status: 'FINALIZADO' } : ad))
            alert('Anúncio finalizado com sucesso!')
        } catch (error) {
            console.error('Error updating ad:', error)
            alert('Erro ao finalizar anúncio.')
        }
    }

    const handleEdit = (ad) => {
        navigate('/novo-anuncio', { state: { adToEdit: ad } })
    }

    const handleApprove = async (transactionId, adId) => {
        try {
            // Update transaction status
            const { error: txError } = await supabase
                .from('transacoes')
                .update({ status: 'EM_ANDAMENTO' })
                .eq('id', transactionId)

            if (txError) throw txError

            // Update ad status
            const { error: adError } = await supabase
                .from('anuncios')
                .update({ status: 'RESERVADO' })
                .eq('id', adId)

            if (adError) throw adError

            // Refresh local state
            await fetchAds()
            alert('Solicitação aprovada e anúncio reservado com sucesso!')
            setSelectedAd(null)
        } catch (error) {
            console.error('Error approving request:', error)
            alert('Erro ao aprovar solicitação.')
        }
    }

    const handleReject = async (transactionId) => {
        try {
            const { error } = await supabase
                .from('transacoes')
                .update({ status: 'RECUSADO' })
                .eq('id', transactionId)

            if (error) throw error

            await fetchAds()
            alert('Solicitação recusada com sucesso.')
            setSelectedAd(null)
        } catch (error) {
            console.error('Error rejecting request:', error)
            alert('Erro ao recusar solicitação.')
        }
    }

    const handleFinalizeDelivery = async (transactionId) => {
        try {
            const { error } = await supabase
                .from('transacoes')
                .update({ status: 'EM_TRANSITO' })
                .eq('id', transactionId)

            if (error) throw error

            await fetchAds()
            alert('Entrega finalizada com sucesso! Status atualizado para Em Trânsito.')
            setSelectedAd(null)
        } catch (error) {
            console.error('Error finalizing delivery:', error)
            alert('Erro ao finalizar entrega.')
        }
    }

    const handleConfirmReturn = async (returnItem, transactionId, currentPendingQty) => {
        if (!confirm(`Confirmar o recebimento de ${returnItem.quantidade} unidades?`)) return

        try {
            // 1. Update Return Status to CONFIRMADO
            const { error: returnError } = await supabase
                .from('devolucoes_parciais')
                .update({ status: 'CONFIRMADO' })
                .eq('id', returnItem.id)

            if (returnError) throw returnError

            // 2. Update Transaction (Pending Qty and Status)
            const newPending = Math.max(0, currentPendingQty - returnItem.quantidade)
            const newStatus = newPending === 0 ? 'FINALIZADA' : 'DEVOLUCAO_PARCIAL'

            const { error: txError } = await supabase
                .from('transacoes')
                .update({
                    quantidade_pendente: newPending,
                    status: newStatus,
                    ...(newStatus === 'FINALIZADA' ? { data_devolucao_real: new Date().toISOString() } : {})
                })
                .eq('id', transactionId)

            if (txError) throw txError

            // Refresh UI
            await fetchAds() // Refreshes ads and transactions
            const updatedReturns = await fetchReturnHistory(transactionId) // Refresh returns list
            setReturnHistory(prev => ({ ...prev, [transactionId]: updatedReturns }))

            alert('Devolução confirmada com sucesso!')

        } catch (error) {
            console.error('Error confirming return:', error)
            alert('Erro ao confirmar devolução.')
        }
    }

    const isExpiringSoon = (dateString) => {
        if (!dateString) return false
        const today = new Date()
        const expDate = new Date(dateString)
        const diffTime = expDate - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays <= 3 && diffDays >= 0
    }

    const isExpired = (dateString) => {
        if (!dateString) return false
        const today = new Date()
        const expDate = new Date(dateString)
        return expDate < today
    }

    const getInterestCount = (ad) => {
        // Count transactions that are NOT cancelled or rejected, or just show all requests
        // Let's show all active requests (solicitado, aprovado, em_andamento)
        // User asked for "total de solicitações vinculadas", so let's count all.
        // But maybe exclude rejected ones if they are not relevant anymore? 
        // Let's count all for now to be safe and showing activity.
        return ad.transacoes?.length || 0
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
        </div>
    )

    if (!ads) return null

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                        <button
                            onClick={() => navigate('/')}
                            className="bg-white p-2 rounded-full shadow-sm text-gray-600 hover:text-brand-deep hover:shadow-md transition"
                            title="Voltar para Início"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Meus Anúncios e Urgências</h1>
                            <p className="text-sm text-gray-500">Gerencie suas ofertas e solicitações de urgência</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/novo-anuncio')}
                        className="flex items-center space-x-2 bg-brand-deep text-white px-5 py-2.5 rounded-lg shadow hover:bg-brand-royal transition w-full sm:w-auto justify-center"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Criar Novo Anúncio</span>
                    </button>
                </div>

                <div className="flex border-b border-gray-200 mb-8">
                    <button
                        className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'ofertas' ? 'border-brand-deep text-brand-deep' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        onClick={() => setActiveTab('ofertas')}
                    >
                        Minhas Ofertas (Doações/Empréstimos/Vendas)
                    </button>
                    <button
                        className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'urgencias' ? 'border-brand-deep text-brand-deep' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        onClick={() => setActiveTab('urgencias')}
                    >
                        Minhas Urgências (Rupturas)
                    </button>
                </div>

                {activeTab === 'ofertas' ? (
                    ads.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                            <div className="bg-brand-lavender/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Package className="h-10 w-10 text-brand-periwinkle" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Você ainda não tem anúncios</h3>
                            <p className="text-gray-500 max-w-md mx-auto mb-8">Comece a compartilhar medicamentos e itens da sua farmácia com outras instituições parceiras.</p>
                            <button
                                onClick={() => navigate('/novo-anuncio')}
                                className="inline-flex items-center space-x-2 text-brand-deep font-semibold hover:text-brand-royal hover:underline"
                            >
                                <span>Criar meu primeiro anúncio</span>
                                <ArrowLeft className="h-4 w-4 rotate-180" />
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {ads.map((ad) => (
                                <div key={ad.id}
                                    className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col relative ${ad.status !== 'ATIVO' && ad.status !== 'RESERVADO' && ad.status !== 'RESERVADO_MATCH' ? 'opacity-75 grayscale-[0.5]' : ''}`}
                                >
                                    {/* Interest Badge */}
                                    {getInterestCount(ad) > 0 && (
                                        <div
                                            className="absolute top-4 right-4 z-10 cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedAd(ad)
                                                loadReturnsForAd(ad)
                                            }}
                                        >
                                            <div className="relative">
                                                <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                                                    <Users className="h-3 w-3" />
                                                    <span>{getInterestCount(ad)} interessado(s)</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-6 flex-1 cursor-pointer" onClick={() => {
                                        setSelectedAd(ad)
                                        loadReturnsForAd(ad)
                                    }}>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-full flex items-center gap-1
                                            ${ad.tipo === 'DOACAO' ? 'bg-brand-periwinkle/20 text-brand-royal' :
                                                    ad.tipo === 'EMPRESTIMO' ? 'bg-brand-lavender/30 text-brand-deep' :
                                                        'bg-orange-100 text-orange-700'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full 
                                                 ${ad.tipo === 'DOACAO' ? 'bg-brand-periwinkle' :
                                                        ad.tipo === 'EMPRESTIMO' ? 'bg-brand-periwinkle' :
                                                            'bg-orange-500'}`}
                                                />
                                                {ad.tipo}
                                            </span>
                                            <span className={`flex items-center space-x-1 text-xs font-bold border rounded-md px-2 py-1
                                            ${(ad.status === 'ATIVO' || ad.status === 'RESERVADO_MATCH') ? 'border-green-200 text-green-700 bg-green-50' :
                                                    ad.status === 'RESERVADO' ? 'border-yellow-200 text-yellow-700 bg-yellow-50' :
                                                        'border-gray-200 text-gray-500 bg-gray-50'}`}>
                                                {(ad.status === 'ATIVO' || ad.status === 'RESERVADO_MATCH') ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                <span>{ad.status === 'RESERVADO_MATCH' ? 'ATIVO (MATCH)' : ad.status}</span>
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2" title={ad.descricao_customizada}>
                                            {ad.descricao_customizada || 'Sem descrição'}
                                        </h3>

                                        <div className="flex items-center text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded-lg">
                                            <Package className="h-4 w-4 mr-2 text-gray-400" />
                                            <span>Cod: {ad.item_codigo}</span>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center text-gray-600">
                                                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                    <span>Expira em:</span>
                                                </div>
                                                <div className={`font-medium flex items-center
                                                ${isExpiringSoon(ad.data_expiracao) ? 'text-orange-600' :
                                                        isExpired(ad.data_expiracao) ? 'text-red-600' : 'text-gray-900'}`
                                                }>
                                                    {new Date(ad.data_expiracao).toLocaleDateString()}
                                                    {isExpiringSoon(ad.data_expiracao) && <AlertTriangle className="h-4 w-4 ml-1" />}
                                                    {isExpired(ad.data_expiracao) && <Clock className="h-4 w-4 ml-1" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Footer */}
                                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center space-x-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleEdit(ad)
                                            }}
                                            disabled={ad.status !== 'ATIVO'}
                                            className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                            <span>Editar</span>
                                        </button>
                                        <button
                                            onClick={(e) => handleWhatsAppShare(ad, e)}
                                            disabled={ad.status !== 'ATIVO'}
                                            title="Compartilhar"
                                            className="flex items-center justify-center p-2 rounded-lg text-green-600 hover:bg-green-50 border border-transparent hover:border-green-100 transition disabled:opacity-50 disabled:hover:bg-transparent"
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleInactivate(ad.id)
                                            }}
                                            disabled={ad.status !== 'ATIVO'}
                                            className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent transition disabled:opacity-50 disabled:hover:bg-transparent"
                                        >
                                            {ad.status === 'ATIVO' ? <EyeOff className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                            <span>{ad.status === 'ATIVO' ? 'Finalizar' : 'Finalizado'}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    urgencies.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="h-10 w-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Você não possui urgências ativas</h3>
                            <p className="text-gray-500 max-w-md mx-auto mb-8">Nenhuma solicitação de ruptura de estoque encontrada em seu nome.</p>
                            <button
                                onClick={() => navigate('/')}
                                className="inline-flex items-center space-x-2 text-red-600 font-semibold hover:text-red-700 hover:underline"
                            >
                                <span>Voltar ao painel para solicitar com urgência</span>
                                <ArrowLeft className="h-4 w-4 rotate-180" />
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {urgencies.map((urgency) => (
                                <div key={urgency.id}
                                    className={`bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col relative ${urgency.status !== 'ATIVA' ? 'opacity-75 grayscale-[0.5]' : 'border-t-4 border-t-red-500'}`}
                                >
                                    {(urgency.transacoes?.filter(tx => tx.status !== 'RECUSADO').length || 0) > 0 && (
                                        <button
                                            onClick={() => setSelectedUrgency(urgency)}
                                            className="absolute top-14 right-4 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse"
                                        >
                                            <Users className="h-3 w-3" />
                                            {urgency.transacoes.filter(tx => tx.status !== 'RECUSADO').length} oferta(s)
                                        </button>
                                    )}
                                    <div className="p-6 flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-full flex items-center gap-1 bg-red-100 text-red-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                URGÊNCIA ({urgency.nivel_urgencia_label || 'Alta'})
                                            </span>
                                            <span className={`flex items-center space-x-1 text-xs font-bold border rounded-md px-2 py-1 ${(urgency.status === 'ATIVA') ? 'border-green-200 text-green-700 bg-green-50' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>
                                                {(urgency.status === 'ATIVA') ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                <span>{urgency.status}</span>
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2" title={urgency.item_nome}>
                                            {urgency.item_nome || 'Sem descrição'}
                                        </h3>
                                        <div className="flex items-center text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded-lg">
                                            <Package className="h-4 w-4 mr-2 text-gray-400" />
                                            <span>Em falta ({urgency.quantidade} unidades)</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center text-gray-600">
                                                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                                    <span>Validade do Ad:</span>
                                                </div>
                                                <div className="font-medium text-gray-900 flex items-center">
                                                    {new Date(urgency.data_expiracao).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center space-x-3">
                                        <button
                                            onClick={() => setSelectedUrgency(urgency)}
                                            className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition"
                                        >
                                            <Users className="h-4 w-4" />
                                            <span>Ver ofertas ({urgency.transacoes?.length || 0})</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleCancelUrgency(urgency.id)
                                            }}
                                            disabled={urgency.status !== 'ATIVA'}
                                            className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent transition disabled:opacity-50 disabled:hover:bg-transparent"
                                        >
                                            {urgency.status === 'ATIVA' ? <EyeOff className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                            <span>{urgency.status === 'ATIVA' ? 'Finalizar Busca' : 'Finalizada'}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Urgency Response Management Modal */}
            {selectedUrgency && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Ofertas para atender a urgência</h2>
                                <p className="text-sm text-gray-500 mt-1">{selectedUrgency.item_nome}</p>
                            </div>
                            <button onClick={() => setSelectedUrgency(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {!selectedUrgency.transacoes?.length ? (
                                <p className="text-center text-gray-500 py-10">Ainda não há fornecedores interessados.</p>
                            ) : selectedUrgency.transacoes.map(tx => (
                                <div key={tx.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between gap-3">
                                        <div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${tx.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' : tx.status === 'EM_ANDAMENTO' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {tx.status === 'PENDENTE' ? 'AGUARDANDO SUA DECISÃO' : tx.status}
                                            </span>
                                            <h3 className="font-bold text-gray-900 mt-3">{tx.fornecedor?.nome || 'Fornecedor cadastrado'}</h3>
                                            <p className="text-sm text-gray-600">{tx.tipo} · {tx.quantidade} unidade(s)</p>
                                        </div>
                                        <div className="text-right text-sm text-gray-600">
                                            <p>Lote: <strong>{tx.anuncio?.lote || 'N/I'}</strong></p>
                                            <p>Validade: <strong>{tx.anuncio?.data_vencimento ? new Date(`${tx.anuncio.data_vencimento}T12:00:00`).toLocaleDateString() : 'N/I'}</strong></p>
                                            <p>Custo ref.: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.anuncio?.preco_unitario || 0)}</strong></p>
                                        </div>
                                    </div>
                                    {tx.status === 'PENDENTE' && (
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={() => handleUrgencyResponse(tx.id, true)} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700">Aceitar oferta</button>
                                            <button onClick={() => handleUrgencyResponse(tx.id, false)} className="flex-1 border border-red-200 text-red-600 py-2 rounded-lg font-semibold hover:bg-red-50">Recusar</button>
                                        </div>
                                    )}
                                    {tx.status === 'EM_ANDAMENTO' && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-900 space-y-1">
                                            <p className="font-semibold">Contato liberado para continuidade:</p>
                                            <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {tx.fornecedor?.email || 'E-mail não informado'}</p>
                                            <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {tx.fornecedor?.whatsapp || 'WhatsApp não informado'}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Interest Management Modal */}
            {selectedAd && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Gerenciar Interessados</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedAd.descricao_customizada}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedAd(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            {!selectedAd.transacoes || selectedAd.transacoes.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Users className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500">Nenhum interessado neste anúncio ainda.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {selectedAd.transacoes.map(tx => (
                                        <div key={tx.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-lavender/60 transition">
                                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold
                                                            ${tx.status === 'SOLICITADO' || tx.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' :
                                                                tx.status === 'EM_ANDAMENTO' ? 'bg-brand-periwinkle/20 text-brand-royal' :
                                                                    tx.status === 'EM_TRANSITO' ? 'bg-orange-100 text-orange-700' :
                                                                        tx.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700' :
                                                                            'bg-red-100 text-red-700'}`}>
                                                            {tx.status === 'PENDENTE' ? 'AGUARDANDO ACEITE' : tx.status}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(tx.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-semibold text-gray-900">
                                                        {tx.solicitante?.instituicoes?.nome_fantasia || 'Instituição não identificada'}
                                                    </h4>
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-medium">Responsável:</span> {tx.solicitante?.nome || 'N/A'}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-medium">Responsável:</span> {tx.solicitante?.nome || 'N/A'}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-medium">Logística:</span> {selectedAd.logistica || 'A combinar'}
                                                    </p>

                                                    {/* Financial Summary for Pending Match Transactions */}
                                                    {tx.status === 'PENDENTE' && selectedAd.status === 'RESERVADO_MATCH' && (
                                                        <div className="mt-2 bg-gray-50 p-3 rounded-lg border border-brand-lavender/40 text-sm">
                                                            <h5 className="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1">Resumo da Transação</h5>
                                                            <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                                                                <span className="text-gray-500">Valor Unitário:</span>
                                                                <span className="text-right font-medium">
                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedAd.preco_unitario || 0)}
                                                                </span>
                                                                <span className="text-gray-500">Quantidade:</span>
                                                                <span className="text-right font-medium">{tx.quantidade}</span>
                                                                <span className="text-gray-500">Taxa Trocafarma (10%):</span>
                                                                <span className="text-right font-medium text-orange-600">
                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(((selectedAd.preco_unitario || 0) * tx.quantidade) * 0.10)}
                                                                </span>
                                                                <div className="col-span-2 border-t border-gray-200 mt-1 pt-1 flex justify-between font-bold text-brand-royal">
                                                                    <span>Total Solicitante:</span>
                                                                    <span>
                                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                                            ((selectedAd.preco_unitario || 0) * tx.quantidade) * 1.10
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 text-xs text-center text-orange-600 font-medium bg-orange-50 p-1.5 rounded">
                                                                <Clock className="w-3 h-3 inline mr-1" />
                                                                Aguardando aceite financeiro do solicitante...
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2 min-w-[140px]">
                                                    {tx.status === 'SOLICITADO' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(tx.id, selectedAd.id)}
                                                                className="w-full py-1.5 px-3 bg-brand-deep text-white text-sm font-medium rounded-lg hover:bg-brand-royal transition"
                                                            >
                                                                Aprovar
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(tx.id)}
                                                                className="w-full py-1.5 px-3 bg-white text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-50 transition"
                                                            >
                                                                Recusar
                                                            </button>
                                                        </>
                                                    )}

                                                    {tx.status === 'EM_ANDAMENTO' && (
                                                        <button
                                                            onClick={() => handleFinalizeDelivery(tx.id)}
                                                            className="w-full py-1.5 px-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                                                        >
                                                            Finalizar Entrega
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Return History Display */}
                                            {returnHistory[tx.id] && returnHistory[tx.id].length > 0 && (
                                                <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-200">
                                                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Conferência de Devolução
                                                    </h5>
                                                    <div className="space-y-2">
                                                        {returnHistory[tx.id].map(ret => (
                                                            <div key={ret.id} className="text-sm bg-white p-2 rounded border border-slate-100 flex justify-between items-center">
                                                                <div>
                                                                    <span className="font-bold text-slate-700">Recebido: {ret.quantidade} un.</span>
                                                                    <span className="text-slate-500 mx-1">•</span>
                                                                    <span className="text-slate-600 font-mono text-xs bg-slate-100 px-1 rounded">Lote: {ret.lote || 'N/A'}</span>
                                                                </div>
                                                                <div className="text-right flex flex-col items-end">
                                                                    <span className={`text-xs ${new Date(ret.data_validade) < new Date() ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                                                        Val: {ret.data_validade ? new Date(ret.data_validade).toLocaleDateString() : 'N/A'}
                                                                    </span>
                                                                    <div className="text-[10px] text-slate-400">
                                                                        {new Date(ret.criado_em).toLocaleString()}
                                                                    </div>
                                                                    {ret.status === 'PENDENTE' ? (
                                                                        <button
                                                                            onClick={() => handleConfirmReturn(ret, tx.id, tx.quantidade_pendente !== null ? tx.quantidade_pendente : tx.quantidade)}
                                                                            className="mt-1 px-2 py-0.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition shadow-sm"
                                                                        >
                                                                            Confirmar
                                                                        </button>
                                                                    ) : (
                                                                        <div className="mt-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded inline-block">
                                                                            {ret.status || 'CONFIRMADO'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MyAds
