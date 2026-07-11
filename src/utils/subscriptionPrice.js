import { supabase } from '../lib/supabase'

const FALLBACK_PRICE = {
    unit_amount: 2490,
    currency: 'brl',
    interval: 'month'
}

export async function getSubscriptionPrice() {
    const { data, error } = await supabase.functions.invoke('stripe-price', { method: 'GET' })
    if (error || !data?.unit_amount) {
        console.error('Falha ao carregar preço da assinatura:', error || data?.error)
        return FALLBACK_PRICE
    }
    return data
}

export function formatSubscriptionPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: String(price?.currency || 'brl').toUpperCase(),
        minimumFractionDigits: 2
    }).format((price?.unit_amount || FALLBACK_PRICE.unit_amount) / 100)
}
