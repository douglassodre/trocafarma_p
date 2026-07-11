import { useEffect, useState } from 'react'
import { CheckCircle, CreditCard, Loader2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatSubscriptionPrice, getSubscriptionPrice } from '../utils/subscriptionPrice'

const SubscriptionRequiredModal = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [subscriptionPrice, setSubscriptionPrice] = useState('R$ 20,00')

    useEffect(() => {
        if (!isOpen) return
        getSubscriptionPrice().then((price) => setSubscriptionPrice(formatSubscriptionPrice(price)))
    }, [isOpen])

    if (!isOpen) return null

    const startSubscription = async () => {
        setLoading(true)
        setError('')
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            if (sessionError) throw sessionError
            if (!session?.access_token) throw new Error('Sua sessao expirou. Entre novamente para ativar a assinatura.')

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
                method: 'POST',
                headers: {
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || data?.message || `Falha ao iniciar assinatura (${response.status}).`)
            }
            if (!data?.url) throw new Error(data?.error || 'Não foi possível iniciar a assinatura.')
            window.location.assign(data.url)
        } catch (checkoutError) {
            console.error('Erro ao iniciar assinatura:', checkoutError)
            setError(checkoutError.message || 'Não foi possível abrir o checkout.')
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <button type="button" onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700">
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-lavender/20">
                    <CreditCard className="h-6 w-6 text-brand-deep" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900">Continue publicando no TrocaFarma</h2>
                <p className="mt-2 text-sm text-gray-600">
                    Você já utilizou sua publicação gratuita deste mês. Ative a assinatura para continuar anunciando medicamentos e rupturas.
                </p>

                <div className="my-5 rounded-xl border border-brand-lavender/40 bg-brand-mist p-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-sm font-semibold text-brand-deep">Assinatura TrocaFarma</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{subscriptionPrice}<span className="text-sm font-normal text-gray-500">/mês</span></p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">10 dias grátis</span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                        <p className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600" /> Publicações liberadas durante a assinatura</p>
                        <p className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600" /> Anúncios e rupturas no mesmo plano</p>
                        <p className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600" /> Cobrança somente após o período gratuito</p>
                    </div>
                </div>

                {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

                <button type="button" onClick={startSubscription} disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-deep px-5 py-3 font-bold text-white transition hover:bg-brand-royal disabled:opacity-60">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                    {loading ? 'Abrindo checkout...' : 'Ativar 10 dias grátis'}
                </button>
                <button type="button" onClick={onClose} disabled={loading}
                    className="mt-3 w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-800">
                    Agora não
                </button>
            </div>
        </div>
    )
}

export default SubscriptionRequiredModal
