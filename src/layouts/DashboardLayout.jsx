import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import DeliveryConfirmationModal from '../components/DeliveryConfirmationModal'
import { isSuperAdmin } from '../utils/admin'

const DashboardLayout = ({ children }) => {
    const { user, userProfile, loading } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                navigate('/signin')
                return
            }

            if (userProfile) {
                if (isSuperAdmin(userProfile)) return

                const institutionPending = userProfile.instituicoes?.status === 'PENDENTE'
                const userInactive = userProfile.is_active === false

                if ((institutionPending || userInactive) && location.pathname !== '/pending-approval') {
                    navigate('/pending-approval')
                }
            }
        }
    }, [user, userProfile, loading, navigate, location.pathname])


    if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-mist text-brand-ink">Carregando...</div>

    return (
        <div className="min-h-screen bg-brand-mist relative">
            <DeliveryConfirmationModal />
            <Sidebar />
            <div className="md:pl-64">
                <main className="min-h-screen p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout
