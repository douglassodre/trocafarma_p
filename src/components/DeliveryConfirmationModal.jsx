import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle, Package, Truck, AlertTriangle, Clock, XCircle } from 'lucide-react'

const DeliveryConfirmationModal = () => {
    const { user } = useAuth()
    const [deliveriesToShow, setDeliveriesToShow] = useState([])
    const [loading, setLoading] = useState(true)

    // Poll or fetch on mount/user change
    useEffect(() => {
        if (!user) return

        const fetchPendingDeliveries = async () => {
            try {
                // Find transactions where I am the requester and status is EM_TRANSITO
                const { data, error } = await supabase
                    .from('transacoes')
                    .select(`
                        *,
                        anuncios (
                            item_codigo,
                            descricao_customizada,
                            instituicoes (
                                nome_fantasia
                            )
                        )
                    `)
                    .eq('solicitante_id', user.id)
                    .eq('status', 'EM_TRANSITO')

                if (error) throw error

                // Filter based on Snooze Logic
                const visibleDeliveries = (data || []).filter(tx => {
                    const snoozeKey = `delivery_snooze_${tx.id}`
                    const snoozeData = localStorage.getItem(snoozeKey)

                    if (!snoozeData) return true // No snooze, show it

                    const { lastSnooze } = JSON.parse(snoozeData)
                    const twentyFourHours = 24 * 60 * 60 * 1000

                    // Show if 24h has passed since last snooze
                    return (Date.now() - lastSnooze) > twentyFourHours
                })

                setDeliveriesToShow(visibleDeliveries)
            } catch (error) {
                console.error('Error checking pending deliveries:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchPendingDeliveries()

        // Optional: Subscribe to changes for realtime updates, but polling/fetch on mount is ok for MVP
    }, [user])

    const handleConfirmReceipt = async (transaction) => {
        try {
            // 1. Fetch latest Ad data to ensure we have the correct Unit Price
            const { data: adData } = await supabase
                .from('anuncios')
                .select('preco_unitario, quantidade')
                .eq('id', transaction.anuncio_id)
                .single()

            // Calculate details
            const fetchedPrice = adData?.preco_unitario
            const fallbackPrice = transaction.anuncios?.preco_unitario
            const unitPrice = Number(fetchedPrice) || Number(fallbackPrice) || 0

            // FALLBACK FIX: If transaction quantity is 0, try to get from Ad, or default to 1
            let quantity = Number(transaction.quantidade)
            if (!quantity || quantity === 0) {
                quantity = Number(adData?.quantidade) || 1
            }

            const savings = unitPrice * quantity



            // Update transaction status
            const { error: txError } = await supabase
                .from('transacoes')
                .update({
                    status: 'CONCLUIDO',
                    valor_economizado: savings,
                    quantidade: quantity // Ensure we backfill the quantity too if it was missing
                })
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
            if (savings > 0) {
                import('../services/stripe').then(({ reportTradeUsage }) => {
                    reportTradeUsage(savings);
                }).catch(console.error);
            }

            // Cleanup local storage
            localStorage.removeItem(`delivery_snooze_${transaction.id}`)

            // Update local state
            setDeliveriesToShow(prev => prev.filter(item => item.id !== transaction.id))
            alert('Recebimento confirmado com sucesso!')
        } catch (error) {
            console.error('Error confirming receipt:', error)
            alert('Erro ao confirmar recebimento.')
        }
    }

    const handleSnooze = (transaction) => {
        const snoozeKey = `delivery_snooze_${transaction.id}`
        const currentData = JSON.parse(localStorage.getItem(snoozeKey) || '{"count": 0}')

        if (currentData.count >= 2) return // Should not happen if UI handles it, but safety check

        const newData = {
            count: currentData.count + 1,
            lastSnooze: Date.now()
        }

        localStorage.setItem(snoozeKey, JSON.stringify(newData))

        // Remove from view immediately
        setDeliveriesToShow(prev => prev.filter(item => item.id !== transaction.id))
        alert('Confirmação adiada por 24 horas.')
    }

    const handleReportIssue = async (transaction) => {
        if (!confirm('Tem certeza que deseja relatar o não recebimento? A transação será cancelada e o item retornará para o status ATIVO.')) return

        try {
            // Cancel transaction
            const { error: txError } = await supabase
                .from('transacoes')
                .update({ status: 'CANCELADO' })
                .eq('id', transaction.id)

            if (txError) throw txError

            // Return item to pool (ATIVO) - Assumption: Item was lost or not sent, so it might still be available? 
            // Or maybe 'BLOQUEADO'? Let's set to 'ATIVO' based on plan.
            if (transaction.anuncio_id) {
                const { error: adError } = await supabase
                    .from('anuncios')
                    .update({ status: 'ATIVO' })
                    .eq('id', transaction.anuncio_id)

                if (adError) throw adError
            }

            // Cleanup local storage
            localStorage.removeItem(`delivery_snooze_${transaction.id}`)

            setDeliveriesToShow(prev => prev.filter(item => item.id !== transaction.id))
            alert('Problema relatado. Transação cancelada.')
        } catch (error) {
            console.error('Error reporting issue:', error)
            alert('Erro ao cancelar transação.')
        }
    }

    if (loading || deliveriesToShow.length === 0) return null

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-orange-50 p-6 border-b border-orange-100 flex items-start gap-4">
                    <div className="bg-orange-100 p-3 rounded-full">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Confirmação Pendente</h2>
                        <p className="text-orange-800 mt-1 text-sm">
                            Você possui itens enviados que precisam de confirmação.
                            <br />
                            <span className="text-xs font-semibold mt-1 block">Ação necessária para desbloquear o sistema.</span>
                        </p>
                    </div>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                    {deliveriesToShow.map(delivery => {
                        const snoozeKey = `delivery_snooze_${delivery.id}`
                        const snoozeData = JSON.parse(localStorage.getItem(snoozeKey) || '{"count": 0}')
                        const snoozeCount = snoozeData.count
                        const maxSnoozes = 2

                        return (
                            <div key={delivery.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col gap-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 line-clamp-1" title={delivery.anuncios?.descricao_customizada}>
                                            {delivery.anuncios?.descricao_customizada || 'Item sem descrição'}
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <Package className="h-3 w-3" />
                                            Origem: {delivery.anuncios?.instituicoes?.nome_fantasia || 'Instituição Parceira'}
                                        </p>
                                    </div>
                                    <span className="bg-brand-periwinkle/20 text-brand-royal text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                        <Truck className="h-3 w-3" />
                                        Em Trânsito
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2 mt-2">
                                    <button
                                        onClick={() => handleConfirmReceipt(delivery)}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Confirmar Recebimento
                                    </button>

                                    {snoozeCount < maxSnoozes ? (
                                        <button
                                            onClick={() => handleSnooze(delivery)}
                                            className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition text-sm"
                                        >
                                            <Clock className="h-4 w-4" />
                                            Ainda não recebi (Adiar 24h)
                                            <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                                {maxSnoozes - snoozeCount} restantes
                                            </span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReportIssue(delivery)}
                                            className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition text-sm"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Não recebi (Cancelar Transação)
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="p-4 bg-gray-50 text-center text-xs text-gray-400 border-t border-gray-100">
                    Confirme o recebimento ou relate problemas para continuar.
                </div>
            </div>
        </div>
    )
}

export default DeliveryConfirmationModal
