import { useAuth } from '../contexts/AuthContext'

import logo from '../assets/logo.png'

const PendingApproval = () => {
    const { signOut } = useAuth()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full text-center p-8 bg-white shadow rounded-xl space-y-6">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-50">
                    <img src={logo} alt="Trocafarma" className="h-12 w-12 object-contain" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Aguardando Aprovação</h2>
                <p className="text-gray-500">
                    Sua instituição ainda está com status <strong>PENDENTE</strong>.
                    Nossa equipe está analisando seu cadastro. Por favor, aguarde a aprovação para acessar todas as funcionalidades.
                </p>
                <button
                    onClick={signOut}
                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none"
                >
                    Sair e tentar novamente mais tarde
                </button>
            </div>
        </div>
    )
}

export default PendingApproval
