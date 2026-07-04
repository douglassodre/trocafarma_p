export const ADMIN_HOST = 'admin.trocafarma.com'

export const isAdminHost = () => {
    if (typeof window === 'undefined') return false
    return window.location.hostname === ADMIN_HOST
}

export const isSuperAdmin = (profile) => profile?.role === 'SUPER_ADMIN'
