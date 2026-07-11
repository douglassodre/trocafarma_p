import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, PlusCircle, Package, LogOut, Clock, Search, BarChart3, DollarSign, Crown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext' // Assuming this hook allows signing out
import { cn } from '../lib/utils'

import logo from '../assets/logo.png'

const Sidebar = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { signOut, userProfile } = useAuth()
    const hasPremiumAccess = Boolean(
        userProfile?.is_premium && ['active', 'trialing'].includes(userProfile?.subscription_status)
    )

    const handleLogout = async () => {
        try {
            await signOut()
            navigate('/signin')
        } catch (error) {
            console.error("Logout failed:", error)
            navigate('/signin')
        }
    }

    const navItems = [
        { label: 'Início', icon: Home, path: '/' },
        { label: 'Explorar', icon: Search, path: '/explorar' },
        { label: 'Meus Anúncios', icon: Package, path: '/meus-anuncios' },
        { label: 'Solicitações', icon: Clock, path: '/minhas-solicitacoes' }, // New Link
        { label: 'Novo Anúncio', icon: PlusCircle, path: '/novo-anuncio' },
        { label: 'Relatórios', icon: BarChart3, path: '/relatorio' },
        { label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
        { label: 'Aprovações', icon: Clock, path: '/pending-approval' },
    ]

    // Add "Equipe" and "Aprovações" if admin
    if (userProfile?.role === 'UNIDADE_ADM') {
        navItems.splice(4, 0, { label: 'Equipe', icon: Search, path: '/equipe' })
        navItems.push({ label: 'Aprovações', icon: Clock, path: '/pending-ads' }) // Added Approvals
    }

    return (
        <aside className="hidden h-screen w-64 flex-col border-r border-brand-lavender/40 bg-white md:flex fixed top-0 left-0">
            <div className="flex h-14 items-center border-b border-brand-lavender/40 px-6">
                <Link to="/" className="flex items-center gap-2 font-semibold">
                    <img src={logo} alt="Trocafarma" className="h-9 w-9 object-contain" />
                    <span className="text-lg font-bold text-brand-ink">TrocaFarma</span>
                </Link>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="grid items-start px-4 text-sm font-medium">
                    {navItems.map((item, index) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={index}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:text-brand-ink hover:bg-brand-lavender/10",
                                    isActive && "bg-brand-lavender/20 text-brand-deep hover:bg-brand-lavender/30 hover:text-brand-ink"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className="border-t border-brand-lavender/40 p-4">
                {hasPremiumAccess && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                        <Crown className="h-4 w-4" />
                        Premium ativo
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-50"
                >
                    <LogOut className="h-4 w-4" />
                    Sair
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
