import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Check, X, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STORAGE_PUBLIC_PREFIX = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/anuncios-fotos/`

function formatDate(value) {
    if (!value) return 'Nao informado'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('pt-BR')
}

function getStoragePathFromPublicUrl(photoUrl) {
    if (!photoUrl?.startsWith(STORAGE_PUBLIC_PREFIX)) return null
    return decodeURIComponent(photoUrl.slice(STORAGE_PUBLIC_PREFIX.length))
}

function buildStatusCaptionFromAd(ad) {
    const lines = [
        'Medicamento disponivel para troca',
        '',
        ad.descricao_customizada?.trim() || 'Novo anuncio TrocaFarma',
        `Validade: ${formatDate(ad.data_vencimento)}`,
        `Lote: ${ad.lote?.trim() || 'Nao informado'}`,
        `Quantidade: ${ad.quantidade || 'Nao informada'}`,
        `Tipo: ${ad.tipo || 'Nao informado'}`,
        `Logistica: ${ad.logistica || 'A combinar'}`,
    ]

    if (ad.cidade || ad.estado) {
        lines.push(`Local: ${[ad.cidade, ad.estado].filter(Boolean).join(' - ')}`)
    }

    lines.push('', 'Tenho interesse? Acesse o TrocaFarma.')
    return lines.join('\n')
}

async function notifyStatusBot({ filePath, caption }) {
    try {
        const { data, error } = await supabase.functions.invoke('notify-status-bot', {
            body: { filePath, caption },
        })

        if (error) {
            console.error('Falha ao invocar notify-status-bot:', error)
            return
        }

        if (data?.ok === false) {
            console.error('notify-status-bot retornou erro:', data.error)
        }
    } catch (err) {
        console.error('Erro inesperado ao notificar status bot:', err)
    }
}

const PendingAds = () => {
    const { userProfile } = useAuth()
    const navigate = useNavigate()
    const [ads, setAds] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userProfile) return
        if (userProfile.role !== 'UNIDADE_ADM') {
            navigate('/') // Redirect if not ADM
            return
        }
        fetchPendingAds()
    }, [userProfile])

    const fetchPendingAds = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('anuncios')
                .select('*, perfis_usuarios(nome)')
                .eq('instituicao_id', userProfile.instituicao_id)
                .eq('status', 'AGUARDANDO_APROVACAO')
                .order('created_at', { ascending: false })

            if (error) throw error
            setAds(data || [])
        } catch (error) {
            console.error('Error fetching pending ads:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (adId, action) => {
        // action: 'APPROVE' | 'REJECT'
        try {
            const newStatus = action === 'APPROVE' ? 'ATIVO' : 'REJEITADO'
            const currentAd = ads.find((ad) => ad.id === adId)

            // If reject, maybe delete? For now just mark as REJECTED so user sees history? 
            // Or soft delete. Let's stick to REJEITADO for visibility.

            const { error } = await supabase
                .from('anuncios')
                .update({ status: newStatus })
                .eq('id', adId)

            if (error) throw error

            if (action === 'APPROVE' && currentAd) {
                notifyStatusBot({
                    filePath: getStoragePathFromPublicUrl(currentAd.foto_url),
                    caption: buildStatusCaptionFromAd(currentAd),
                })
            }

            setAds(ads.filter(a => a.id !== adId))
        } catch (error) {
            console.error('Error updating ad:', error)
            alert('Erro ao processar ação.')
        }
    }

    if (loading) return <div className="p-8 text-center">Carregando anúncios pendentes...</div>

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Aprovação de Anúncios</h1>
            <p className="text-slate-600">Aprove ou rejeite anúncios criados pelos operadores da sua equipe.</p>

            {ads.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
                    <Check className="h-12 w-12 text-green-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">Tudo certo!</h3>
                    <p className="text-slate-500">Nenhum anúncio pendente de aprovação.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ads.map(ad => (
                        <div key={ad.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full
                                    ${ad.tipo === 'DOACAO' ? 'bg-brand-periwinkle/20 text-brand-royal' :
                                        ad.tipo === 'EMPRESTIMO' ? 'bg-brand-lavender/30 text-brand-deep' :
                                            'bg-orange-100 text-orange-700'}`}>
                                    {ad.tipo}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">#{ad.item_codigo}</span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-1">{ad.descricao_customizada}</h3>
                            <p className="text-sm text-slate-500 mb-4">Criado por: <span className="font-medium text-slate-700">{ad.perfis_usuarios?.nome || 'Usuário'}</span></p>

                            <div className="bg-slate-50 p-3 rounded-lg text-sm mb-4 space-y-1">
                                <p><span className="text-slate-500">Qtd:</span> {ad.quantidade}</p>
                                <p><span className="text-slate-500">Validade:</span> {new Date(ad.data_vencimento).toLocaleDateString()}</p>
                            </div>

                            <div className="mt-auto flex gap-2">
                                <button
                                    onClick={() => handleAction(ad.id, 'APPROVE')}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition text-sm flex items-center justify-center gap-1"
                                >
                                    <Check className="h-4 w-4" /> Aprovar
                                </button>
                                <button
                                    onClick={() => handleAction(ad.id, 'REJECT')}
                                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2 rounded-lg font-medium transition text-sm flex items-center justify-center gap-1"
                                >
                                    <X className="h-4 w-4" /> Rejeitar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default PendingAds
