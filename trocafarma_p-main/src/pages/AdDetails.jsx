
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Helmet } from 'react-helmet-async'
import {
    MapPin, Calendar, Package, MessageCircle, Truck,
    ArrowLeft, Share2, AlertCircle
} from 'lucide-react'
import { Button } from '../components/ui/button'

const AdDetails = () => {
    const { id } = useParams()
    const [ad, setAd] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchAdDetails()
    }, [id])

    const fetchAdDetails = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('anuncios')
                .select('*, instituicoes (nome_fantasia), perfis_usuarios (whatsapp)')
                .eq('id', id)
                .single()

            if (error) throw error
            setAd(data)
        } catch (err) {
            console.error('Error fetching ad details:', err)
            setError('Anúncio não encontrado ou indisponível.')
        } finally {
            setLoading(false)
        }
    }

    const handleWhatsAppShare = () => {
        if (!ad) return

        const shareText = `💊 TrocaFarma - Novo Item Disponível!
Item: ${ad.descricao_customizada}
Validade: ${new Date(ad.data_vencimento).toLocaleDateString()}
Instituição: ${ad.instituicoes?.nome_fantasia || 'Indisponível'}

🔗 Confira os detalhes e solicite a troca aqui: ${window.location.origin}/anuncio/${ad.id}`

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
        window.open(whatsappUrl, '_blank')
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    )

    if (error || !ad) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Ops! Algo deu errado.</h1>
            <p className="text-slate-600 mb-6">{error || 'O anúncio que você procura não está disponível.'}</p>
            <Link to="/explorar">
                <Button variant="outline">Voltar para Explorar</Button>
            </Link>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
            <Helmet>
                <title>{`${ad.descricao_customizada} - TrocaFarma`}</title>
                <meta property="og:title" content={`${ad.descricao_customizada} - Disponível para Troca`} />
                <meta property="og:description" content={`Validade: ${new Date(ad.data_vencimento).toLocaleDateString()} | Instituição: ${ad.instituicoes?.nome_fantasia || 'TrocaFarma'}. Veja mais detalhes no TrocaFarma.`} />
                <meta property="og:image" content={ad.foto_url || 'https://trocafarma.vercel.app/og-image-default.png'} />
                <meta property="og:url" content={window.location.href} />
                <meta property="og:type" content="website" />
            </Helmet>

            <div className="max-w-3xl mx-auto">
                <Link to="/explorar" className="inline-flex items-center text-slate-600 hover:text-indigo-600 mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Explorar
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                    {/* Image Header if available */}
                    {ad.foto_url && (
                        <div className="w-full h-64 sm:h-80 bg-slate-100 relative">
                            <img
                                src={ad.foto_url}
                                alt={ad.descricao_customizada}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                                {ad.tipo}
                            </div>
                        </div>
                    )}

                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                                    {ad.descricao_customizada}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2">
                                    {!ad.foto_url && (
                                        <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full
                                            ${ad.tipo === 'DOACAO' ? 'bg-blue-100 text-blue-700' :
                                                ad.tipo === 'EMPRESTIMO' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-orange-100 text-orange-700'}`}>
                                            {ad.tipo}
                                        </span>
                                    )}
                                    <span className="text-sm text-slate-500 font-mono">Cód: {ad.item_codigo}</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleWhatsAppShare}
                                className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                            >
                                <Share2 className="h-4 w-4" />
                                Compartilhar no WhatsApp
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Instituição</h3>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-indigo-50 p-2 rounded-lg">
                                            <Package className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 text-lg">{ad.instituicoes?.nome_fantasia || 'Nome Indisponível'}</p>
                                            <p className="text-slate-600 flex items-center mt-1 text-sm">
                                                <MapPin className="h-4 w-4 mr-1 text-slate-400" />
                                                {ad.cidade} - {ad.estado}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 w-fit">
                                        {ad.logistica === 'ENTREGA' ? (
                                            <> <Truck className="h-4 w-4 mr-2 text-green-600" /> <span className="text-green-700 font-medium">Entrega Disponível</span> </>
                                        ) : (
                                            <> <MapPin className="h-4 w-4 mr-2 text-slate-500" /> <span className="text-slate-700">Retirada no Local</span> </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Detalhes do Lote</h3>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                                        <div className="flex justify-between items-center py-1 border-b border-slate-200 last:border-0">
                                            <span className="text-slate-600">Quantidade</span>
                                            <span className="font-medium text-slate-900">{ad.quantidade || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-slate-200 last:border-0">
                                            <span className="text-slate-600">Lote</span>
                                            <span className="font-mono font-medium text-slate-900">{ad.lote}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-slate-200 last:border-0">
                                            <span className="text-slate-600">Vencimento</span>
                                            <span className="font-medium text-red-600">{new Date(ad.data_vencimento).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-800 text-sm">
                            <MessageCircle className="h-5 w-5 flex-shrink-0" />
                            <p>
                                Para solicitar este item, acesse a página <strong>Explorar</strong>, encontre este anúncio e clique em "Tenho Interesse".
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdDetails
