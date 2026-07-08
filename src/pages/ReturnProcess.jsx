import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Package, Calendar, MapPin, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'

const ReturnProcess = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [transaction, setTransaction] = useState(null)
    const [pendingReturnsQty, setPendingReturnsQty] = useState(0)

    // Form States
    const [returnQty, setReturnQty] = useState(0)
    const [batch, setBatch] = useState('')
    const [expirationDate, setExpirationDate] = useState('')

    useEffect(() => {
        if (user && id) {
            fetchTransaction()
        }
    }, [user, id])

    const fetchTransaction = async () => {
        try {
            // Parallel fetch: Transaction and Pending Returns
            const [txResponse, returnsResponse] = await Promise.all([
                supabase
                    .from('transacoes')
                    .select(`
                        *,
                        anuncios:anuncio_id (
                            *,
                            instituicoes (
                                nome_fantasia
                            )
                        )
                    `)
                    .eq('id', id)
                    .single(),
                supabase
                    .from('devolucoes_parciais')
                    .select('quantidade')
                    .eq('transacao_id', id)
                    .eq('status', 'PENDENTE')
            ])

            if (txResponse.error) throw txResponse.error
            setTransaction(txResponse.data)

            // Calculate total pending returns
            const totalPending = returnsResponse.data?.reduce((acc, curr) => acc + curr.quantidade, 0) || 0
            setPendingReturnsQty(totalPending)

            // Initialize return qty with 1
            setReturnQty(1)
        } catch (error) {
            console.error('Error fetching Transaction:', error)
            alert('Erro ao carregar dados da transação.')
            navigate('/minhas-solicitacoes')
        } finally {
            setLoading(false)
        }
    }

    const getAvailableQty = () => {
        if (!transaction) return 0
        const dbPending = transaction.quantidade_pendente !== null ? transaction.quantidade_pendente : transaction.quantidade
        return Math.max(0, dbPending - pendingReturnsQty)
    }

    const isExpirationWarning = () => {
        if (!expirationDate) return false
        const today = new Date().toISOString().split('T')[0]
        return expirationDate < today
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const available = getAvailableQty()

        if (returnQty > available) {
            alert(`A quantidade a devolver não pode ser maior que a disponível (${available}).`)
            return
        }

        if (returnQty <= 0) {
            alert('A quantidade deve ser maior que zero.')
            return
        }

        if (!confirm('Confirmar o registro de devolução? O fornecedor precisará confirmar o recebimento.')) return

        setSubmitting(true)
        try {
            // 1. Insert into devolucoes_parciais with status PENDENTE
            const { error: insertError } = await supabase
                .from('devolucoes_parciais')
                .insert([
                    {
                        transacao_id: id,
                        quantidade: parseInt(returnQty),
                        lote: batch,
                        data_validade: expirationDate,
                        status: 'PENDENTE'
                    }
                ])

            if (insertError) throw insertError

            alert('Devolução registrada com sucesso! Aguardando confirmação do fornecedor.')

            navigate('/minhas-solicitacoes')

        } catch (error) {
            console.error('Error registering return:', error)
            alert('Erro ao registrar devolução: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
        </div>
    )

    if (!transaction) return null

    const availableQty = getAvailableQty()

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    className="mb-6 pl-0 hover:bg-transparent hover:text-brand-deep"
                    onClick={() => navigate('/minhas-solicitacoes')}
                >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Voltar para Minhas Solicitações
                </Button>

                <Card>
                    <CardHeader className="bg-slate-100/50 border-b border-slate-100">
                        <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                            <Package className="h-6 w-6 text-brand-deep" />
                            Registrar Devolução
                        </CardTitle>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-6 pt-6">

                            {/* Item Summary - Comparison Block */}
                            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1 border-r border-slate-100 pr-4">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dados do Empréstimo</h3>
                                    <p className="font-bold text-slate-900">{transaction.anuncios?.descricao_customizada}</p>
                                    <p className="text-sm text-slate-600">
                                        Qtd. Original: <span className="font-medium text-slate-900">{transaction.quantidade}</span>
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        Lote Orig.: <span className="font-mono bg-slate-100 px-1 rounded">{transaction.anuncios?.lote}</span>
                                    </p>
                                    <p className="text-sm text-slate-600 flex items-center gap-1">
                                        Venc. Orig.:
                                        {transaction.anuncios?.data_vencimento ? (
                                            <span>{new Date(transaction.anuncios.data_vencimento).toLocaleDateString()}</span>
                                        ) : '-'}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status Atual</h3>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center bg-brand-lavender/20 p-2 rounded">
                                            <span className="text-brand-ink text-sm font-medium">Disponível p/ Devolução</span>
                                            <span className="text-brand-royal font-bold text-lg">{availableQty}</span>
                                        </div>
                                        {pendingReturnsQty > 0 && (
                                            <div className="text-xs text-orange-600 bg-orange-50 p-1.5 rounded border border-orange-100 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                <span>{pendingReturnsQty} itens aguardando confirmação.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 my-4"></div>

                            {/* Input Fields */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">O que você está devolvendo agora?</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label className="mb-2 block">Quantidade a Devolver</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max={availableQty}
                                            value={returnQty}
                                            onChange={(e) => setReturnQty(e.target.value)}
                                            required
                                            className="text-lg font-semibold"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Máximo: {availableQty}</p>
                                    </div>

                                    <div>
                                        <Label className="mb-2 block">Lote Físico Entregue</Label>
                                        <Input
                                            type="text"
                                            placeholder="Digite o número do lote"
                                            value={batch}
                                            onChange={(e) => setBatch(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2 block">Data de Validade (Item Devolvido)</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input
                                                type="date"
                                                value={expirationDate}
                                                onChange={(e) => setExpirationDate(e.target.value)}
                                                required
                                                className={`pl-9 ${isExpirationWarning() ? 'border-red-300 focus:ring-red-200' : ''}`}
                                            />
                                        </div>
                                        {isExpirationWarning() && (
                                            <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium">
                                                <AlertCircle className="h-3 w-3" />
                                                Atenção: Este item está vencido!
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-brand-lavender/20 border border-brand-periwinkle/40 rounded-lg p-4 flex gap-3 text-sm text-brand-ink mt-4">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <p>
                                    Ao clicar em confirmar, a devolução ficará como "Pendente" até a confirmação do fornecedor.
                                </p>
                            </div>

                        </CardContent>
                        <CardFooter className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/minhas-solicitacoes')}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className={`text-white min-w-[150px] ${parseInt(returnQty) === availableQty ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                                disabled={submitting || availableQty === 0}
                            >
                                {submitting ? 'Processando...' : 'Registrar Devolução'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}

export default ReturnProcess
