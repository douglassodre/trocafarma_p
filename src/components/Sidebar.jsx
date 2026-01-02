import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, PlusCircle, Package, LogOut, Clock, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext' // Assuming this hook allows signing out
import { cn } from '../lib/utils'

import logo from '../assets/logo.png'

const Sidebar = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { signOut, userProfile } = useAuth()

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
        { label: 'Aprovações', icon: Clock, path: '/pending-approval' },
    ]

    // Add "Equipe" if admin
    if (userProfile?.role === 'UNIDADE_ADM') {
        navItems.splice(4, 0, { label: 'Equipe', icon: Search, path: '/equipe' }) // Insert before New Ad or appropriate place
    }

    return (
        <aside className="hidden h-screen w-64 flex-col border-r border-slate-200 bg-white md:flex fixed top-0 left-0">
            <div className="flex h-14 items-center border-b border-slate-200 px-6">
                <Link to="/" className="flex items-center gap-2 font-semibold">
                    <img src={logo} alt="Trocafarma" className="h-8 w-8 object-contain" />
                    <span className="text-lg font-bold text-slate-900">TrocaFarma</span>
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
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:text-slate-900 hover:bg-slate-100",
                                    isActive && "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className="border-t border-slate-200 p-4">
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
