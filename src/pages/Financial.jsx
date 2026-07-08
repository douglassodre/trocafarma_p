
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
    DollarSign, Calendar, FileText, Download,
    ExternalLink, AlertCircle, CheckCircle, Clock
} from 'lucide-react'
import { Button } from '../components/ui/button'

const Financial = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({ upcoming: null, history: [] })
    const [error, setError] = useState(null)

    useEffect(() => {
        if (user) {
            fetchFinancialData()
        }
    }, [user])

    const fetchFinancialData = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase.functions.invoke('get-financial-data')

            if (error) throw error
            setData(data || { upcoming: null, history: [] })
        } catch (err) {
            console.error('Error fetching financial data:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
        </div>
    )

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount / 100)
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A'
        return new Date(timestamp * 1000).toLocaleDateString('pt-BR')
    }

    // Helper to get status color and label
    const getStatusInfo = (status) => {
        switch (status) {
            case 'paid':
                return { color: 'text-green-600 bg-green-100', label: 'Pago', icon: <CheckCircle className="h-4 w-4" /> }
            case 'open':
                return { color: 'text-brand-deep bg-brand-periwinkle/20', label: 'Aberto', icon: <AlertCircle className="h-4 w-4" /> }
            case 'void':
                return { color: 'text-gray-600 bg-gray-100', label: 'Cancelado', icon: <FileText className="h-4 w-4" /> }
            case 'uncollectible':
                return { color: 'text-red-600 bg-red-100', label: 'Não Cobrado', icon: <AlertCircle className="h-4 w-4" /> }
            default:
                return { color: 'text-gray-600 bg-gray-100', label: status, icon: <FileText className="h-4 w-4" /> }
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <DollarSign className="h-8 w-8 text-brand-deep" />
                        Financeiro
                    </h1>
                    <Button onClick={fetchFinancialData} variant="outline" className="gap-2">
                        Atualizar
                    </Button>
                </div>

                {/* Current Month / Accumulation Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-700 mb-1">Evolução do Mês (Fatura Atual)</h2>
                            <p className="text-slate-500 text-sm">Gastos acumulados para o próximo fechamento.</p>
                        </div>
                        <div className="bg-brand-lavender/20 p-2 rounded-lg">
                            <Clock className="h-6 w-6 text-brand-deep" />
                        </div>
                    </div>

                    <div className="mt-6 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">
                            {formatCurrency(data.upcoming?.amount_due || 0)}
                        </span>
                        <span className="text-sm text-slate-500">acumulado</span>
                    </div>

                    {data.upcoming && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                Próximo Fechamento: <span className="font-medium text-slate-900">{formatDate(data.upcoming.next_payment_attempt || data.upcoming.period_end)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Invoice History */}
                <h3 className="text-xl font-bold text-slate-900 mb-4">Histórico de Faturas</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Valor</th>
                                    <th className="px-6 py-4">Data da Fatura</th>
                                    <th className="px-6 py-4">Vencimento</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.history.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                            Nenhuma fatura encontrada.
                                        </td>
                                    </tr>
                                ) : (
                                    data.history.map((invoice) => {
                                        const status = getStatusInfo(invoice.status)
                                        return (
                                            <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1 ${status.color}`}>
                                                        {status.icon}
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900">
                                                    {formatCurrency(invoice.total)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {formatDate(invoice.created)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {formatDate(invoice.due_date)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {invoice.hosted_invoice_url && (
                                                            <a
                                                                href={invoice.hosted_invoice_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-xs font-medium rounded text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-periwinkle"
                                                            >
                                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                                Visualizar
                                                            </a>
                                                        )}
                                                        {invoice.invoice_pdf && (
                                                            <a
                                                                href={invoice.invoice_pdf}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-brand-deep hover:bg-brand-royal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-periwinkle"
                                                            >
                                                                <Download className="h-3 w-3 mr-1" />
                                                                PDF
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Financial
