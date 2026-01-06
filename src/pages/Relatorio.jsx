import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, Download } from 'lucide-react'
import { Button } from '../components/ui/button'
import logo from '../assets/logo.png'

const Relatorio = () => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [transactions, setTransactions] = useState([])
    const [filteredTransactions, setFilteredTransactions] = useState([])

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString())
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

    useEffect(() => {
        if (user && userProfile) {
            fetchTransactions()
        }
    }, [user, userProfile])

    useEffect(() => {
        filterTransactions()
    }, [transactions, selectedMonth, selectedYear])

    const filterTransactions = () => {
        let filtered = [...transactions]

        if (selectedMonth !== 'all') {
            filtered = filtered.filter(t => {
                const date = new Date(t.created_at)
                return date.getMonth().toString() === selectedMonth
            })
        }

        if (selectedYear !== 'all') {
            filtered = filtered.filter(t => {
                const date = new Date(t.created_at)
                return date.getFullYear().toString() === selectedYear
            })
        }

        setFilteredTransactions(filtered)
    }

    const fetchTransactions = async () => {
        try {
            setLoading(true)
            // Fetch Inbound (Savings) and Outbound (Loss Avoided)
            // For the report, let's list them all but distinguish type

            // Fetch everything where user is involved
            const { data, error } = await supabase
                .from('transacoes')
                .select(`
                    *,
                    anuncios (
                        descricao_customizada,
                        preco_unitario,
                        usuario_id,
                        instituicoes (nome_fantasia)
                    ),
                    solicitante:perfis_usuarios!transacoes_solicitante_id_fkey (
                        instituicao_id
                    )
                `)
                .eq('solicitante.instituicao_id', userProfile?.instituicoes?.id || userProfile?.instituicao_id) // Filter by Institution using Alias
                .eq('status', 'CONCLUIDO')
                .eq('status', 'CONCLUIDO')
                .order('created_at', { ascending: false })

            if (error) throw error
            setTransactions(data || [])

        } catch (error) {
            console.error('Error fetching report:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const totalSavings = filteredTransactions.reduce((acc, t) => acc + (t.valor_economizado || 0), 0)

    const months = [
        { value: '0', label: 'Janeiro' },
        { value: '1', label: 'Fevereiro' },
        { value: '2', label: 'Março' },
        { value: '3', label: 'Abril' },
        { value: '4', label: 'Maio' },
        { value: '5', label: 'Junho' },
        { value: '6', label: 'Julho' },
        { value: '7', label: 'Agosto' },
        { value: '8', label: 'Setembro' },
        { value: '9', label: 'Outubro' },
        { value: '10', label: 'Novembro' },
        { value: '11', label: 'Dezembro' },
    ]

    const years = ['2024', '2025', '2026'] // Dynamic later if needed

    if (loading) return <div className="p-8 text-center">Carregando relatório...</div>

    return (
        <div className="min-h-screen bg-white">
            {/* Print Header (Visible only on print or specific view) */}
            <div className="hidden print:flex flex-col items-center mb-8 pt-4 border-b pb-4">
                <img src={logo} alt="Trocafarma" className="h-16 w-auto mb-2" />
                <h1 className="text-2xl font-bold text-gray-900">Relatório de Impacto e Economia</h1>
                <p className="text-gray-500">{userProfile?.instituicoes?.nome_fantasia}</p>
                <p className="text-sm text-gray-400">Gerado em: {new Date().toLocaleDateString()}</p>
            </div>

            {/* Screen Header */}
            <div className="print:hidden bg-indigo-600 text-white p-6 shadow-lg">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate('/')} className="text-indigo-100 hover:bg-indigo-700 hover:text-white">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Relatório de Impacto</h1>
                            <p className="text-indigo-100 opacity-90">Visualize suas economias geradas na plataforma.</p>
                        </div>
                    </div>
                    <Button onClick={handlePrint} className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold gap-2 shadow-sm">
                        <Printer className="h-4 w-4" />
                        Imprimir Relatório
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-5xl mx-auto px-6 md:px-8 mt-6 print:hidden">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                    <span className="text-sm font-semibold text-gray-700">Filtrar por período:</span>

                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todos os Meses</option>
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todos os Anos</option>
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6 md:p-8">

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3 print:gap-4">
                    <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 print:border-gray-200">
                        <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Economia Total Gerada</p>
                        <p className="text-3xl font-bold text-emerald-800 mt-2">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSavings)}
                        </p>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 print:border-gray-200">
                        <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Itens Recebidos</p>
                        <p className="text-3xl font-bold text-blue-800 mt-2">{filteredTransactions.length}</p>
                    </div>
                    {/* Placeholder for future metric */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 print:border-gray-200">
                        <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Período</p>
                        <p className="text-xl font-bold text-gray-800 mt-2">
                            {selectedMonth !== 'all' ? months.find(m => m.value === selectedMonth)?.label : 'Ano Completo'} {selectedYear !== 'all' ? selectedYear : ''}
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                <th className="p-4">Data</th>
                                <th className="p-4">Item</th>
                                <th className="p-4 text-center">Qtd</th>
                                <th className="p-4 text-right">Preço Unit.</th>
                                <th className="p-4 text-right">Economia</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-700">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">Nenhum registro encontrado.</td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 print:hover:bg-transparent">
                                        <td className="p-4">{new Date(t.created_at).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <span className="font-medium block">{t.anuncios?.descricao_customizada}</span>
                                            <span className="text-xs text-gray-400 print:hidden">Ref: {t.anuncios?.instituicoes?.nome_fantasia}</span>
                                        </td>
                                        <td className="p-4 text-center">{t.quantidade}</td>
                                        <td className="p-4 text-right">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.anuncios?.preco_unitario || 0)}
                                        </td>
                                        <td className="p-4 text-right font-bold text-emerald-600">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor_economizado || 0)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200">
                            <tr>
                                <td colSpan="4" className="p-4 text-right">TOTAL</td>
                                <td className="p-4 text-right text-emerald-700">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSavings)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="mt-8 text-center text-xs text-gray-400 print:block hidden">
                    <p>Relatório gerado automaticamente pelo sistema Trocafarma.</p>
                </div>
            </div>
        </div >
    )
}

export default Relatorio
