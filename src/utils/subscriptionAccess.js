import { supabase } from '../lib/supabase'

export const MONTHLY_FREE_PUBLICATIONS = 1

export async function getPublicationAccess() {
    const { data, error } = await supabase.rpc('get_publication_access')
    if (error) throw error
    return data?.[0] || null
}

export function isSubscriptionRequiredError(error) {
    const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')
    return message.includes('SUBSCRIPTION_REQUIRED')
}
