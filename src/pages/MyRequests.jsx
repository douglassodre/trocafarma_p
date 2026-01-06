
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Package, Clock, CheckCircle, XCircle, MessageCircle, ArrowLeft, X, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { generateReceiptPDF } from '../utils/pdfGenerator'

const MyRequests = () => {
    const { user } = useAuth()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedRequest, setSelectedRequest] = useState(null)

    useEffect(() => {
        if (user) {
            fetchRequests()
        }
    }, [user])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            // Fetch Transacoes join Anuncios join Instituicoes (Provider)
            const { data, error } = await supabase
                .from('transacoes')
                .select(`
                    *,
                    anuncios:anuncio_id (
                        *,
                        instituicoes (
                            nome_fantasia
                        ),
                        perfis_usuarios (
                            whatsapp
                        )
                    )
                `)
                .eq('solicitante_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setRequests(data || [])
            console.log("Reqs", data)
        } catch (error) {
            console.error('Error fetching requests:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmReceipt = async (transaction) => {
        if (!confirm('Confirmar o recebimento deste item?')) return

        try {
            // Update transaction status
            const { error: txError } = await supabase
                .from('transacoes')
                .update({ status: 'CONCLUIDO' })
                .eq('id', transaction.id)

            if (txError) throw txError

            // Update ad status to FINALIZADO
            if (transaction.anuncio_id) {
                const { error: adError } = await supabase
                    .from('anuncios')
                    .update({ status: 'FINALIZADO' })
                    .eq('id', transaction.anuncio_id)

                if (adError) console.error("Warning: Failed to finalize ad status", adError)
            }

            // Report usage to Stripe
            // We use the transaction quantity as the metered value
            if (transaction.quantidade) {
                import('../services/stripe').then(({ reportTradeUsage }) => {
                    reportTradeUsage(transaction.quantidade);
                }).catch(console.error);
            }

            // Remove snooze if exists (cleanup)
            localStorage.removeItem(`delivery_snooze_${transaction.id}`)

            alert('Recebimento confirmado com sucesso!')

            // Refresh list and close modal
            fetchRequests()
            setSelectedRequest(null)

        } catch (error) {
            console.error('Error confirming receipt:', error)
            alert('Erro ao confirmar recebimento.')
        }
    }

    const handleWhatsAppClick = (whatsapp, itemName) => {
        if (!whatsapp) {
            alert('Número de WhatsApp não disponível para este fornecedor.')
            return
        }
        const message = encodeURIComponent(`Olá, estou entrando em contato sobre a solicitação do item: ${itemName}`)
        const url = `https://wa.me/55${whatsapp.replace(/\D/g, '')}?text=${message}`
        window.open(url, '_blank')
    }

    const getStatusBadge = (status) => {
        const styles = {
            'SOLICITADO': 'bg-yellow-100 text-yellow-800',
            'APROVADO': 'bg-green-100 text-green-800',
            'RECUSADO': 'bg-red-100 text-red-800',
            'CONCLUIDO': 'bg-slate-100 text-slate-800',
            'EM_TRANSITO': 'bg-blue-100 text-blue-800'
        }
        return <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-100'}`}>{status}</span>
    }

    const openDetails = (req) => {
        setSelectedRequest(req)
    }

    const closeDetails = () => {
        setSelectedRequest(null)
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    )

    const getReturnStatus = (req) => {
        if (req.anuncios?.tipo !== 'EMPRESTIMO' || req.status !== 'CONCLUIDO' || req.data_devolucao_real) return null

        const today = new Date()
        const deadline = new Date(req.data_devolucao_prevista)
        const diffTime = deadline - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return { status: 'OVERDUE', days: Math.abs(diffDays), label: `Atrasado há ${Math.abs(diffDays)} dias`, color: 'text-red-700 bg-red-50 border-red-200' }
        if (diffDays <= 3) return { status: 'WARNING', days: diffDays, label: `Devolução em ${diffDays} dias`, color: 'text-orange-700 bg-orange-50 border-orange-200' }
        return { status: 'OK', days: diffDays, label: `Devolução até ${deadline.toLocaleDateString()}`, color: 'text-blue-700 bg-blue-50 border-blue-200' }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/explorar">
                        <Button variant="ghost" className="p-2"><ArrowLeft className="h-6 w-6" /></Button>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">Minhas Solicitações</h1>
                </div>

                {requests.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
                        <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-slate-900">Nenhuma solicitação ainda</h3>
                        <p className="text-slate-500 mb-6">Explore o catálogo e solicite itens que sua instituição precisa.</p>
                        <Link to="/explorar">
                            <Button className="bg-indigo-600 hover:bg-indigo-700">Explorar Itens</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {requests.map(req => {
                            const returnInfo = getReturnStatus(req)
                            return (
                                <div key={req.id} className={`bg-white rounded-xl p-6 shadow-sm border ${returnInfo?.status === 'OVERDUE' ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'} flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            {getStatusBadge(req.status)}
                                            {returnInfo && (
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${returnInfo.color}`}>
                                                    {returnInfo.label}
                                                </span>
                                            )}
                                            <span className="text-xs text-slate-400 font-mono">ID: {req.id.slice(0, 8)}</span>
                                            <span className="text-sm text-slate-500">{new Date(req.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">{req.anuncios?.descricao_customizada}</h3>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                                            <Package className="h-4 w-4" />
                                            Fornecedor: <span className="font-semibold">{req.anuncios?.instituicoes?.nome_fantasia || 'Instituição ???'}</span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-3">
                                            <span className="text-xs font-semibold bg-slate-100 px-2 py-1 rounded">
                                                {req.anuncios?.tipo}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                Logística: {req.anuncios?.logistica || 'A Combinar'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        {(req.status === 'EM_ANDAMENTO' || req.status === 'DEVOLUCAO_PARCIAL' || req.status === 'CONCLUIDO') && (
                                            <Link to={`/devolver/${req.id}`}>
                                                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2">
                                                    <Package className="h-4 w-4" />
                                                    Registrar Devolução
                                                </Button>
                                            </Link>
                                        )}
                                        <Button
                                            variant="outline"
                                            className="gap-2 text-green-700 border-green-200 hover:bg-green-50"
                                            onClick={() => handleWhatsAppClick(req.anuncios?.perfis_usuarios?.whatsapp, req.anuncios?.descricao_customizada)}
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            WhatsApp Fornecedor
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="text-slate-500 hover:bg-slate-50"
                                            onClick={() => openDetails(req)}
                                        >
                                            Ver Detalhes
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 p-6 relative">
                        <button
                            onClick={closeDetails}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition"
                        >
                            <X className="h-6 w-6 text-slate-500" />
                        </button>

                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Detalhes da Solicitação</h2>
                        <div className="flex items-center gap-2 mb-6">
                            {getStatusBadge(selectedRequest.status)}
                            <span className="text-sm text-slate-500 font-mono">#{selectedRequest.id.slice(0, 8)}</span>
                        </div>

                        <div className="space-y-6">
                            {/* Item Requested */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Item Solicitado</h3>
                                <div className="space-y-2">
                                    <p className="text-lg font-bold text-slate-900">{selectedRequest.anuncios?.descricao_customizada}</p>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-slate-500 block">Quantidade</span>
                                            <span className="font-medium">{selectedRequest.anuncios?.quantidade || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">Lote</span>
                                            <span className="font-medium">{selectedRequest.anuncios?.lote || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">Vencimento</span>
                                            <span className="font-medium text-red-600">
                                                {selectedRequest.anuncios?.data_vencimento
                                                    ? new Date(selectedRequest.anuncios.data_vencimento).toLocaleDateString()
                                                    : '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">Tipo</span>
                                            <span className="font-medium">{selectedRequest.anuncios?.tipo}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Provider Info */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Fornecedor</h3>
                                <div className="flex items-start gap-3">
                                    <div className="bg-slate-100 p-2 rounded-full">
                                        <Package className="h-6 w-6 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{selectedRequest.anuncios?.instituicoes?.nome_fantasia}</p>
                                        <p className="text-slate-600 text-sm">
                                            {selectedRequest.anuncios?.cidade} - {selectedRequest.anuncios?.estado}
                                        </p>
                                        <p className="text-slate-500 text-xs mt-1">Logística: {selectedRequest.anuncios?.logistica || 'A Combinar'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                                {selectedRequest.status === 'EM_TRANSITO' && (
                                    <Button
                                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleConfirmReceipt(selectedRequest)}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Confirmar Recebimento
                                    </Button>
                                )}
                                {(selectedRequest.status === 'EM_ANDAMENTO' || selectedRequest.status === 'DEVOLUCAO_PARCIAL' || selectedRequest.status === 'CONCLUIDO') && (
                                    <Link to={`/devolver/${selectedRequest.id}`} className="flex-1">
                                        <Button className="w-full gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                                            <Package className="h-4 w-4" />
                                            Registrar Devolução
                                        </Button>
                                    </Link>
                                )}
                                <Button
                                    className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
                                    onClick={() => generateReceiptPDF(selectedRequest.anuncios, user)} // Uses the ad data for now as per logic
                                >
                                    <Download className="h-4 w-4" />
                                    Baixar Comprovante
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 gap-2"
                                    onClick={() => handleWhatsAppClick(selectedRequest.anuncios?.perfis_usuarios?.whatsapp, selectedRequest.anuncios?.descricao_customizada)}
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    Contatar Fornecedor
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MyRequests
