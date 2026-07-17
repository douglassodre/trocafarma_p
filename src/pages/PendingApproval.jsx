import { useAuth } from '../contexts/AuthContext'

import logo from '../assets/logo.png'

const PendingApproval = () => {
    const { signOut, userProfile } = useAuth()
    const hasInstitution = Boolean(userProfile?.instituicao_id)

    let title = 'Acesso suspenso'
    let message = 'Seu acesso foi desativado. Entre em contato com o suporte caso precise de ajuda.'

    if (!hasInstitution) {
        title = 'Cadastro incompleto'
        message = 'Seu usuário foi criado, mas ainda não está vinculado a uma instituição. Entre em contato com o suporte para concluir o cadastro.'
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-mist px-4">
            <div className="max-w-md w-full text-center p-8 bg-white shadow rounded-lg space-y-6 border border-brand-lavender/40">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-brand-lavender/20">
                    <img src={logo} alt="Trocafarma" className="h-12 w-12 object-contain" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <p className="text-gray-500">{message}</p>
                <button
                    onClick={signOut}
                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none"
                >
                    Sair
                </button>
            </div>
        </div>
    )
}

export default PendingApproval
